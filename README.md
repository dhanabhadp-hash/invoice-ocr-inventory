# Invoice OCR Inventory

## สิ่งที่สร้าง
- `appsscript/Code.gs`: Apps Script backend สำหรับ OCR, Drive upload, validation, VAT-inclusive normalization และ append Sheets A:N
- `appsscript/Index.html`, `styles.html`, `client.html`: UI ภาษาไทย responsive สำหรับ upload → OCR → review/edit → save
- `public/manus-routes.json`: route manifest ของ Web preview

## ตั้งค่า Google Apps Script
1. เปิด Apps Script แล้วสร้างโปรเจกต์ใหม่ หรือใช้ clasp นำไฟล์ใน `appsscript/` ไปวาง
2. วาง `Code.gs`, `Index.html`, `styles.html`, `client.html` เป็นไฟล์ในโปรเจกต์เดียวกัน
3. รัน `setup()` หนึ่งครั้งและอนุญาตสิทธิ์ Google Drive/Sheets
4. ไปที่ Project Settings → Script properties แล้วตั้ง `OCR_API_KEY` เป็น API key ที่ต้องการใช้ และตั้ง `INV_OCR_DRIVE_FOLDER_ID` (ถ้าต้องการโฟลเดอร์เฉพาะ)
5. `GEMINI_API_KEY` เดิมยังรองรับเป็น fallback เพื่อย้ายระบบโดยไม่สะดุด แต่ไม่ต้องใส่ key ใน HTML หรือ JavaScript ฝั่ง browser
6. Deploy → New deployment → Web app; เลือก Execute as Me และจำกัดผู้เข้าถึงตามนโยบายองค์กร
7. เปิด URL ของ Web App แล้วทดลองอัปโหลดบิลจริง

## OCR API
ระบบอ่าน `OCR_API_KEY` จาก Script Properties ฝั่ง server เท่านั้น และใช้กับ Gemini-compatible multimodal endpoint ใน `callGemini_()`. หากต้องการเปลี่ยนเป็นผู้ให้บริการที่ไม่ใช่ Gemini-compatible ต้องเปลี่ยน endpoint, request schema และ response parser ให้ตรงกับผู้ให้บริการนั้นก่อนใช้งานจริง

## หมายเหตุความปลอดภัย
- API key อยู่ใน Script Properties เท่านั้น ไม่อยู่ใน HTML/client JS
- Drive file ไม่ถูกตั้งเป็น public อัตโนมัติ
- ก่อนบันทึกทุกครั้งผู้ใช้ต้อง review; ระบบจะแสดงคำเตือน arithmetic/tax/code validation inline
- เปลี่ยน `SHEET_NAME` หากชีตปลายทางไม่ใช่ `Sheet1`
