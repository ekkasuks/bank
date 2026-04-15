# ระบบฝากเงินนักเรียน — โรงเรียนบ้านใหม่
**Student Savings System**

---

## ไฟล์ในระบบ

| ไฟล์ | หน้าที่ |
|------|---------|
| `index.html` | หน้าเว็บหลัก |
| `style.css` | สไตล์ทั้งหมด |
| `app.js` | Logic ของเว็บแอป |
| `code-gas.js` | Backend (วางใน Google Apps Script) |

---

## วิธีติดตั้งบน GitHub Pages

1. สร้าง Repository ใหม่ใน GitHub (เช่น `student-savings`)
2. อัปโหลดไฟล์ `index.html`, `style.css`, `app.js`
3. ไปที่ Settings → Pages → Source: **main branch / root**
4. เว็บจะพร้อมใช้งานที่ `https://username.github.io/student-savings`

---

## วิธีตั้งค่า Google Sheets Backend

### ขั้นตอนที่ 1: สร้าง Google Sheet
1. เปิด [Google Sheets](https://sheets.google.com) สร้าง Spreadsheet ใหม่
2. คัดลอก **Spreadsheet ID** จาก URL:  
   `https://docs.google.com/spreadsheets/d/**[ID อยู่ตรงนี้]**/edit`

### ขั้นตอนที่ 2: ตั้งค่า Apps Script
1. ใน Google Sheets → **Extensions → Apps Script**
2. ลบโค้ดเดิมทิ้ง แล้ววางโค้ดจาก `code-gas.js` ทั้งหมด
3. แก้ไขบรรทัดที่ 12:
   ```javascript
   var SPREADSHEET_ID = 'วางID_ของคุณที่นี่';
   ```
4. กด **Save** (Ctrl+S)

### ขั้นตอนที่ 3: Deploy
1. คลิก **Deploy → New deployment**
2. ประเภท: **Web app**
3. Execute as: **Me**
4. Who has access: **Anyone**
5. กด **Deploy** → คัดลอก **Web App URL**

### ขั้นตอนที่ 4: เชื่อมต่อเว็บ
1. เปิดเว็บแอปบน GitHub Pages
2. คลิก **⚙ ตั้งค่าการเชื่อมต่อ** (มุมล่างซ้าย)
3. วาง Web App URL
4. กด **บันทึกและทดสอบ**

---

## ฟีเจอร์ทั้งหมด

### หน้าหลัก (Dashboard)
- ยอดออมรวม, จำนวนนักเรียน, รายการเดือนนี้, นักเรียนออมสูงสุด
- กราฟแท่งเปรียบเทียบยอดเงินรายบุคคล
- กราฟเส้นสรุปจำนวนครั้งฝากรายเดือน (8 เดือนย้อนหลัง)
- รายการล่าสุด
- กรองตามชั้นเรียนได้

### ฝาก / ถอนเงิน
- เลือกชั้น → เลือกนักเรียน
- บันทึกฝาก/ถอน พร้อมวันที่และหมายเหตุ
- ตรวจสอบยอดคงเหลือก่อนถอน
- ค้นหาและลบรายการได้

### จัดการนักเรียน
- เพิ่ม / แก้ไข / ลบนักเรียน
- ข้อมูล: ชั้น, เลขประจำตัว, ชื่อ, นามสกุล
- กรองตามชั้นและค้นหาชื่อ
- ปุ่มลัด "฿ ฝาก" ไปหน้าฝากเงินทันที

### รายงาน
- **รายชั้น**: ตารางสรุปนักเรียนทุกคน พร้อมยอดเงินและจำนวนครั้งที่ฝากแต่ละเดือน
- **รายบุคคล**: ประวัติรายการทั้งหมดของนักเรียนคนนั้น
- กรองตาม ชั้น / นักเรียน / เดือน
- พิมพ์ PDF ด้วย Ctrl+P หรือปุ่ม 🖨

---

## โครงสร้าง Google Sheet

ระบบจะสร้างชีตอัตโนมัติ 2 แผ่น:

**Students**
| rowIndex | class | id | firstName | lastName |

**Transactions**
| id | studentRowIndex | type | amount | date | note | createdAt |

---

## หมายเหตุ

- ข้อมูลถูกบันทึกใน `localStorage` ของเบราว์เซอร์เสมอ (ใช้งานได้แม้ไม่มีอินเทอร์เน็ต)
- กด **⟳ ซิงค์ข้อมูล** เพื่อดึงข้อมูลล่าสุดจาก Google Sheets
- เมื่อเพิ่ม/แก้ไขนักเรียน และบันทึกรายการ จะส่งไปยัง Google Sheets อัตโนมัติ
