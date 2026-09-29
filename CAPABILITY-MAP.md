# Capability Map: Invoice OCR Inventory

| Module | Responsibility | Depends on |
|---|---|---|
| frontend | Responsive mobile/tablet upload and review UI | — |
| apps-script | Google Apps Script web app API, Drive upload, Sheets persistence | frontend |
| ocr-extraction | Gemini multimodal extraction and VAT normalization | apps-script |
| data-governance | Validation, deduplication, audit trail, safe sharing | apps-script |

Build order: frontend → apps-script → ocr-extraction → data-governance
