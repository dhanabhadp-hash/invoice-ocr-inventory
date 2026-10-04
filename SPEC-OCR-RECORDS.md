# Spec: OCR Records & Invoice Image Library

## Objective
เพิ่มหน้าแสดงข้อมูล OCR ที่บันทึกแล้วในแอป Invoice OCR Inventory โดยใช้ Google Sheets เป็นแหล่งข้อมูลหลักและ Google Drive เป็นแหล่งภาพต้นฉบับ ผู้ใช้ต้องค้นหาและตรวจข้อมูลระดับ Invoice ได้เร็วจาก Master View และเปิดรายละเอียดรายการทั้งหมดใน Detail View รวมถึงดูภาพ Thumbnail และเปิดภาพความละเอียดสูงได้โดยไม่ทำให้ไฟล์ Drive เป็นสาธารณะ

## Assumptions
1. แอปยังใช้ public link เดิมและ Google Apps Script bridge เดิม
2. ชีตเดิมยังคงคอลัมน์ A:N และแต่ละแถวคือสินค้า 1 รายการ
3. ค่า NImage URL อาจเป็น Drive URL เดิม หรือ URL proxy ของแอปรุ่นใหม่
4. ไม่มีการเปลี่ยน schema ฐานข้อมูลหรือสิทธิ์ Drive ให้ public

## Functional behavior
- มีหน้า/มุมมอง `รายการ OCR` แยกจากมุมมองอัปโหลด
- Master View แสดง บริษัท, Invoice No., จำนวนรายการใน Invoice, วันที่, ยอดรวม และสถานะภาพ พร้อมค้นหาบริษัท/เลข Invoice
- คลิก Master row เพื่อเปิด Detail View ของ Invoice เดียวกันและแสดงข้อมูลทุกคอลัมน์ที่อ่านได้รวมทุกรายการสินค้า
- แกลเลอรีภาพแสดง Thumbnail พร้อมชื่อบริษัทและเลข Invoice กำกับ
- คลิก Thumbnail แล้วเปิดภาพขนาดใหญ่ใน modal; รูปโหลดผ่าน server/bridge ที่ใช้สิทธิ์ภายใน ไม่ใช่ public Drive permission
- รองรับข้อมูลเดิมที่มี Drive URL โดยพยายามแปลง Drive file id เป็น image proxy URL
- เมื่อไม่มีข้อมูลหรืออ่านข้อมูลไม่สำเร็จ ต้องมี empty/error state ที่อ่านเข้าใจได้และมีปุ่มลองใหม่
- การอัปโหลด/OCR/บันทึกเดิมต้องยังทำงานและเมื่อบันทึกสำเร็จต้อง refresh รายการได้

## Commands
- Syntax: `node --check server.js`
- Frontend syntax: `node --check /tmp/invoice-ocr-inline.js` (extract script from `index.html`)
- Smoke test: start `PORT=3000 node server.js` and `curl /health`, `curl /manus-routes.json`

## Project structure
- `index.html` — upload/review UI และ OCR Records view
- `server.js` — `/api/invoices`, `/api/invoices/image/:id`, static route `/records`
- `appsscript/Code.gs` — bridge actions `listInvoices`, `getImage`
- `public/manus-routes.json` — route manifest `/` และ `/records`

## Boundaries
- Always: preserve Google Sheets A:N, keep Drive files private, escape rendered values, validate file/image identifiers, keep secrets server-side
- Ask first: changing Sheets schema, changing sharing permissions, deleting or editing historical rows, introducing authentication
- Never: expose bridge token, return arbitrary Drive files, trust unsanitized HTML, silently rewrite historical OCR values

## Success criteria
- `/records` serves the app and the route appears in `manus-routes.json`
- Records view requests `/api/invoices` and shows grouped master rows with item counts
- Selecting an invoice shows all detail rows and all relevant OCR fields
- Uploaded images have Thumbnail labels and open a high-resolution modal through `/api/invoices/image/:id`
- Syntax checks pass and existing upload/OCR/save paths remain present
