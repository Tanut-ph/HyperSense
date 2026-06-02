# HyperSense — เอกสารระบบ
### ระบบช่วยตัดสินใจทางคลินิก — ความดันโลหิตสูงและความเสี่ยงโรคหัวใจ

> **ประเภท:** Clinical Decision Support System (CDSS)  
> **Stack:** Next.js 15 · TypeScript · Supabase · Python XGBoost  
> **วันที่:** มิถุนายน 2569

---

## สารบัญ

1. [ภาพรวมระบบ](#1-ภาพรวมระบบ)
2. [User Roles และสิทธิ์](#2-user-roles-และสิทธิ์)
3. [User Flow (5 Steps)](#3-user-flow-5-steps)
4. [โครงสร้างไฟล์](#4-โครงสร้างไฟล์)
5. [Risk Engine](#5-risk-engine)
6. [Medication Decision Engine](#6-medication-decision-engine)
7. [ML Engine (XGBoost + SHAP)](#7-ml-engine-xgboost--shap)
8. [ยา 7 กลุ่มหลัก](#8-ยา-7-กลุ่มหลัก)
9. [ผลตรวจทางห้องปฏิบัติการ](#9-ผลตรวจทางห้องปฏิบัติการ)
10. [Database Schema](#10-database-schema)
11. [การติดตั้งและรัน](#11-การติดตั้งและรัน)
12. [การเชื่อมต่อ Supabase](#12-การเชื่อมต่อ-supabase)
13. [ข้อจำกัดและคำเตือน](#13-ข้อจำกัดและคำเตือน)

---

## 1. ภาพรวมระบบ

HyperSense เป็นเว็บแอปพลิเคชันสำหรับบุคลากรทางการแพทย์ ช่วยวิเคราะห์ผู้ป่วยความดันโลหิตสูงจากข้อมูล EMR และแนะนำแนวทางการรักษาด้วย Machine Learning

| ความสามารถ | รายละเอียด |
|---|---|
| ค้นหาผู้ป่วย | ค้นหาจากรหัสผู้ป่วย |
| ข้อมูลผู้ป่วย | ประวัติการรักษา ยา โรคร่วม ผล Lab |
| บันทึก BP วันนี้ | พยาบาลกรอกค่าความดัน, เทคนิคการแพทย์กรอกผลแลป |
| BP Trend | กราฟ SBP/DBP + Linear Regression |
| ML Risk Prediction | XGBoost ประเมิน HF / Stroke / CAD / CKD / AF |
| Medication Support | แนะนำยา 7 กลุ่ม + ตรวจสอบยาที่ขัดแย้งกัน |
| สรุปและบันทึก | แก้ไขยา + วันนัดพบ + บันทึกลง Supabase |

### สิ่งที่ระบบไม่ทำ
- ไม่สั่งยาแทนแพทย์
- ไม่ตัดสินใจทางคลินิกโดยอัตโนมัติ
- คำแนะนำ AI เป็นเพียงข้อมูลประกอบการตัดสินใจ

---

## 2. User Roles และสิทธิ์

| Role | Username (Demo) | สิทธิ์ |
|---|---|---|
| แพทย์ (doctor) | doctor1, doctor2 | เข้าถึงทุกส่วน แก้ไขยา บันทึกข้อมูล |
| พยาบาล (nurse) | nurse1 | กรอกค่าความดันโลหิตประจำวัน |
| เทคนิคการแพทย์ (medtech) | medtech1 | บันทึกผลตรวจทางห้องปฏิบัติการ |

รหัสผ่านทุกบัญชี Demo: `1234`

---

## 3. User Flow (5 Steps)

```
[Login] → [Step 1: ค้นหาผู้ป่วย] → [Step 2: ข้อมูลผู้ป่วย]
→ [Step 3: BP Trend] → [Step 4: ML Risk + แนะนำยา] → [Step 5: สรุปและบันทึก]
```

### Step 1 — ค้นหาผู้ป่วย (PatientSearchPage)
- กรอกรหัสผู้ป่วย 5-7 หลัก
- ดึงข้อมูลจาก Supabase (หรือ Mock Data ถ้าไม่มี env)

### Step 2 — ข้อมูลผู้ป่วย (PatientDetailPage)
- Card ข้อมูลพื้นฐาน (ชื่อ อายุ เพศ แพทย์ผู้ดูแล)
- Grid ค่าแลป: BMI, HbA1c, eGFR, LDL, Creatinine, Potassium
- โรคร่วม (Comorbidities)
- ยาที่ใช้ปัจจุบัน
- **พยาบาล**: ฟอร์มกรอก SBP / DBP / HR / น้ำหนัก
- **เทคนิคการแพทย์**: ฟอร์มบันทึกผลตรวจ 15 รายการ (6 กลุ่ม)
- ประวัติ Visit: แสดง visit แรก + ล่าสุด (ขยายได้ดูทั้งหมด)

### Step 3 — BP Trend (BPTrendPage)
- กราฟ SBP/DBP timeline (SVG)
- Linear Regression Trend Line
- คาดการณ์ SBP ใน 1 เดือนและ 3 เดือน

### Step 4 — ML Risk + แนะนำยา (RiskMedicationPage)
- Overall Cardiovascular Risk Level (ภาษาไทย)
- Score Cards: Stroke Risk % / MACE Risk % / HTN Progression %
- ML Risk Analysis (XGBoost + SHAP หรือ Rule-based fallback)
- แนวทางการปรับยา (CONTINUE / INTENSIFY / REDUCE / SWITCH / MONITOR)
- ปัจจัยที่ส่งผลต่อความเสี่ยง (Risk Factors ranked by weight)

### Step 5 — สรุปและบันทึก (SummaryPage)
- สรุป Patient Card + Risk Level + คำแนะนำ
- **แพทย์**: แก้ไขยา (7 กลุ่ม, dropdown ชื่อยาตามกลุ่ม, dropdown ความถี่)
- ช่องวันนัดพบ (บังคับกรอก) + ปุ่มลัด 1/2 สัปดาห์ / 1/3 เดือน
- Validation: ต้องกรอกทุกช่องในยา + วันนัดพบก่อนบันทึก
- บันทึกลง Supabase หรือ Session (Demo mode) + แสดง Ref ID

---

## 4. โครงสร้างไฟล์

```
HyperSense/
├── src/
│   ├── app/
│   │   ├── page.tsx                 ← Main controller (step routing 1–6)
│   │   ├── layout.tsx
│   │   └── globals.css              ← CSS variables (colors, spacing)
│   ├── components/
│   │   ├── Header.tsx               ← Logo + user info + logout
│   │   ├── Header.module.css
│   │   ├── LoginPage.tsx            ← Login form (role selection)
│   │   ├── Login.module.css
│   │   ├── StepIndicator.tsx        ← Progress bar 5 steps
│   │   ├── StepIndicator.module.css
│   │   ├── PatientSearchPage.tsx    ← Step 1
│   │   ├── PatientDetailPage.tsx    ← Step 2 (BP + Lab entry by role)
│   │   ├── BPTrendPage.tsx          ← Step 3 (SVG chart + regression)
│   │   ├── RiskMedicationPage.tsx   ← Step 4 (ML + risk + medication)
│   │   ├── SummaryPage.tsx          ← Step 5 (edit + save)
│   │   └── HyperSense.module.css   ← Shared component styles
│   └── lib/
│       ├── supabase.ts              ← Supabase browser client
│       ├── supabaseData.ts          ← Supabase CRUD (patients, visits, records)
│       ├── types.ts                 ← TypeScript interfaces
│       ├── mockData.ts              ← Demo patients (fallback)
│       ├── riskEngine.ts            ← Weighted Risk Score Calculator
│       ├── medicationEngine.ts      ← Medication recommendation engine
│       └── mlEngine.ts             ← ML API client + rule-based fallback
├── ml/
│   ├── api.py                       ← FastAPI server (POST /predict)
│   ├── train.py                     ← XGBoost training + SMOTE
│   ├── predict.py                   ← SHAP explainability
│   ├── feature_engineering.py       ← Feature builder (~80 features)
│   ├── requirements.txt
│   └── models/                      ← สร้างอัตโนมัติเมื่อ train
│       ├── model_hf.joblib
│       ├── model_stroke.joblib
│       ├── model_cad.joblib
│       ├── model_ckd.joblib
│       └── model_atrial_fibrillation.joblib
├── public/
│   └── logo_hypersense.png                     ← โลโก้ HyperSense
├── supabase/
│   └── schema.sql
├── HYPERSENSE.md                    ← เอกสารระบบ (ไฟล์นี้)
└── README.md
```

---

## 5. Risk Engine

**ไฟล์:** `src/lib/riskEngine.ts`

ใช้ Weighted Feature Scoring คำนวณ:

| Output | คำอธิบาย |
|---|---|
| avgSBP / avgDBP | ค่าเฉลี่ยความดัน |
| bpVariability | ความผันผวน SBP |
| bpTrend | Increasing / Decreasing / Stable |
| strokeRisk % | ความเสี่ยง Stroke 5-year |
| maceRisk % | Major Adverse CV Events |
| progressionRisk % | Hypertension worsening |
| riskLevel | Low / Moderate / High / Critical |
| riskFactors[] | ปัจจัยพร้อม weight (ranked) |

### Risk Level Thresholds

| Score | Level |
|---|---|
| 0–19 | Low |
| 20–39 | Moderate |
| 40–64 | High |
| 65+ | Critical |

---

## 6. Medication Decision Engine

**ไฟล์:** `src/lib/medicationEngine.ts`

ประเมิน Recommendation Type ตามลำดับ Priority:

```
Priority 1: REDUCE          (hypotension SBP<100 / bradycardia HR<55)
Priority 2: URGENT_REVIEW   (Critical risk / SBP≥180 / HF+High BP)
Priority 3: INTENSIFY       (SBP > target + High/Critical risk)
Priority 4: CONTINUE        (SBP ≤ target+5, non-High risk)
Priority 5: MONITOR         (borderline BP)
```

### Drug Conflict Map

| คู่ยา | เหตุผล |
|---|---|
| ACEI + ARB | Dual RAS blockade — ไตวาย, hyperkalemia |
| ACEI + ARNI | ต้องหยุด ACEI ≥36 ชม. ก่อนเริ่ม ARNI |
| CCB-NonDHP + Beta-blocker | Bradycardia / Heart block |

---

## 7. ML Engine (XGBoost + SHAP)

**ไฟล์:** `src/lib/mlEngine.ts` (client) | `ml/` (server)

### โหมด API
- เรียก `POST /predict` ที่ FastAPI (`NEXT_PUBLIC_ML_API_URL`)
- Models: XGBoost ต่อ target (HF, Stroke, CAD, CKD, AF)
- Validation: 5-fold Stratified CV + SMOTE + Platt Scaling
- Explainability: SHAP TreeExplainer (top 5 features)

### โหมด Rule-based Fallback
- ทำงานอัตโนมัติเมื่อไม่มี ML API
- ใช้เงื่อนไข clinical rule สำหรับแต่ละ condition

### ML Performance (ตัวอย่าง)
```
hf                  AUROC=0.821  AUPRC=0.643
stroke              AUROC=0.784  AUPRC=0.512
cad                 AUROC=0.798  AUPRC=0.601
ckd                 AUROC=0.856  AUPRC=0.712
atrial_fibrillation AUROC=0.773  AUPRC=0.489
```

---

## 8. ยา 7 กลุ่มหลัก

| กลุ่ม | ชื่อยาในระบบ | Indication หลัก |
|---|---|---|
| ACEI | Enalapril, Captopril, Lisinopril, Ramipril, Perindopril | ความดันสูง / ไตจากเบาหวาน / HF |
| ARB | Losartan, Valsartan, Irbesartan, Candesartan, Telmisartan, Olmesartan | แทน ACEI กรณีไอแห้ง / HF / CKD |
| CCB-DHP | Amlodipine, Nifedipine, Felodipine, Lercanidipine | ลดความดัน / ขยายหลอดเลือด |
| CCB-NonDHP | Verapamil, Diltiazem | ลดความดัน + ลด HR / AF |
| Beta-blocker | Atenolol, Metoprolol, Bisoprolol, Carvedilol, Propranolol, Nebivolol | HF / หัวใจเต้นเร็ว / หลัง MI |
| Diuretic-Thiazide | Hydrochlorothiazide (HCTZ), Chlorthalidone, Indapamide | First-line / ความดันสูงทั่วไป |
| Diuretic-Loop | Furosemide, Bumetanide, Torasemide | บวมน้ำ / HF / CKD stage 3+ |

---

## 9. ผลตรวจทางห้องปฏิบัติการ

สำหรับบทบาทเทคนิคการแพทย์ — บันทึกได้ใน Step 2:

| กลุ่ม | รายการ | ค่าปกติ (อ้างอิง) |
|---|---|---|
| น้ำตาลและเบาหวาน | FPG (mg/dL), HbA1c (%) | FPG <126, HbA1c <7% |
| ผลตรวจปัสสาวะและไต | uACR (mg/g), Creatinine (mg/dL), eGFR | uACR <30, Cr <1.3, eGFR ≥60 |
| ไขมันในเลือด | LDL, HDL, Triglyceride, Total Cholesterol | LDL <130, HDL >40, TG <150 |
| เกลือแร่ | Potassium K⁺ (mEq/L), Sodium Na⁺ (mEq/L) | K 3.5–5.0, Na 135–145 |
| ความสมบูรณ์ของเลือด (CBC) | Hemoglobin (g/dL), WBC (×10³/µL) | Hb >12, WBC 4–10 |
| ค่าหัวใจขั้นสูง | Troponin (ng/mL), NT-proBNP (pg/mL) | Troponin <0.04, BNP <125 |

---

## 10. Database Schema

```sql
-- ผู้ป่วย
CREATE TABLE patients (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_code TEXT UNIQUE NOT NULL,
  national_id  TEXT UNIQUE NOT NULL,
  full_name    TEXT NOT NULL,
  age          INTEGER,
  sex          TEXT CHECK (sex IN ('ชาย','หญิง')),
  bp_target    INTEGER DEFAULT 130,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ค่าความดันโลหิต
CREATE TABLE bp_visits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  UUID REFERENCES patients(id),
  visit_date  DATE NOT NULL,
  sbp         INTEGER NOT NULL,
  dbp         INTEGER NOT NULL,
  heart_rate  INTEGER,
  weight_kg   NUMERIC(5,1),
  bmi         NUMERIC(4,1),
  recorded_by TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ผลตรวจแลป
CREATE TABLE labs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  UUID REFERENCES patients(id),
  lab_date    DATE NOT NULL,
  hba1c       NUMERIC(4,1),
  fpg         NUMERIC(5,1),
  ldl         NUMERIC(5,1),
  hdl         NUMERIC(5,1),
  tg          NUMERIC(5,1),
  chol        NUMERIC(5,1),
  creatinine  NUMERIC(4,2),
  egfr        NUMERIC(5,1),
  potassium   NUMERIC(4,2),
  sodium      NUMERIC(5,1),
  uacr        NUMERIC(6,1),
  hemoglobin  NUMERIC(4,1),
  wbc         NUMERIC(5,2),
  troponin    NUMERIC(6,3),
  pro_bnp     NUMERIC(8,1)
);

-- บันทึกการรักษาของแพทย์
CREATE TABLE doctor_records (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id     UUID REFERENCES patients(id),
  doctor_id      TEXT,
  clinical_notes TEXT,
  next_appt_date DATE,
  appt_note      TEXT,
  medications    JSONB,
  ref_id         TEXT UNIQUE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 11. การติดตั้งและรัน

### Frontend (Next.js)
```bash
npm install
npm run dev
# http://localhost:3000
```

### ML Backend (FastAPI) — optional
```bash
cd ml
pip install -r requirements.txt
python train.py --data "path/to/data.xlsx"
uvicorn api:app --host 0.0.0.0 --port 8000 --reload
```

### Environment Variables
```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_ML_API_URL=http://localhost:8000   # optional
```

---

## 12. การเชื่อมต่อ Supabase

1. สร้าง Tables ด้วย SQL ใน Section 10
2. ตั้งค่า `.env.local` ด้วย URL และ Anon Key
3. ระบบตรวจสอบ `NEXT_PUBLIC_SUPABASE_URL` อัตโนมัติ — ถ้าไม่มีจะใช้ Mock Data

---

## 13. ข้อจำกัดและคำเตือน

```
⚠️  ระบบนี้เป็น PROTOTYPE เพื่อการศึกษาและพัฒนาเท่านั้น

⚕️  ห้ามนำไปใช้ในการดูแลผู้ป่วยจริงโดยไม่ผ่านการ Validate
    ทางคลินิกและได้รับการอนุมัติจากคณะกรรมการที่เกี่ยวข้อง

🤖  Risk Score และ Medication Recommendation เป็นเพียง
    ข้อมูลประกอบการตัดสินใจ — การตัดสินใจขั้นสุดท้าย
    เป็นความรับผิดชอบของแพทย์ผู้ดูแลเสมอ

🔒  ข้อมูลผู้ป่วยเป็นข้อมูลส่วนบุคคลที่ต้องได้รับการคุ้มครอง
    ตาม PDPA และนโยบายของสถาบัน
```

| รายการ | ข้อมูล |
|---|---|
| Version | 1.0.0-prototype |
| Stack | Next.js 15 · TypeScript · Supabase |
| Charts | Inline SVG (ไม่ใช้ external library) |
| ML | XGBoost + SHAP (FastAPI) / Rule-based fallback |

---

*HyperSense — Empowering Physicians, Not Replacing Them*
