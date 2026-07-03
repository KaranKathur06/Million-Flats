# WhatsApp-First User Management Architecture

## Overview
This document defines the enterprise-ready design for MillionFlats user management after the platform pivot to WhatsApp-first authentication. It focuses on:
- user lifecycle
- identity model
- admin experience
- CRM synchronization
- WhatsApp auth health monitoring
- future-provider compatibility
- production-ready architecture

## 1. New User Lifecycle
1. Visitor lands on site or admin panel
2. WhatsApp login initiated
3. OTP sent via WhatsApp Authentication template
4. Temporary auth session created
5. OTP verified
6. Platform user record is created or resolved by phone
7. User enters partial profile onboarding
8. Profile completion progress is tracked dynamically
9. Verified/active user declared in platform
10. User may upgrade to premium, agent, developer, or investor
11. CRM lead is created and enriched automatically
12. Enterprise admin controls govern lifecycle transitions

## 2. User Model Redesign
The new user entity separates authentication identity from profile data.

### Identity
- id: UUID
- phone: string (WhatsApp number)
- phoneCountryIso2: string
- email: string (optional, user-provided)
- authProvider: string (`whatsapp`, `google`, `apple`, `email`, `sso`, etc.)
- displayName: string?
- image: string?
- preferredLanguage: string?
- timezone: string?
- countryIso2: string?
- registrationSource: string
- referralCode: string?
- referralBy: string?
- createdAt, updatedAt

### Authentication
- whatsappVerified: boolean
- phoneVerified: boolean
- emailVerified: boolean
- lastWhatsappLogin: DateTime?
- lastDevice: string?
- lastIp: string?
- currentSession: string?
- trustedDevices: Json?
- blocked: boolean
- suspended: boolean
- deleted: boolean
- verificationDate: DateTime?
- failedAttempts: Int
- otpAttempts: Int
- lastOtpSentAt: DateTime?

### Profile Completion
- profileCompletion: Int
- missingFields: Json?
- kycStatus: String?
- photoUploaded: Boolean
- emailAdded: Boolean
- addressAdded: Boolean
- city: String?
- state: String?
- nationality: String?
- occupation: String?
- buyerType: String?
- investor: Boolean
- nri: Boolean
- agent: Boolean
- developer: Boolean

### Platform
- subscriptionTier: String?
- role: String
- permissions: Json?
- leadCount: Int
- propertyCount: Int
- projectsCount: Int
- savedPropertiesCount: Int
- wishlistCount: Int
- activityScore: Int
- verixScore: Int

### Security
- ipHistory: Json?
- deviceHistory: Json?
- loginHistory: Json?
- suspiciousActivity: Json?
- riskScore: Int
- twoFactorStatus: String?
- banStatus: String?
- auditTrail: Json?

## 3. Admin Users Page Redesign
### Table columns
- Avatar
- Display Name
- WhatsApp Number
- Profile %
- Role
- Registration Status
- WhatsApp Verified
- Country
- Last Login
- Created
- Actions

### Behavior
- never show synthetic `wa_...@millionflats.auth` identifiers
- use WhatsApp phone as primary identifier for login-only accounts
- surface incomplete profiles as a first-class admin state
- support search by phone, name, email, and country
- allow bulk actions and enterprise filters

## 4. User Detail Page
### Sections
- Overview
- Authentication
- Profile
- Properties
- Saved
- Activity
- Devices
- Sessions
- Audit Logs
- WhatsApp
- CRM
- Notes
- Timeline
- Admin Actions

### Overview items
- Avatar
- Name
- Phone
- Country
- Member Since
- Role
- Status
- Completion %

### Authentication items
- Verified
- OTP history
- Last verification
- Current session
- Trusted devices
- Login count
- Failed attempts

### Timeline events
- Registered
- Verified
- Profile updated
- Properties posted
- Subscription purchased
- Role changed
- Suspended
- Reactivated

## 5. WhatsApp Authentication Dashboard
### Top cards
- Total WhatsApp Users
- Today's OTP requests
- OTP success rate
- Failed OTPs
- Blocked numbers
- Suspended users
- Average OTP time
- Average verification time

### Charts and reports
- OTP requests over time
- Verification trend
- Success percentage
- Failure categories
- Country distribution
- Device usage
- Daily active users

### Failure analytics
- template errors
- invalid numbers
- expired OTP
- wrong OTP
- rate limits
- platform API errors
- network errors
- user cancellations

### Meta health
- API status
- template status
- quality rating
- phone number health
- business verification
- current API version
- webhook status

## 6. Session Management
### Session record fields
- sessionId
- userId
- phone
- country
- IP
- city
- browser
- OS
- device
- status
- otpSent
- otpVerified
- duration
- createdAt
- expiresAt

### Actions
- View
- Terminate
- Retry OTP
- Resend
- Suspend user
- Delete session
- Audit

