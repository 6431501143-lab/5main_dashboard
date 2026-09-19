# 5main_dashboard

Executive Inventory & Supply Chain Analytics Dashboard (Frontend-only สำหรับขึ้น GitHub Pages)

แดชบอร์ดสำหรับบริหารจัดการและวิเคราะห์ข้อมูลคลังสินค้า โดยรวบรวม 5 โมดูลสำคัญ:
1. **สินค้าไม่เคลื่อนไหวเกิน 1 ปี (Stagnant Stock)**
2. **สินค้าหมดอายุ / เฝ้าระวังวันหมดอายุ (Expiry Stock)**
3. **อัตราหมุนเวียนสินค้า (Turnover & Movements)**
4. **ยอดสินค้าคงคลัง (Inventory Balance)**
5. **การจ่ายสินค้าไปคลัง (Outbound Dispatch)**

---

## จุดเด่นของเวอร์ชันนี้
- **Zero Backend Required:** โหลดข้อมูลออฟไลน์จากไฟล์ Static JSON ใน `public/data/` รวดเร็วทันใจ
- **Ready for GitHub Pages:** ตั้งค่า `base: './'` ไว้เรียบร้อย สามารถ Deploy ขึ้น GitHub Pages ได้ทันที
- **รองรับการนำเข้าไฟล์:** ยังคงสามารถอัปโหลดไฟล์ Excel / CSV เพิ่มเติมเพื่อดูข้อมูลบนหน้าเว็บได้

---

## การติดตั้งและรันในเครื่อง (Local Development)

```bash
# 1. ติดตั้ง Dependencies
npm install

# 2. รัน Dev Server
npm run dev
```

---

## การ Build สำหรับขึ้น GitHub Pages (Production Build)

```bash
# Build ไฟล์สำหรับ Production (จะถูกสร้างไว้ในโฟลเดอร์ dist/)
npm run build
```

---

## วิธีนำขึ้น GitHub และเปิดใช้งาน GitHub Pages

### วิธีที่ 1: Deploy ผ่าน GitHub Actions (แนะนำ)
1. สร้าง New Repository บน GitHub ชื่อ `5main_dashboard`
2. Push โค้ดทั้งหมดขึ้น GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit for 5main_dashboard"
   git branch -M main
   git remote add origin https://github.com/<YOUR_USERNAME>/5main_dashboard.git
   git push -u origin main
   ```
3. บน GitHub ไปที่ **Settings** > **Pages**
4. ในส่วน **Build and deployment**:
   - Source: เลือก **GitHub Actions**
   - เลือก Template **Static HTML** หรือ **Vite**

### วิธีที่ 2: ใช้แพ็กเกจ gh-pages
```bash
npm install -D gh-pages
```
เพิ่ม script ใน `package.json`:
```json
"deploy": "vite build && gh-pages -d dist"
```
แล้วรัน:
```bash
npm run deploy
```
