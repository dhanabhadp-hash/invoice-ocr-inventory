# Plan: Invoice OCR workflow reliability

## Acceptance criteria
1. VAT-inclusive bills: when the bill shows VAT 7% included or the grand total includes VAT, preserve OCR unit and line totals exactly; apply 1.07 only when the bill explicitly states prices are before VAT or VAT is added separately.
2. GPU/TPU codes: extract numeric 5–8 digit codes from values such as `G:123456` and `T:123456`; if missing, masked, or unreadable, store an empty string without guessing.
3. Save behavior: after Google Sheets confirms success, clear file, preview, OCR data, and editable fields; if save fails, retain all current values for correction/retry.
4. Notifications: replace timed corner toasts with a centered modal. Errors persist until a later successful OCR/data load or successful save; success messages do not auto-dismiss.

## Files
- `server.js`: VAT prompt/normalization and GPU/TPU code normalization.
- `index.html`: persistent centered modal, successful-save reset, failure retention.
- `SPEC.md`: living acceptance criteria.

## Verification
- `node --check server.js` and frontend script syntax check.
- Unit-style Node assertions for VAT-inclusive/exclusive and GPU/TPU normalization.
- Static checks for persistent modal and save reset/failure retention.