## 7. User Actions
### Admin actions
- View profile
- Open CRM
- Login history
- Sessions
- Properties
- Wishlist
- Documents
- Verification
- Edit
- Suspend
- Reactivate
- Ban
- Delete
- Force logout
- Send WhatsApp message
- Send broadcast
- Reset profile
- Export user
- Impersonate (Super Admin)

## 8. Message Center
### Capabilities
- Send WhatsApp message
- Send broadcast
- Send OTP again
- Send verification reminder
- Send welcome message
- Send subscription reminder
- Send property alerts
- Send campaign
- Schedule messages
- View delivery status
- View read status
- Retry failed
- Use templates
- Message history

## 9. CRM Integration Flow
### Sync triggers
- WhatsApp login
- profile completion
- subscription upgrade
- lead activity
- campaign response

### CRM lead fields
- lead source
- registration channel
- country
- WhatsApp number
- last activity
- interest
- properties viewed
- saved properties
- projects viewed
- campaign source
- referral info
- assigned agent
- notes
- pipeline stage
- tags

## 10. Profile Completion Flow
### Onboarding steps
1. Name, country, city
2. User type selector (buyer, agent, developer, investor)
3. Budget, interest, location
4. Optional email, photo, additional details

### Completion tracking
- dynamic progress bar
- field-level missing item list
- saved draft state
- permission gating based on completion

## 11. Future Compatibility
Design a connected User Intelligence Platform with a provider-agnostic identity layer.

Authentication should be separate from profile and intelligence, and support:
- WhatsApp OTP
- Email & password
- Google Sign-In
- Apple Sign-In
- Facebook Login
- Magic links
- Enterprise SSO
- Passkeys/WebAuthn

Use a core Identity layer with stable keys and a separate authentication layer for provider attachments.
A shared Profile and Intelligence layer should consume the same core identity and remain provider-agnostic.

## 12. Platform Features
- Identity-first admin user grid
- Health score and lifecycle stage
- CRM stage and recommendation confidence
- Progressive onboarding with adaptive field weights
- Lead intelligence synced automatically from onboarding answers
- Property unlock routing based on session and profile state
- Search by phone, WhatsApp, identity, country, lead score, and health score
- Bulk actions for lead assignment, campaign enrollment, and user lifecycle transitions
- Audit trail, session management, and risk scoring
- Real-time WhatsApp auth health analytics and failure diagnostics

## 13. Implementation Roadmap
1. Convert the admin users grid to WhatsApp-first identity display
2. Add a dedicated user detail page and user action panel
3. Enhance WhatsApp auth dashboard with troubleshooting and health metrics
4. Build CRM sync pipeline from WhatsApp auth to lead records
5. Implement progressive onboarding for phone-only signups
6. Add audit trail and session management for enterprise controls
7. Introduce centralized user health scoring and lifecycle stage
8. Create a unified intelligence hub that powers recommendations, CRM, and marketing

## 14. Key Architectural Principles
- Never expose synthetic WhatsApp emails in UI.
- Keep authentication separate from user profile data.
- Use the verified WhatsApp number as the primary identifier for phone-first accounts.
- Synchronize CRM, auth, onboarding, and intelligence through a single source of truth.
- Keep the schema extensible for future auth providers.

## 15. Current Code Alignment
- `prisma/schema.prisma` already contains core WhatsApp fields: `whatsappVerified`, `phoneVerified`, `lastWhatsappLogin`, `authProvider`, `profileCompletion`.
- `app/admin/users/page.tsx` now loads WhatsApp-first metadata and intelligence metrics.
- `app/admin/users/AdminUsersTableClient.tsx` has been updated for the new User Intelligence Center columns.
- `app/admin/users/detail/page.tsx` now surfaces lifecycle, CRM, and health score data.
- `app/admin/whatsapp-auth/page.tsx` remains the WhatsApp auth health dashboard to extend.

## 13. Implementation Roadmap
1. Convert the admin users grid to WhatsApp-first identity display
2. Add a dedicated user detail page and user action panel
3. Enhance WhatsApp auth dashboard with troubleshooting and health metrics
4. Create the message center for customer outreach from the admin profile
5. Build CRM sync pipeline from WhatsApp auth to lead records
6. Implement profile completion onboarding for phone-only signups
7. Add audit trail and session management for enterprise controls
8. Introduce a centralized security event and risk scoring model

## 14. Key Architectural Principles
- Never expose synthetic WhatsApp emails in UI.
- Keep authentication separate from user profile data.
- Use the verified WhatsApp number as the primary identifier for phone-first accounts.
- Synchronize CRM, auth, and user management through a single source of truth.
- Keep the schema extensible for future auth providers.

## 15. Current Code Alignment
- `prisma/schema.prisma` already contains core WhatsApp fields: `whatsappVerified`, `phoneVerified`, `lastWhatsappLogin`, `authProvider`, `profileCompletion`.
- `app/admin/users/page.tsx` now loads WhatsApp-first metadata.
- `app/admin/users/AdminUsersTableClient.tsx` has been updated for the new admin grid design.
- `app/admin/whatsapp-auth/page.tsx` will be enhanced to support higher-value WhatsApp auth health metrics.
