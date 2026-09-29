# แนวทางการออกแบบ: Invoice OCR Inventory

## ทิศทาง
Nothing-inspired industrial instrument panel สำหรับงานหลังบ้านที่ต้องอ่านข้อมูลเร็วและแก้ไขได้มั่นใจ

## หลักการ
- Monochrome เป็นพื้น: OLED black และ warm off-white สลับได้
- Type hierarchy ชัด: ค่าหลักเด่น, ฟอร์มเป็นข้อมูลรอง, สถานะเป็น metadata
- ไม่มี gradient, shadow หรือ decoration ที่ไม่ช่วยงาน
- สีแดงใช้เป็น signal เดียวสำหรับ active/error/attention

## โครงสร้างหน้าจอ
หน้าเดียวแบบ workflow: header → upload station → OCR status → review grid → save action. บนมือถือ stack เป็นคอลัมน์และเปลี่ยนตารางเป็นการ์ดต่อรายการสินค้า; บนแท็บเล็ตใช้ two-column upload/review เมื่อมีพื้นที่

## Signature elements
- จุดแดงสถานะ live
- เส้นกริดบางและ dot-grid ใน empty state
- รหัสเอกสารและตัวเลขใช้ Space Mono
- ปุ่มเป็น technical rectangular 6px ไม่ใช้ pill เกินจำเป็น

## Interaction
ผู้ใช้เห็นสถานะ inline เช่น [READY], [OCR RUNNING], [REVIEW REQUIRED], [SAVED]. ทุกค่าที่ไม่มั่นใจหรือคำนวณคลาดเคลื่อนแสดงคำเตือนข้างค่า ไม่ใช้ toast

## Typography
Google Fonts: Doto สำหรับ hero, Space Grotesk สำหรับ body/UI, Space Mono สำหรับ labels และตัวเลข. โหลดผ่าน @import ใน styles.html/index.html.

## Brand essence / voice
แม่น, ตรง, ตรวจสอบได้, ไม่ทำให้ผู้ใช้เดาค่าที่ระบบแก้ให้เอง. ภาษาไทยเป็นหลัก; labels ที่เป็นชื่อ field ใช้ไทยพร้อมอังกฤษกำกับเมื่อต้อง map กับ Sheet.

## Wordmark / icon
Invoice OCR Inventory ใช้ไอคอนเอกสารสี่เหลี่ยมที่มีเส้น barcode สองเส้นและจุด signal แดง เป็นภาพจำของการอ่านเอกสารและ inventory.
