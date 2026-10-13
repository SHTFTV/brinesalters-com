# PlowWow contractor intake

This intake uses isolated application tables and a private equipment-photo bucket in the existing IAM `pseo-images` project (`uxfzsopnuklopjcrtmxh`). It does not create a paid project or replace the old PlowWow customer-quote backend.

- Function: `plowwow-contractor-apply`, JWT verification enabled.
- Public page: `https://brinesalters.com/contractor-apply/`.
- Review: use the authenticated Supabase Table Editor for `contractor_applications` and `contractor_equipment`; filter applications to `status = submitted`, excluding `is_test = true`.
- Photos: private `contractor-equipment` bucket, application ID / equipment entry / photo number. No public read or listing policy.
- Public keys in `src/contractor-config.js` identify the application only. Never place a service-role or secret key in that file.
- The Edge Function uses the platform's built-in server-only service-role environment for validation, rate limits, storage and finalization.
- Details are structured rather than sent as a free-form email. No applicant email, dispatch notification or approval is automatically sent by this implementation.
- Equipment photos are re-encoded as WebP, restricted to 1 MB per stored image and 1–3 images per equipment entry. Applicants may add 1–10 entries.
- Finalization checks that every expected image exists and has a WebP signature. Incomplete uploads remain `uploading`, not submitted.
- A synthetic verification record is retained with `is_test = true`, business beginning `TEST ONLY`, and no dispatch availability. It must never be treated as a contractor lead.

To redeploy the function, upload `index.ts` together with `../src/contractor-schema.js` as its relative `contractor-schema.js` dependency. Keep `verify_jwt` enabled.
