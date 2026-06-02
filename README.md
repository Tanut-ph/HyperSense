# HyperSenseProgram

**ระบบช่วยตัดสินใจทางคลินิกสำหรับการจัดการความดันโลหิตสูงและความเสี่ยงโรคหัวใจและหลอดเลือด**

> Stack: Next.js · TypeScript · Supabase

---

## รันโปรเจกต์

```bash
npm install
npm run dev
```

เปิดเบราว์เซอร์: `http://localhost:3000`

## Demo Login

| Username | Password | ชื่อ |
|---|---|---|
| doctor1 | 1234 | นพ. วิชาญ สุขใจ |
| doctor2 | 1234 | พญ. สมหญิง รักษาดี |

## โครงสร้างโปรเจกต์

```
src/
├── app/                         ← Next.js App Router
│   ├── page.tsx                 ← Main controller (step routing)
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── Header.tsx               ← Header + logout
│   └── hypersense/              ← หน้าทั้งหมดของระบบ
│       ├── LoginPage.tsx        ← Step 1: Login
│       ├── PatientSearchPage.tsx← Step 2: ค้นหาผู้ป่วย
│       ├── PatientDetailPage.tsx← Step 3: ข้อมูลผู้ป่วย + บันทึก BP
│       ├── BPTrendPage.tsx      ← Step 4: กราฟ BP Trend + ML
│       ├── RiskMedicationPage.tsx← Step 5: ประเมินความเสี่ยง + แนะนำยา
│       ├── SummaryPage.tsx      ← Step 6: สรุปและบันทึก
│       ├── StepIndicator.tsx    ← Progress bar
│       ├── HyperSense.module.css← Styles หลัก
│       └── Login.module.css     ← Styles หน้า Login
└── lib/
    ├── supabase.ts              ← Supabase client
    └── hypersense/              ← Logic & data layer
        ├── types.ts             ← TypeScript interfaces
        ├── mockData.ts          ← ข้อมูลทดสอบ (5 ผู้ป่วย)
        ├── riskEngine.ts        ← คำนวณ Risk Score
        ├── medicationEngine.ts  ← แนะนำแนวทางยา
        └── supabaseData.ts      ← Supabase queries
```

## เชื่อมต่อ Supabase

สร้างไฟล์ `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

ดู schema เพิ่มเติมที่ `supabase/schema.sql`

## เอกสารระบบ

ดูรายละเอียดเต็มที่ `HYPERSENSE.md`
