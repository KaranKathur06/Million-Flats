# Lead Magnet Image Upload Design

## Goal

Allow an administrator to attach either a PDF or an image to a lead magnet. A
lead magnet continues to have exactly one downloadable asset; uploading a new
asset replaces the existing one. Support PNG, JPEG, and WebP images, including
the supplied PNG, without changing how existing PDF lead magnets are managed
or downloaded.

## Current behavior

The admin editor uses `PdfDropzone`, and both lead-magnet upload endpoints
restrict files to `application/pdf`. The Prisma record stores one private
`fileS3Key`. Admin lifecycle/status logic, the login-gated download endpoint,
and signed CloudFront delivery all use that key. Uploaded content type is
preserved by the shared upload service.

## Design

Keep the existing single-file schema and lifecycle. Update the shared
lead-magnet admin upload/replace UI to accept PDF, PNG, JPEG, and WebP, enforce
the 10 MB limit, explain supported formats, show an image preview for a newly
selected image, and show the stored asset's filename and type. Existing PDFs
remain valid and keep the same preview/management flow. Removing the stored
asset continues to return the lead magnet to draft.

Both admin upload routes must apply the same allowlist and size limit, so the
create-with-file endpoint and the existing-draft replacement endpoint cannot
disagree. Validate the file type on the server as well as in the browser; do
not accept SVG or other active/unapproved formats. Upload to private storage
with the actual content type. Replace the database key only after the new
upload succeeds, then clean up the previous object. If persistence fails after
an object has been uploaded, attempt to remove the unreferenced new object and
report the failure rather than returning success.

No schema migration is needed: the record already stores a single asset key.
The existing public CTA, authentication gate, rate limiting, access tracking,
signed URL generation, status rules, and legacy FAQ environment-key fallback
remain unchanged. The browser continues opening the asset through the same
signed URL flow; images render according to their stored image content type.
For legacy key recovery, a `.pdf` filename keeps the existing ordered
`guide.pdf` and same-filename candidates. Image and extensionless filenames
may only search for that exact filename in the existing lead-magnet key
locations; they must never fall back to `guide.pdf`. Filename matching remains
case-sensitive, as required by S3 keys. Upload validation checks the content
signature against the declared MIME type and rejects mismatched known
extensions; supported files without an extension receive the detected
canonical extension before storage.

## Validation and failure behavior

- Reject unsupported MIME types, mismatched file signatures, and files over
  10 MB on the server; mirror supported types and size limits in the admin
  dropzone.
- Invalid uploads must leave the existing asset and lead-magnet status
  untouched.
- Upload errors are surfaced to the administrator. Failed cleanup is logged
  and does not conceal the primary upload or persistence error.
- Existing PDF keys remain downloadable without re-uploading or migration.
- The admin preview must release temporary object URLs when the selection
  changes or the editor unmounts.

## Verification

Test the shared file validation for valid PDF, PNG, JPEG, and WebP files, plus
unsupported MIME/signature mismatches and files above 10 MB. Exercise the
admin create and replacement upload paths, including failure without losing
the existing file. Verify that deleting the asset still resets lifecycle state
and that existing signed-download, login-gate, and legacy fallback behavior
remains unchanged. Run focused tests and the repository's relevant TypeScript
or build validation.
