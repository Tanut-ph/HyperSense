# HyperSenseProgram
### ระบบช่วยตัดสินใจทางคลินิก — ความดันโลหิตสูงและความเสี่ยงโรคหัวใจ

> **ประเภท:** Prototype / Clinical Decision Support System  
> **Stack:** Next.js · Supabase · TypeScript  
> **วันที่:** มิถุนายน 2569

---

## 📋 สารบัญ

1. [ภาพรวมระบบ](#1-ภาพรวมระบบ)
2. [User Flow](#2-user-flow)
3. [โครงสร้างไฟล์](#3-โครงสร้างไฟล์)
4. [Database Schema](#4-database-schema)
5. [Risk Engine (ML)](#5-risk-engine-ml)
6. [Medication Decision Engine](#6-medication-decision-engine)
7. [ข้อมูลทดสอบ (Mock Patients)](#7-ข้อมูลทดสอบ-mock-patients)
8. [การติดตั้งและรัน](#8-การติดตั้งและรัน)
9. [การเชื่อมต่อ Supabase จริง](#9-การเชื่อมต่อ-supabase-จริง)
10. [Road Map สู่ Production](#10-road-map-สู่-production)
11. [ข้อจำกัดและคำเตือน](#11-ข้อจำกัดและคำเตือน)

---

## 1. ภาพรวมระบบ

**CardioGuard AI** คือระบบเว็บแดชบอร์ดสำหรับแพทย์และบุคลากรทางการแพทย์
เพื่อช่วยวิเคราะห์ผู้ป่วยความดันโลหิตสูงจากข้อมูล EMR ระยะยาว

### สิ่งที่ระบบทำ

| ความสามารถ | รายละเอียด |
|---|---|
| 🔍 ค้นหาผู้ป่วย | ค้นหาจากเลขบัตรประชาชน 13 หลัก หรือรหัสผู้ป่วย |
| 📋 ข้อมูลผู้ป่วย | แสดงประวัติการรักษา ยา โรคร่วม และผล Lab |
| 🩺 บันทึก BP วันนี้ | ถ้ายังไม่ได้วัดวันนี้ จะเปิดฟอร์มกรอก ถ้าวัดแล้วจะแสดงแบบ Read-only |
| 📈 BP Trend + ML | กราฟ SBP/DBP พร้อม Linear Regression Trend Line และคาดการณ์อนาคต |
| 🤖 AI Risk Prediction | ประเมินความเสี่ยง Stroke / MACE / HTN Progression |
| 💊 Medication Support | แนะนำแนวทางยา (CONTINUE / INTENSIFY / REDUCE / URGENT_REVIEW) + ตรวจสอบยาที่ขัดแย้งกัน |
| 📝 สรุปและบันทึก | สรุปครบ + คำแนะนำยา + นัดหมาย (รับรูปแบบ พ.ศ.) + บันทึกลง HIS |

### สิ่งที่ระบบ **ไม่** ทำ

- ❌ ไม่สั่งยาแทนแพทย์
- ❌ ไม่ตัดสินใจทางคลินิกโดยอัตโนมัติ
- ❌ ไม่เข้าถึงข้อมูลนอกเหนือจากที่แพทย์ authorized

---

## 2. User Flow

```
┌─────────────────────────────────────────────────────────┐
│  Login (doctor1/1234 หรือ doctor2/1234)                  │
└─────────────────────────────┬───────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────┐
│  Step 1: ค้นหาผู้ป่วย                                   │
│  กรอกเลขบัตรประชาชน 13 หลัก หรือรหัสผู้ป่วย (P001)    │
└─────────────────────────────┬───────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────┐
│  Step 2: ข้อมูลผู้ป่วย                                  │
│  • รูป avatar + ข้อมูลพื้นฐาน + แพทย์ผู้ดูแล           │
│  • โรคร่วม + ยาที่ใช้ + ผล Lab                          │
│  • BP วันนี้:                                            │
│    ├─ ถ้าวัดแล้ว (P001) → แสดงแบบ Read-only ✅           │
│    └─ ถ้ายังไม่ได้วัด → เปิดฟอร์มกรอก SBP/DBP/HR       │
│  • หมายเหตุแพทย์ (ถ้ามี)                               │
│  • ประวัติ Visit (ย้อนหลัง 3 ครั้ง / ดูทั้งหมด)        │
└─────────────────────────────┬───────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────┐
│  Step 3: BP Trend + ML Prediction                        │
│  • SVG Chart: SBP / DBP timeline                         │
│  • Trend Line (Linear Regression)                        │
│  • คาดการณ์ SBP ใน 1 เดือน และ 3 เดือน                  │
│  • ตาราง Visit ทั้งหมด + สถิติ (ย่อ/ขยายได้)           │
└─────────────────────────────┬───────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────┐
│  Step 4: ความเสี่ยงโรค + แนะนำยา                        │
│  • Risk Level (ภาษาไทย)                                 │
│  • Stroke Risk % + MACE Risk % + HTN Progression %      │
│  • Feature Importance (top 5 ปัจจัย)                    │
│  • Medication Recommendation Banner                      │
│  • แนวทางการปรับยา (ใช้ตามเดิม / เพิ่ม / ลด / เปลี่ยน)│
└─────────────────────────────┬───────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────┐
│  Step 5: สรุปและบันทึก                                  │
│  • Patient Card + Risk Summary (ระดับภาษาไทย)          │
│  • แจ้งเตือน "ส่งพบแพทย์ด่วน" ถ้า URGENT_REVIEW        │
│  • คำแนะนำยาความดัน (แก้ไขได้) + ตรวจสอบยาที่ขัดแย้ง  │
│  • ปุ่ม "แก้ไขข้อมูลผู้ป่วย" → Edit Mode               │
│    ├─ เพิ่ม / ลบ / แก้ไขยา + แจ้งเตือนยาขัดแย้ง       │
│    └─ หมายเหตุแพทย์                                     │
│  • นัดหมายครั้งต่อไป (กรอกวันที่รูปแบบ พ.ศ. + shortcut)│
│  • ปุ่ม "บันทึกข้อมูล" → Success Screen + Ref ID        │
└─────────────────────────────────────────────────────────┘
```

### Demo Login Accounts

| Username | Password | ชื่อ |
|---|---|---|
| doctor1 | 1234 | นพ. วิชาญ สุขใจ |
| doctor2 | 1234 | พญ. สมหญิง รักษาดี |

---

## 3. โครงสร้างไฟล์

```
src/
├── app/
│   ├── page.tsx                      ← Main controller (step routing)
│   ├── layout.tsx
│   └── globals.css
│
├── components/
│   ├── Header.tsx                    ← Header + logout button
│   └── hypersense/                   ← หน้าทั้งหมดของระบบ
│       ├── HyperSense.module.css     ← CSS Modules หลัก
│       ├── StepIndicator.tsx         ← Progress bar (step 1–5)
│       ├── Login.module.css          ← CSS สำหรับหน้า Login
│       ├── LoginPage.tsx             ← Step 1: Login
│       ├── PatientSearchPage.tsx     ← Step 2: ค้นหาผู้ป่วย
│       ├── PatientDetailPage.tsx     ← Step 3: ข้อมูลผู้ป่วย + บันทึก BP
│       ├── BPTrendPage.tsx           ← Step 4: กราฟ BP Trend + Linear Regression
│       ├── RiskMedicationPage.tsx    ← Step 5: ประเมินความเสี่ยง + แนะนำยา
│       └── SummaryPage.tsx           ← Step 6: สรุป + แก้ไข + นัดหมาย + บันทึก
│
└── lib/
    ├── supabase.ts                   ← Supabase browser client
    └── hypersense/                   ← Business logic & data layer
        ├── types.ts                  ← TypeScript interfaces ทั้งหมด
        ├── mockData.ts               ← Mock patients (5 คน)
        ├── riskEngine.ts             ← Weighted Risk Score Calculator
        ├── medicationEngine.ts       ← Medication Decision Engine
        └── supabaseData.ts           ← Supabase queries (patients, visits, etc.)
```

---

## 4. Database Schema

> สำหรับ Supabase (PostgreSQL) — ใช้แทน Mock Data ใน Production

```sql
-- ผู้ป่วย
CREATE TABLE patients (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_code  TEXT UNIQUE NOT NULL,          -- P001, P002, ...
  national_id   TEXT UNIQUE NOT NULL,          -- 13 หลัก
  full_name     TEXT NOT NULL,
  age           INTEGER,
  sex           TEXT CHECK (sex IN ('ชาย','หญิง')),
  bp_target     INTEGER DEFAULT 130,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Visit / BP Reading แต่ละครั้ง
CREATE TABLE visits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  UUID REFERENCES patients(id),
  visit_date  DATE NOT NULL,
  sbp         INTEGER NOT NULL,
  dbp         INTEGER NOT NULL,
  heart_rate  INTEGER,
  weight_kg   NUMERIC(5,1),
  bmi         NUMERIC(4,1),
  recorded_by TEXT,              -- doctor ID
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Lab Results
CREATE TABLE labs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id   UUID REFERENCES patients(id),
  lab_date     DATE NOT NULL,
  hba1c        NUMERIC(4,1),
  ldl          NUMERIC(5,1),
  hdl          NUMERIC(5,1),
  creatinine   NUMERIC(4,2),
  egfr         NUMERIC(5,1),
  potassium    NUMERIC(4,2)
);

-- โรคร่วม
CREATE TABLE comorbidities (
  patient_id    UUID PRIMARY KEY REFERENCES patients(id),
  diabetes      BOOLEAN DEFAULT FALSE,
  ckd           BOOLEAN DEFAULT FALSE,
  cad           BOOLEAN DEFAULT FALSE,
  heart_failure BOOLEAN DEFAULT FALSE,
  stroke        BOOLEAN DEFAULT FALSE,
  af            BOOLEAN DEFAULT FALSE
);

-- ยา
CREATE TABLE medications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  UUID REFERENCES patients(id),
  drug_class  TEXT NOT NULL,       -- ACEI, ARB, CCB, Beta-blocker, Diuretic
  drug_name   TEXT NOT NULL,
  dose        TEXT,
  frequency   TEXT,
  start_date  DATE,
  end_date    DATE,                -- NULL = ยังใช้อยู่
  is_active   BOOLEAN DEFAULT TRUE
);

-- AI Predictions (บันทึกผลการประเมิน)
CREATE TABLE ai_predictions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id       UUID REFERENCES patients(id),
  visit_id         UUID REFERENCES visits(id),
  stroke_risk      NUMERIC(5,2),
  mace_risk        NUMERIC(5,2),
  progression_risk NUMERIC(5,2),
  overall_risk     TEXT,           -- Low/Moderate/High/Critical
  risk_score       INTEGER,
  recommendation   TEXT,           -- CONTINUE/INTENSIFY/REDUCE/...
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- บันทึกการตัดสินใจแพทย์
CREATE TABLE doctor_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID REFERENCES patients(id),
  prediction_id   UUID REFERENCES ai_predictions(id),
  doctor_id       TEXT,
  clinical_notes  TEXT,
  next_appt_date  DATE,
  appt_note       TEXT,
  medications     JSONB,           -- snapshot ยาที่แก้ไข
  ref_id          TEXT UNIQUE,     -- CG-XXXXXX
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 5. Risk Engine (ML)

### ไฟล์: `src/lib/cardio/riskEngine.ts`

ระบบใช้ **Weighted Feature Scoring** จำลองผล ML Model (XGBoost/Random Forest)

#### Feature Weights

| Feature | Weight | เงื่อนไข |
|---|---|---|
| SBP เฉลี่ย >160 | +25 | Critical hypertension |
| SBP เฉลี่ย >150 | +18 | Stage 2 |
| SBP เฉลี่ย >140 | +12 | Stage 1 |
| BP Variability >12 | +14 | High variability |
| BP Trend เพิ่มขึ้น | +8 | Worsening trend |
| อายุ ≥70 | +15 | Elderly |
| อายุ ≥60 | +10 | Senior |
| Stroke (history) | +20 | Prior event |
| CAD | +18 | Known CVD |
| Heart Failure | +15 | HFrEF/HFpEF |
| Diabetes | +12 | DM comorbidity |
| CKD | +12 | Renal disease |
| AF | +10 | Arrhythmia |
| eGFR <45 | +12 | Severe CKD |
| HbA1c >9% | +8 | Poorly controlled DM |

#### Risk Level Thresholds

| Score | Risk Level |
|---|---|
| 0–19 | Low |
| 20–39 | Moderate |
| 40–64 | High |
| 65–100 | Critical |

#### Risk Score Mapping

```
Stroke Risk     = min(95, score × 0.82 + 5)
MACE Risk       = min(95, score × 0.78 + 5)
Progression Risk = min(95, score × 0.86 + 5)
```

#### ML Trend (Linear Regression)

ใช้ Linear Regression บน SBP time-series เพื่อ:
- คำนวณ slope (mmHg/visit)
- คาดการณ์ SBP 1 เดือนและ 3 เดือนข้างหน้า
- แสดง Trend Line บน SVG chart

```typescript
// Linear Regression implementation
function linReg(ys: number[]) {
  const n = ys.length
  const mx = (n - 1) / 2
  const my = mean(ys)
  const m  = Σ((x - mx)(y - my)) / Σ(x - mx)²
  const b  = my - m * mx
  return { m, b, predict: (x) => m * x + b }
}
```

---

## 6. Medication Decision Engine

### ไฟล์: `src/lib/cardio/medicationEngine.ts`

ระบบใช้ Rule-based Logic ตรวจสอบเงื่อนไขตามลำดับความสำคัญ:

```
Priority 1: REDUCE          (Safety override: hypotension / bradycardia)
Priority 2: URGENT_REVIEW   (Critical risk / SBP ≥180 / multiple comorbidities)
Priority 3: INTENSIFY       (Above target + High risk / Increasing trend)
Priority 4: CONTINUE        (Controlled BP + non-High risk)
Priority 5: MONITOR         (Borderline / watchful waiting)
```

### Recommendation Types

| Type | ความหมาย | เงื่อนไขหลัก |
|---|---|---|
| `CONTINUE` | คงยาเดิม | SBP ≤ target+5, risk ≠ High/Critical |
| `INTENSIFY` | เพิ่มโดส/กลุ่มยา | SBP > target+8 + High risk / Increasing |
| `REDUCE` | ลดโดส | SBP <100 หรือ DBP <62 หรือ HR <55 |
| `SWITCH` | เปลี่ยนกลุ่มยา | (ขยายในอนาคต) |
| `MONITOR` | ติดตามใกล้ชิด | Borderline BP |
| `URGENT_REVIEW` | พบแพทย์ด่วน | Critical / SBP ≥180 / HF+High BP |

### Safety Checks

```
ถ้า Potassium > 5.0 → Warning: ระวัง ACEI/ARB
ถ้า eGFR < 45     → Warning: ปรับขนาดยาตาม renal function
ถ้า อายุ ≥ 70     → Warning: เสี่ยงหกล้มจากความดันต่ำ
```

### Drug Conflict Checks (ยาที่ไม่ควรใช้ร่วมกัน)

| คู่ยา | เหตุผล |
|---|---|
| ACEI + ARB | Dual RAS blockade — ไตวาย, hyperkalemia |
| Beta-blocker + CCB (Non-DHP) | Bradycardia / Heart block |

---

## 7. ข้อมูลทดสอบ (Mock Patients)

| ID | เลขบัตร | ชื่อ | อายุ | Risk | Recommendation | หมายเหตุ |
|---|---|---|---|---|---|---|
| P001 | 1100101234561 | นาย สมชาย ใจดี | 67 | **High** | INTENSIFY | BP วันนี้แล้ว (read-only) |
| P002 | 1100205678902 | นาง สุดา รักสุขภาพ | 55 | Moderate | CONTINUE | ต้องกรอก BP วันนี้ |
| P003 | 1100309876543 | นาย ประเสริฐ มีสุข | 72 | **Critical** | URGENT_REVIEW | 4 โรคร่วม, SBP 180 |
| P004 | 1100412345674 | นางสาว พิมพ์ใจ แสงทอง | 48 | Low | CONTINUE | ควบคุมดี |
| P005 | 1100515678905 | นาง วันเพ็ญ สุขสวัสดิ์ | 78 | Moderate | **REDUCE** | SBP ต่ำ, HR ต่ำ |

---

## 8. การติดตั้งและรัน

### Prerequisites
- Node.js 18+
- npm 9+

### ขั้นตอน

```bash
# 1. Clone / เปิดโปรเจค
cd genomicweb-V1

# 2. ติดตั้ง dependencies (ถ้ายังไม่ได้ทำ)
npm install

# 3. Copy environment variables
cp .env.example .env.local
# แก้ไข NEXT_PUBLIC_SUPABASE_URL และ NEXT_PUBLIC_SUPABASE_ANON_KEY

# 4. Run development server
npm run dev

# 5. เปิดเบราว์เซอร์
open http://localhost:3000
```

### Demo Account
```
Username: doctor1
Password: 1234
```

---

## 9. การเชื่อมต่อ Supabase จริง

ปัจจุบัน Prototype ใช้ **Mock Data** ใน `src/lib/cardio/mockData.ts`

เพื่อเชื่อมต่อ Supabase จริง:

### 1. สร้าง Tables ใน Supabase SQL Editor
คัดลอก SQL จาก [Section 4](#4-database-schema) และ run ใน Supabase

### 2. อัปเดต `.env.local`
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. แทนที่ `findPatientByNationalId()` ด้วย Supabase query

```typescript
// src/lib/cardio/supabaseData.ts
import { createClient } from '@supabase/supabase-js'

export async function findPatientByNationalId(nationalId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data, error } = await supabase
    .from('patients')
    .select(`
      *,
      visits (*),
      labs (*),
      comorbidities (*),
      medications (*)
    `)
    .eq('national_id', nationalId)
    .single()

  if (error || !data) return null
  return mapSupabaseToCardioPatient(data)
}
```

### 4. แทนที่ `handleSave()` ด้วย Supabase insert

```typescript
// ใน SummaryPage.tsx
const handleSave = async () => {
  const { error } = await supabase
    .from('doctor_records')
    .insert({
      patient_id: patient.id,
      doctor_id: doctorName,
      clinical_notes: notes,
      next_appt_date: apptDate,
      medications: meds,
      ref_id: refId,
    })
}
```

---

## 10. Road Map สู่ Production

### Phase 1 — Supabase Integration ✅ (Prototype Done)
- [x] Mock data structure ตรงกับ DB schema
- [x] Type definitions ครบถ้วน
- [ ] เชื่อมต่อ Supabase จริง
- [ ] Authentication ด้วย Supabase Auth

### Phase 2 — ML Model Integration
- [ ] FastAPI backend สำหรับ XGBoost model
- [ ] Feature engineering pipeline (BPV, Cumulative SBP, Trend)
- [ ] Model serving endpoint: `POST /api/predict-risk`
- [ ] Replace TypeScript rule engine ด้วย ML prediction

### Phase 3 — HIS Integration
- [ ] HL7 FHIR connector
- [ ] Real-time data sync จาก HIS
- [ ] ส่งคำสั่งการรักษากลับ HIS
- [ ] Audit logging

### Phase 4 — Clinical Features
- [ ] PDF report generation
- [ ] Line OA notification สำหรับผู้ป่วย
- [ ] Role-based access (แพทย์ / พยาบาล / pharmacist)
- [ ] Multi-patient dashboard
- [ ] Batch risk screening

---

## 11. ข้อจำกัดและคำเตือน

```
⚠️  ระบบนี้เป็น PROTOTYPE เพื่อการศึกษาและพัฒนาเท่านั้น

⚕️  ห้ามนำไปใช้ในการดูแลผู้ป่วยจริงโดยไม่ผ่านการ Validate
    ทางคลินิกและได้รับการอนุมัติจากคณะกรรมการที่เกี่ยวข้อง

🤖  Risk Score และ Medication Recommendation เป็นเพียง
    "ข้อมูลประกอบการตัดสินใจ" — การตัดสินใจขั้นสุดท้าย
    เป็นความรับผิดชอบของแพทย์ผู้ดูแลเสมอ

🔒  ข้อมูลผู้ป่วยเป็นข้อมูลส่วนบุคคลที่ต้องได้รับการคุ้มครอง
    ตาม PDPA และนโยบายของสถาบัน
```

---

## Authors & Version

| รายการ | ข้อมูล |
|---|---|
| Version | 1.0.0-prototype |
| Stack | Next.js 16 · TypeScript · Supabase |
| Design System | Custom CSS Modules (Green Healthcare Theme) |
| Charts | Inline SVG (no external chart library) |
| AI Engine | Rule-based + Linear Regression (Prototype) |

---

*CardioGuard AI — Empowering Physicians, Not Replacing Them* 🫀
