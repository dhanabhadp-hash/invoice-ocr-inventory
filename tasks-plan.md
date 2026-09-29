# Manus Migration Plan

1. **Google bridge** — Keep Drive/Sheets as the source of truth; add authenticated Apps Script `doPost` actions for `saveImage` and `saveInvoice`, preserving A:N and LockService validation.
2. **Manus backend** — Add Node.js server with `/health`, `/api/ocr`, and `/api/save`; use Manus multimodal runtime and temporary project storage for Vision input; apply VAT and field validation server-side.
3. **Frontend continuity** — Preserve the existing Tailwind/Nothing-style UI, but call Manus API routes instead of `google.script.run`; keep mobile/tablet upload, preview, review/edit, warnings and save states.
4. **Deployment** — Enable Manus server, declare Dockerfile/health path, route `/api/*` to server and `/*` to static, protect bridge URL/token as secrets, publish public-link app.
5. **Verification** — Run syntax checks, local health/static checks, model request probe, code review of frontend → backend → bridge contracts, then publish.

Open operational prerequisite: the Apps Script project must have `MANUS_BRIDGE_TOKEN` equal to the protected `GOOGLE_APPS_SCRIPT_TOKEN`, and the deployed Apps Script `/exec` URL must be the protected `GOOGLE_APPS_SCRIPT_URL`.
