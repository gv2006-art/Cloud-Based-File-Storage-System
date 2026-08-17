# Security Notes — Cloud-Based File Storage System

This document explains the security decisions made in this project so
they can be reviewed as part of internship verification.

## Authentication
- Authentication is delegated entirely to Google via OAuth 2.0
  (`passport-google-oauth20`). The application never sees or stores the
  user's Google password.
- After the OAuth handshake, the backend issues its own short-lived JWT
  (`JWT_EXPIRES_IN`, default 7 days) rather than relying on server-side
  sessions, so the API stays stateless and horizontally scalable behind
  the load balancer / Auto Scaling Group.
- All `/api/files/*` and `/api/folders/*` routes are behind the
  `requireAuth` middleware, which validates the JWT signature and expiry
  on every request.

## Authorization
- Every file/folder/share query is scoped with `WHERE owner_id = req.user.id`
  (or the equivalent Sequelize `where` clause) at the database layer —
  never trusting a client-supplied user id. This is what stops User B from
  reading User A's file by editing the `:id` in the URL; the tests in
  `backend/tests/files.test.js` assert this directly.
- Public share links use a random 48-character token (`crypto.randomBytes(24)`)
  as the sole credential, are individually revocable, and can carry an
  expiry timestamp. The `resolveShare` endpoint checks `revoked` and
  `expiresAt` on every access.

## Data protection
- Uploaded files are streamed directly to S3 and are never written to the
  application server's / container's disk.
- The S3 bucket has **Block Public Access** enabled on all four settings
  and is reached only through short-lived, scoped pre-signed URLs
  (default 5 minutes, configurable via `PRESIGNED_URL_EXPIRY`).
- Server-side encryption (SSE-S3 / AES256) is enabled on every object.
- In production, the backend should run under the IAM role defined in
  `infrastructure/iam.tf` (least-privilege: only the S3 actions it needs,
  scoped to only this bucket) instead of long-lived access keys in `.env`.

## Application hardening
- `helmet()` sets standard secure HTTP headers.
- CORS is restricted to `CLIENT_URL` only.
- `express-rate-limit` caps requests per IP on all `/api` routes.
- All input is validated at the controller layer before touching the
  database or S3; Sequelize's parameterized queries prevent SQL injection.
- Secrets (`JWT_SECRET`, `GOOGLE_CLIENT_SECRET`, AWS keys, `DATABASE_URL`)
  are read exclusively from environment variables — see `.env.example` —
  and `.env` is git-ignored.

## What is intentionally out of scope for this demo
- A JWT revocation/blocklist (logout is currently a client-side token
  discard — see the comment in `authController.js`).
- Multi-factor authentication beyond what Google's own login provides.
- Fine-grained per-folder ACLs beyond owner + share.
