# GenomeMed AI — Next.js + Supabase

โปรเจกต์นี้ถูกแก้ให้ **ดึงข้อมูลผู้ป่วยจาก Supabase จริงเท่านั้น** และไม่มี `mockPatient` / fallback mock data แล้ว

## 1) ติดตั้ง dependencies

```bash
npm install
```

## 2) ตั้งค่า Supabase env

สร้างไฟล์ `.env.local` ที่ root project โดยดูตัวอย่างจาก `.env.example`

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_or_publishable_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

> หลังแก้ `.env.local` ต้อง restart dev server ทุกครั้ง

## 3) สร้างตารางใน Supabase

เปิด Supabase → SQL Editor → วาง SQL จากไฟล์นี้แล้วกด Run

```text
supabase/schema.sql
```

ตารางหลัก:

- `patients` — ข้อมูลผู้ป่วยจริง/ข้อมูลทดสอบที่อยู่ใน Supabase
- `patient_histories` — ประวัติการรักษาของผู้ป่วย
- `visits` — การมารับบริการ/คัดกรอง
- `ai_assessments` — ผลวิเคราะห์ AI
- `genetic_profiles` — ข้อมูลพันธุกรรม/ไฟล์ DNA
- `drug_recommendations` — คำแนะนำยา
- `referrals` — การส่งต่อผู้ป่วย

## 4) รันโปรเจกต์

```bash
npm run dev
```

เปิดเว็บ:

```text
http://localhost:3000
```

## 5) วิธีทดสอบการค้นหา

ถ้ารัน `supabase/schema.sql` ตามไฟล์นี้ จะมีข้อมูลตัวอย่างในฐานข้อมูล Supabase:

```text
รหัสผู้ป่วย: PT-20240087
เลขบัตรประชาชน: 3-1002-01234-56-7
```

ข้อมูลนี้ไม่ใช่ mock ในโค้ด แต่เป็น seed data ใน Supabase เพื่อใช้ทดสอบการ query

## สิ่งที่แก้จากเวอร์ชันก่อน

- ลบ `MOCK_PATIENT` ออกจาก `src/lib/patient.ts`
- ลบปุ่ม “ข้อมูลตัวอย่าง” ออกจาก `SearchPage.tsx`
- ถ้าไม่ได้ตั้งค่า Supabase จะขึ้น error ชัดเจน ไม่ fallback เป็น mock
- `ConfirmPage.tsx` ใช้ชื่อผู้ป่วยจริงจากข้อมูลที่ค้นหาได้
- `AnalysisPage.tsx` ใช้เปอร์เซ็นต์ risk จาก Supabase (`patients.risks`) แทนค่าคงที่ในโค้ด
- เพิ่มคำอธิบายใน `src/lib/supabase.ts` และ `src/lib/patient.ts`
