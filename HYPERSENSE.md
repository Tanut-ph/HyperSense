# HyperSense — เอกสารระบบ
### ระบบช่วยตัดสินใจทางคลินิก — ความดันโลหิตสูงและความเสี่ยงโรคหัวใจและหลอดเลือด

> **ประเภท:** Clinical Decision Support System (CDSS)
> **Stack:** Next.js 16 · TypeScript · Supabase (PostgreSQL) · Python FastAPI + XGBoost
> **อัปเดต:** มิถุนายน 2569

---

## สารบัญ
1. [ภาพรวมระบบ](#1-ภาพรวมระบบ)
2. [บทบาทผู้ใช้และสิทธิ์](#2-บทบาทผู้ใช้และสิทธิ์)
3. [ขั้นตอนการใช้งาน (แยกตามบทบาท)](#3-ขั้นตอนการใช้งาน)
4. [โครงสร้างไฟล์](#4-โครงสร้างไฟล์)
5. [ตัวแปร / Data Model](#5-ตัวแปร--data-model)
6. [ยาความดัน 7 กลุ่ม + การใช้ร่วม](#6-ยาความดัน-7-กลุ่ม)
7. [การวิเคราะห์ความเสี่ยงเชิงคลินิก](#7-การวิเคราะห์ความเสี่ยง)
8. [ML Backend (XGBoost)](#8-ml-backend)
9. [ฐานข้อมูลและ SQL](#9-ฐานข้อมูลและ-sql)
10. [การติดตั้งและรัน](#10-การติดตั้งและรัน)
11. [ข้อจำกัดและคำเตือน](#11-ข้อจำกัด)

---

## 1. ภาพรวมระบบ

HyperSense เป็นเว็บแอปสำหรับบุคลากรทางการแพทย์ ช่วยดูแลผู้ป่วยความดันโลหิตสูงโดยรวมข้อมูลไว้ที่เดียว
แพทย์เห็น **ประวัติและข้อมูลสำคัญทั้งหมด** (ไม่ใช่แค่ค่าความดันวันนี้) เพื่อประกอบการตัดสินใจปรับยาและนัดหมาย

| ความสามารถ | รายละเอียด |
|---|---|
| ค้นหาผู้ป่วย | จากรหัสผู้ป่วย (ดึงจาก Supabase) |
| บันทึกค่าตามบทบาท | พยาบาลกรอกความดัน/สัญญาณชีพ · เทคนิคการแพทย์กรอกผลแลป — **แก้ไขได้หลังกดยืนยัน** |
| ประวัติ + ข้อมูลสำคัญ | โรคร่วม ASCVD เบาหวาน ไต สูบบุหรี่ ดื่มเหล้า ตั้งครรภ์ ผ่าตัด ฯลฯ |
| BP Trend | กราฟ SBP/DBP + เส้นแนวโน้ม (Linear Regression) |
| วิเคราะห์ความเสี่ยง | ระดับความเสี่ยง + Stroke/MACE/Progression (rule-based โปร่งใส หรือ XGBoost เมื่อเชื่อมต่อ) |
| คำแนะนำยา | ยา 7 กลุ่ม + เตือนยาตีกัน/ซ้ำกลุ่ม + ข้อห้ามในผู้ป่วยพิเศษ |
| สรุปและบันทึก | แพทย์ปรับยา + วันนัด (ที่เดียว) + บันทึกลง Supabase |

### สิ่งที่ระบบไม่ทำ
- ไม่สั่งยาแทนแพทย์ · ไม่ตัดสินใจทางคลินิกอัตโนมัติ
- คำแนะนำทั้งหมดเป็น *ข้อมูลประกอบการตัดสินใจ* เท่านั้น

---

## 2. บทบาทผู้ใช้และสิทธิ์

| บทบาท | Staff ID (Demo) | สิทธิ์ |
|---|---|---|
| แพทย์ (doctor) | DR001, DR002, DR003 | เห็นข้อมูลครบ · วิเคราะห์ความเสี่ยง · แก้ไขยา/นัดหมาย · บันทึกการรักษา |
| พยาบาล (nurse) | NR001 | ค้นหาผู้ป่วย · กรอก/แก้ไขค่าความดันและสัญญาณชีพ → จบ |
| เทคนิคการแพทย์ (medtech) | MT001 | ค้นหาผู้ป่วย · กรอก/แก้ไขผลแลป → จบ |

รหัสผ่านทุกบัญชี Demo: `1234`
> **หมายเหตุ:** ระบบไม่มีแนวคิด "แพทย์ผู้ดูแล (treating doctor)" แล้ว — แพทย์ทุกคนที่ล็อกอินสามารถดูแลและบันทึกได้

---

## 3. ขั้นตอนการใช้งาน

```
[Login] → [ค้นหาผู้ป่วย] → แยกตามบทบาท
```

**พยาบาล / เทคนิคการแพทย์ (2 ขั้น):**
```
ค้นหาผู้ป่วย → กรอก/แก้ไขข้อมูลของบทบาทตน → กด "บันทึกและเสร็จสิ้น"
```
- กดยืนยันแล้วยัง **แก้ไขซ้ำได้** (กดปุ่ม "แก้ไข") — ระบบ upsert ค่าของวันเดียวกัน

**แพทย์ (5 ขั้น):**
```
ค้นหาผู้ป่วย → ข้อมูล+ประวัติสำคัญ → BP Trend → วิเคราะห์ความเสี่ยง+แนะนำยา → สรุปและบันทึก
```
- หน้าข้อมูลผู้ป่วยมีการ์ด **"ประวัติและข้อมูลสำคัญ"** (โรคร่วม ASCVD ไลฟ์สไตล์ ตั้งครรภ์ ผ่าตัด ฯลฯ)
- หน้าสรุป: แก้ไขยา (ห้ามซ้ำกลุ่ม/ห้ามยาตีกัน) + **วันนัดครั้งต่อไป (มีที่เดียว)** + บันทึกลง Supabase

---

## 4. โครงสร้างไฟล์

```
HyperSense/
├── src/
│   ├── app/page.tsx                 ← Controller: ล็อกอิน + routing ตามบทบาท
│   ├── components/
│   │   ├── LoginPage.tsx            ← เข้าสู่ระบบด้วย Staff ID
│   │   ├── StepIndicator.tsx        ← progress bar (ปรับตามบทบาท)
│   │   ├── PatientSearchPage.tsx    ← ค้นหาผู้ป่วย (Supabase เท่านั้น)
│   │   ├── PatientDetailPage.tsx    ← ข้อมูล + ประวัติ + กรอกค่าตามบทบาท (BP/Lab แก้ไขได้)
│   │   ├── BPTrendPage.tsx          ← กราฟแนวโน้มความดัน
│   │   ├── RiskMedicationPage.tsx   ← วิเคราะห์ความเสี่ยง + แนะนำยา
│   │   └── SummaryPage.tsx          ← แพทย์: แก้ยา + นัดหมาย + บันทึก
│   └── lib/
│       ├── supabase.ts              ← Supabase client
│       ├── supabaseData.ts          ← CRUD (fetch/saveVisit/saveLab/saveDoctorRecord)
│       ├── types.ts                 ← TypeScript types (ตรงกับ data dictionary)
│       ├── medicationGuide.ts       ← ฐานความรู้ยา 7 กลุ่ม + interactions + ผู้ป่วยพิเศษ
│       ├── riskEngine.ts            ← คำนวณระดับความเสี่ยง (rule-based)
│       ├── medicationEngine.ts      ← แนวทางปรับยา (CONTINUE/INTENSIFY/...)
│       └── mlEngine.ts             ← เรียก FastAPI /predict + fallback
├── ml/                              ← Python ML backend (FastAPI + XGBoost)
│   ├── api.py · predict.py · train.py · feature_engineering.py
│   ├── Dockerfile · render.yaml     ← พร้อม deploy
│   └── models/                      ← โมเดลที่เทรนแล้ว (สร้างเมื่อรัน train.py)
├── database/
│   └── reset_and_seed.sql           ← ★ ไฟล์เดียวจบ: ลบเก่า + สร้างตาราง + ใส่ข้อมูล
├── HYPERSENSE.md · README.md · SOLUTION.md
```
> หมายเหตุ: ไม่มี `mockData.ts` แล้ว — ระบบใช้ข้อมูลจาก **Supabase เท่านั้น**

---

## 5. ตัวแปร / Data Model

ตัวแปรตั้งชื่อให้ตรงกับ **data dictionary** ของชุดข้อมูลความดันโลหิตสูง

### สัญญาณชีพ (vitalsign_*)
`sbp · dbp · heartRate(hr) · weight(wt) · bmi · resp · o2sat · temp`

### ผลแลป (lab_*)
| กลุ่ม | ตัวแปร |
|---|---|
| น้ำตาล/เบาหวาน | fpg, hba1c |
| ไขมัน | ldl, hdl, tg, chol |
| ไต/ปัสสาวะ | creatinine, egfr, uacr, upcr, proteinUrine24 |
| เกลือแร่/เมตาบอลิก | potassium, sodium, calcium, co2, cl, po4, uric |
| CBC | hemoglobin, hematocrit, wbc, platelet |
| ไทรอยด์ | t3, t4 |
| หัวใจขั้นสูง | troponin, proBNP |

### โรคร่วม (co_*)
`diabetes(dm) · ckd · cad · heartFailure(hf) · stroke · pad · plaque · af · arrhythmias · dementia · dyslipidemia`
> กลุ่ม **ASCVD** = cad + stroke + pad + plaque

### ยา (med_*)
`Diuretic · ACEI · ARB · CCB · Beta-blocker · Alpha-blocker · Alpha2-Agonist · ARNI · Alpha-Beta-blocker · Direct-Vasodilator`

### ประวัติซักถาม (PatientProfile)
`htDurationYears · dmType · dmDiagnosisYear · dmDurationYears · ckdDurationYears · heightCm · waistCm · centralObesity · smokingStatus · smokingYears · alcohol · pregnant · recentSurgery · importantNotes`

---

## 6. ยาความดัน 7 กลุ่ม

ฐานข้อมูลอยู่ใน `src/lib/medicationGuide.ts` แต่ละกลุ่มมี: ชื่อยา · ผลข้างเคียง · ยาที่ห้าม/ควรระวังเมื่อใช้ร่วม · ยาที่ใช้ร่วมเสริมฤทธิ์ · ข้อห้ามตั้งครรภ์

| กลุ่ม | ตัวอย่างยา | ผลข้างเคียงเด่น | ห้าม/ระวังใช้ร่วม |
|---|---|---|---|
| **Diuretic** | HCTZ, Furosemide, Spironolactone | ปัสสาวะบ่อย, K ผิดปกติ, กรดยูริกสูง | NSAIDs, Lithium |
| **ACEI** | Enalapril, Ramipril, Lisinopril | ไอแห้ง, K สูง, angioedema | **ARB, ARNI** (ห้าม), Spironolactone |
| **ARB** | Losartan, Valsartan, Candesartan | เวียนหัว, K สูง (ไม่ไอ) | **ACEI, ARNI** (ห้าม), NSAIDs |
| **CCB** | Amlodipine, Diltiazem, Verapamil | ขาบวม, หน้าแดง, ท้องผูก | Non-DHP + Beta-blocker (หัวใจช้า) |
| **Beta-blocker** | Atenolol, Bisoprolol, Metoprolol | หัวใจช้า, อ่อนเพลีย, บดบังน้ำตาลต่ำ | Verapamil, ผู้ป่วยหอบหืด |
| **Alpha-blocker** | Prazosin, Doxazosin | หน้ามืดเปลี่ยนท่า (มื้อแรก) | PDE5 (Sildenafil) → ช็อก |
| **Alpha2-Agonist** (ออกฤทธิ์ส่วนกลาง) | Methyldopa, Clonidine | ง่วง, ปากแห้ง, rebound เมื่อหยุดยา | หยุดยากะทันหัน |

**กลุ่มเสริม:** ARNI (Sacubitril/Valsartan), Alpha-Beta-blocker (Carvedilol, Labetalol), Direct-Vasodilator (Hydralazine, Minoxidil)

### กลุ่มย่อย (subgroups) + การใช้ร่วม (ตามตารางอ้างอิง)
- **Diuretic:** Thiazide · Loop · K-sparing · Aldosterone antagonist (Spironolactone ระวัง K สูงเมื่อใช้ร่วม ACEI/ARB)
- **CCB:** Dihydropyridine (ใช้ร่วม Alpha-1 blocker ได้) · Non-Dihydropyridine (ห้ามร่วม Beta-blocker)
- **Beta-blocker:** Cardioselective · Non-Selective · Mixed Alpha/Beta (Carvedilol, Labetalol)
- ข้อมูลแต่ละกลุ่มแสดง **"ใช้ร่วมได้ (เสริมฤทธิ์)"** และ **"ใช้ร่วมไม่ได้/ระวัง"** ในหน้าสรุปของแพทย์

### ระบบเตือนอัตโนมัติ
- **ห้ามเลือกยาซ้ำกลุ่มเดิม** และ **ยาที่ห้ามใช้ร่วม (avoid)** จะเลือกไม่ได้ใน dropdown
- เตือนคู่ยาที่ตีกัน (เช่น ACEI+ARB, Non-DHP CCB + Beta-blocker, Clonidine + Beta-blocker)
- **ผู้ป่วยพิเศษ:** ตั้งครรภ์ (ห้าม ACEI/ARB/ARNI → แนะ Methyldopa/Labetalol/Nifedipine/Hydralazine), สูบบุหรี่, ดื่มเหล้า, ผ่าตัด, เกาต์

### แนวทางคำแนะนำ (Recommendation)
`NOTHING` (ผู้ป่วยปกติ — ยังไม่ต้องใช้ยา เน้นปรับพฤติกรรม) · `CONTINUE` (คงยาเดิม / "ดีขึ้น" เมื่อแนวโน้มลดลง) · `INTENSIFY` · `REDUCE` · `MONITOR` · `URGENT_REVIEW`

---

## 7. การวิเคราะห์ความเสี่ยง

**ไฟล์:** `src/lib/riskEngine.ts` (rule-based, โปร่งใส)

คำนวณจาก: SBP เฉลี่ย, ความผันผวน (variability), แนวโน้ม, อายุ, โรคร่วม, ผลแลป → ได้
`riskLevel (Low/Moderate/High/Critical)` + `strokeRisk% / maceRisk% / progressionRisk%` + ปัจจัยเสี่ยงเรียงตามน้ำหนัก

| Score | ระดับ |
|---|---|
| 0–19 | Low | 20–39 | Moderate | 40–64 | High | 65+ | Critical |

> ระบบใช้คำว่า **"การวิเคราะห์เชิงคลินิก"** (ไม่ใช่ "AI") — ทุกผลลัพธ์มีเหตุผลกำกับ ตรวจสอบได้

---

## 8. ML Backend

**ไฟล์:** `ml/` (FastAPI) · client: `src/lib/mlEngine.ts`

- เว็บเรียก `POST {NEXT_PUBLIC_ML_API_URL}/predict` — ส่งประวัติ visit/lab/comorbidity/med
- **โหมด XGBoost:** เมื่อมีโมเดลที่เทรนแล้ว (`ml/models/*.joblib`) → ทำนาย HF/Stroke/CAD/CKD/AF + อธิบายด้วย **SHAP**
- **โหมดเกณฑ์คลินิก (clinical):** เมื่อยังไม่มีโมเดล → `predict.py` ใช้กฎคลินิกตอบผลได้ทันที (response มี `basis` + `model:"clinical"`) จึง **เชื่อมต่อและทำงานได้เสมอ**
- ถ้าเรียก API ไม่ได้เลย → เว็บใช้ rule-based fallback ฝั่ง client

Response แต่ละ risk: `{ condition, probability, severity, shap_top5[], basis[], model }`

---

## 9. ฐานข้อมูลและ SQL

**ไฟล์เดียวจบ:** [`database/reset_and_seed.sql`](database/reset_and_seed.sql)
รันใน Supabase SQL Editor ครั้งเดียว → **ลบตาราง/ข้อมูลเก่า → สร้างตารางใหม่ → ใส่ข้อมูลตัวอย่าง**

ตาราง: `staff · patients · patient_history · patient_comorbidities · patient_medications · bp_visits · patient_labs · doctor_records`

จุดสำคัญ:
- `bp_visits` และ `patient_labs` มี `UNIQUE(patient_id, <date>)` → รองรับ **upsert** (แก้ค่าของวันเดิมได้)
- ไม่มีคอลัมน์ treating_doctor และไม่มีตาราง ai_predictions แล้ว
- ข้อมูลตัวอย่าง 9 คน (รวมเคสตั้งครรภ์ 10009 เพื่อสาธิตการเตือนยา)

---

## 10. การติดตั้งและรัน

### Frontend
```bash
npm install
npm run dev          # http://localhost:3000
```

### ML Backend (FastAPI)
```bash
cd ml
pip install -r requirements.txt
uvicorn api:app --host 0.0.0.0 --port 8000 --reload   # ใช้เกณฑ์คลินิกได้ทันที
# (ออปชัน) python train.py --data "path/to/data.xlsx"  # เทรน XGBoost จริง
```

### Environment (.env.local)
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_ML_API_URL=http://localhost:8000   # ออปชัน
```

### ขั้นตอนเริ่มใช้
1. รัน `database/reset_and_seed.sql` ใน Supabase SQL Editor
2. ตั้งค่า `.env.local`
3. `npm run dev` → ล็อกอินด้วย DR001 / NR001 / MT001 (รหัส 1234)

---

## 11. ข้อจำกัด

```
ระบบนี้เป็น PROTOTYPE เพื่อการศึกษาและพัฒนาเท่านั้น
ห้ามนำไปใช้ดูแลผู้ป่วยจริงโดยไม่ผ่านการ validate ทางคลินิกและการอนุมัติที่เกี่ยวข้อง
ผลการวิเคราะห์และคำแนะนำยาเป็นเพียงข้อมูลประกอบการตัดสินใจ — การตัดสินใจขั้นสุดท้ายเป็นของแพทย์เสมอ
ข้อมูลผู้ป่วยต้องได้รับการคุ้มครองตาม PDPA และนโยบายของสถาบัน
```

| รายการ | ข้อมูล |
|---|---|
| Version | 2.0.0-prototype |
| Stack | Next.js 16 · TypeScript · Supabase · FastAPI + XGBoost |
| ข้อมูล | Supabase เท่านั้น (ไม่มี mock) |
