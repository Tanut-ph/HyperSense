# HyperSense

**ระบบช่วยตัดสินใจทางคลินิก — ความดันโลหิตสูงและความเสี่ยงโรคหัวใจและหลอดเลือด**

> Stack: Next.js 15 · TypeScript · Supabase · Python XGBoost

---

## รันโปรเจกต์

```bash
npm install
npm run dev
```

เปิดเบราว์เซอร์: `http://localhost:3000`

---

## Demo Login

| Username | Password | ชื่อ | Role |
|---|---|---|---|
| doctor1 | 1234 | นพ. วิชาญ สุขใจ | แพทย์ |
| doctor2 | 1234 | พญ. สมหญิง รักษาดี | แพทย์ |
| nurse1 | 1234 | น.ส. พรทิพย์ ใจดี | พยาบาล |
| medtech1 | 1234 | นาย ชาญณรงค์ วิชาการ | เทคนิคการแพทย์ |

---

## ขั้นตอนการใช้งาน

```
Login → ค้นหาผู้ป่วย → ข้อมูลผู้ป่วย → BP Trend → ML Risk + ยา → สรุปและบันทึก
```

| Step | หน้า | Role ที่ทำได้ |
|---|---|---|
| 1 | ค้นหาผู้ป่วย | ทุก Role |
| 2 | ข้อมูลผู้ป่วย + บันทึกค่า | พยาบาล (BP), เทคนิคการแพทย์ (แลป) |
| 3 | BP Trend (กราฟ + Linear Regression) | ทุก Role |
| 4 | ML Risk Analysis + แนะนำยา | ทุก Role |
| 5 | สรุป + แก้ไขยา + บันทึก | แพทย์ (แก้ไขได้), อื่นๆ (อ่านอย่างเดียว) |

---

## โครงสร้างโปรเจกต์

```
src/
├── app/
│   ├── page.tsx                 ← Main controller (step routing)
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── Header.tsx               ← Logo + user info + logout
│   ├── LoginPage.tsx            ← Login (role-based)
│   ├── StepIndicator.tsx        ← Progress bar
│   ├── PatientSearchPage.tsx    ← Step 1: ค้นหาผู้ป่วย
│   ├── PatientDetailPage.tsx    ← Step 2: ข้อมูลผู้ป่วย + BP + แลป
│   ├── BPTrendPage.tsx          ← Step 3: กราฟ BP Trend
│   ├── RiskMedicationPage.tsx   ← Step 4: ML Risk + แนะนำยา
│   ├── SummaryPage.tsx          ← Step 5: สรุปและบันทึก
│   └── HyperSense.module.css   ← Shared styles
└── lib/
    ├── supabase.ts              ← Supabase client
    ├── supabaseData.ts          ← Supabase queries
    ├── types.ts                 ← TypeScript interfaces
    ├── mockData.ts              ← Demo patients (fallback)
    ├── riskEngine.ts            ← Risk Score Calculator
    ├── medicationEngine.ts      ← Medication Decision Engine
    └── mlEngine.ts             ← XGBoost API client + fallback

ml/                              ← Python ML backend (optional)
├── api.py                       ← FastAPI server
├── train.py                     ← XGBoost training
├── predict.py                   ← SHAP explainability
└── requirements.txt
```

---

## ML Backend (optional)

```bash
cd ml
pip install -r requirements.txt
python train.py --data "path/to/data.xlsx"
uvicorn api:app --host 0.0.0.0 --port 8000 --reload
```

---

## เชื่อมต่อ Supabase

สร้างไฟล์ `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_ML_API_URL=http://localhost:8000   # optional
```

ถ้าไม่ตั้งค่า `NEXT_PUBLIC_SUPABASE_URL` ระบบจะใช้ Mock Data อัตโนมัติ

---

## เอกสารระบบเต็ม

ดูรายละเอียดที่ [HYPERSENSE.md](HYPERSENSE.md)
