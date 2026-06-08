# AWS Secure Asset Delivery — Configuration & Migration Runbook

## Prerequisites

Before starting, ensure you have:
- AWS Console access with IAM permissions for S3, CloudFront, WAF, ACM
- Domain DNS access for `assets.millionflats.com`
- Vercel project settings access (for environment variables)

---

## Step 1: Create ACM Certificate (us-east-1)

CloudFront requires certificates in **us-east-1** regardless of bucket region.

```bash
# In AWS Console → Certificate Manager → us-east-1
# Request public certificate for: assets.millionflats.com
# Validation method: DNS
# Add CNAME record to your DNS provider
```

## Step 2: Generate CloudFront Key Pair

```bash
# Generate RSA 2048 key pair for signing
openssl genrsa -out cf-private-key.pem 2048
openssl rsa -pubout -in cf-private-key.pem -out cf-public-key.pem

# Base64 encode the private key for environment variable
# PowerShell:
[Convert]::ToBase64String([IO.File]::ReadAllBytes("cf-private-key.pem"))

# Linux/Mac:
base64 -w 0 cf-private-key.pem
```

**Upload public key to CloudFront:**
1. AWS Console → CloudFront → Public keys → Create
2. Paste contents of `cf-public-key.pem`
3. Name: `millionflats-signing-key-2026`
4. Note the **Key ID** (e.g., `K2XXXXXXXXXXXXX`)

**Create Key Group:**
1. CloudFront → Key groups → Create
2. Name: `millionflats-signing-key-group`
3. Add the public key you just created

## Step 3: Create CloudFront Distribution

**Origin Settings:**
- Origin domain: `millionflats-prod-assets.s3.eu-north-1.amazonaws.com`
- Origin access: **Origin Access Control (OAC)** — create new
  - Name: `millionflats-s3-oac`
  - Signing protocol: SigV4
  - Signing behavior: Always sign
  - Origin type: S3
- Enable Origin Shield: Yes, region `eu-north-1`

**Default Cache Behavior:**
- Viewer protocol policy: Redirect HTTP to HTTPS
- Allowed HTTP methods: GET, HEAD
- Restrict viewer access: **Yes**
- Trusted key groups: `millionflats-signing-key-group`
- Cache policy: CachingOptimized
- Response headers policy: (create custom — see below)

**Additional Cache Behaviors** (order matters):

| Path Pattern | Signed | Cache Policy | Notes |
|---|---|---|---|
| `public/*` | Yes | 24h TTL | Gallery images, logos |
| `protected/*` | Yes | 5min TTL | Brochures, floor plans |
| `private/*` | Yes | No cache | Agent docs, sensitive |

**Settings:**
- Alternate domain: `assets.millionflats.com`
- SSL certificate: Select the ACM cert from Step 1
- Supported HTTP versions: HTTP/2, HTTP/3
- Default root object: (leave empty)
- Standard logging: Enable → S3 bucket for logs

**Custom Error Responses:**
- 403 → Return 404 (don't reveal "access denied" means the file exists)
- 404 → Return 404

## Step 4: Response Headers Policy

Create a custom response headers policy:

```
Name: millionflats-security-headers
Security headers:
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY
  - Referrer-Policy: strict-origin-when-cross-origin
  - X-Robots-Tag: noindex, nofollow (for protected/* and private/*)
Custom headers:
  - X-Served-By: millionflats-cdn
CORS:
  - Access-Control-Allow-Origin: https://millionflats.com
  - Access-Control-Allow-Methods: GET, HEAD
  - Access-Control-Max-Age: 86400
```

## Step 5: Update S3 Bucket Policy

**IMPORTANT**: Do this AFTER confirming CloudFront distribution is working.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    { 
      "Sid": "AllowCloudFrontOACOnly",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::millionflats-prod-assets/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::YOUR_ACCOUNT_ID:distribution/YOUR_DISTRIBUTION_ID"
        }
      }
    }
  ]
}
```

Then enable **Block All Public Access** on the bucket.

## Step 6: DNS Configuration

Add CNAME record:
```
assets.millionflats.com → d1234567890.cloudfront.net
```

## Step 7: WAF Web ACL (Optional but recommended)

```
Name: millionflats-asset-waf
Rules:
  1. AWS-AWSManagedRulesCommonRuleSet (managed)
  2. AWS-AWSManagedRulesBotControlRuleSet (managed)
  3. Rate-based rule: 1000 requests per 5 minutes per IP
  4. Geographic match: Allow all (Dubai audience is global)
```

Associate WAF with the CloudFront distribution.

## Step 8: Environment Variables

Add to Vercel (or `.env` for local dev):

```env
# CloudFront Secure Asset Delivery
CLOUDFRONT_DOMAIN=assets.millionflats.com
CLOUDFRONT_KEY_PAIR_ID=K2XXXXXXXXXXXXX
CLOUDFRONT_PRIVATE_KEY_B64=<base64-encoded-private-key-from-step-2>
NEXT_PUBLIC_CDN_DOMAIN=assets.millionflats.com
```

## Step 9: Database Migration

```bash
# Generate and run the Prisma migration for AssetAccessLog
npx prisma migrate dev --name add_asset_access_log
```

## Step 10: Deploy Application

Deploy the updated application code. The system will:
- Automatically detect CloudFront configuration
- Use CF signed URLs when available
- Fall back to S3 presigned URLs if CF is not configured
- Both paths work simultaneously during migration

---

## Rollback Plan

If issues are detected after S3 lockdown (Step 5):

1. **Immediate** (< 5 min): Remove the S3 bucket policy → re-enable public access
2. **Application**: CloudFront signed URLs continue working regardless
3. **Monitoring**: Watch CloudWatch for 4xx/5xx spikes after lockdown

---

## Verification Checklist

After deployment:

- [ ] `https://assets.millionflats.com/public/projects/...` loads with signed URL
- [ ] Direct S3 URL returns 403 (after bucket lockdown)
- [ ] Brochure download returns CF signed URL (check network tab)
- [ ] Agent documents load via `/api/assets/url`
- [ ] `asset_access_logs` table has entries for protected accesses
- [ ] Next.js Image optimization works with CF domain
- [ ] No raw S3 URLs visible in browser dev tools
