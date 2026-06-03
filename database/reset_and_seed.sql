-- ============================================================================
-- HyperSense — RESET & SEED (ไฟล์เดียวจบ)
-- ----------------------------------------------------------------------------
-- ไฟล์นี้จะ "ลบข้อมูล/ตารางเก่าทั้งหมด" แล้ว "สร้างตารางใหม่ + ใส่ข้อมูลใหม่"
-- ตัวแปรทั้งหมดตั้งชื่อให้ตรงกับ data dictionary (vitalsign_* / lab_* / co_* / med_*)
--
-- วิธีใช้:  Supabase Dashboard → SQL Editor → วางทั้งไฟล์ → Run
-- PostgreSQL 15+ / Supabase
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── ลบของเก่า (ทั้งของโปรเจกต์นี้และตารางเก่าที่อาจค้างอยู่) ──────────────────
DROP VIEW  IF EXISTS v_patient_summary CASCADE;
DROP VIEW  IF EXISTS v_patients_no_upcoming_appt CASCADE;
DROP TABLE IF EXISTS doctor_records        CASCADE;
DROP TABLE IF EXISTS risk_snapshots        CASCADE;
DROP TABLE IF EXISTS ai_predictions        CASCADE;   -- ตารางเก่า (เลิกใช้)
DROP TABLE IF EXISTS patient_labs          CASCADE;
DROP TABLE IF EXISTS labs                  CASCADE;    -- ชื่อเก่า
DROP TABLE IF EXISTS bp_visits             CASCADE;
DROP TABLE IF EXISTS patient_medications   CASCADE;
DROP TABLE IF EXISTS patient_comorbidities CASCADE;
DROP TABLE IF EXISTS patient_history       CASCADE;
DROP TABLE IF EXISTS patients              CASCADE;
DROP TABLE IF EXISTS staff                 CASCADE;

-- ============================================================================
-- 1. STAFF (บัญชีผู้ใช้งาน) — รหัสผ่านทุกบัญชี: 1234
-- ============================================================================
CREATE TABLE staff (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('doctor', 'nurse', 'medtech')),
  department    TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. PATIENTS (ข้อมูลผู้ป่วย) — ไม่มี "แพทย์ผู้ดูแล" แล้ว
-- ============================================================================
CREATE TABLE patients (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_code   TEXT UNIQUE NOT NULL,          -- รหัสผู้ป่วย 5-7 หลัก
  national_id    TEXT,                          -- ใช้ค้นหาเท่านั้น
  full_name      TEXT NOT NULL,
  age            INT  NOT NULL CHECK (age BETWEEN 0 AND 130),
  sex            TEXT NOT NULL CHECK (sex IN ('ชาย', 'หญิง')),
  bp_target      INT  NOT NULL DEFAULT 130,
  clinical_notes TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. PATIENT_HISTORY (ประวัติซักถาม — ตามแบบฟอร์มซักประวัติ)
-- ============================================================================
CREATE TABLE patient_history (
  patient_id        UUID PRIMARY KEY REFERENCES patients(id) ON DELETE CASCADE,
  ht_duration_years  INT,                         -- ความดันสูงมานานกี่ปี
  ht_duration_months INT CHECK (ht_duration_months BETWEEN 0 AND 11),
  ht_duration_days   INT CHECK (ht_duration_days   BETWEEN 0 AND 30),
  dm_type           TEXT,                         -- ชนิดเบาหวาน
  dm_diagnosis_year INT,                          -- ปีที่วินิจฉัยเบาหวาน (พ.ศ.)
  dm_duration_years INT,
  ckd_duration_years INT,                         -- โรคไตเรื้อรังกี่ปี
  height_cm         NUMERIC(5,1),
  waist_cm          NUMERIC(5,1),                 -- เส้นรอบเอว
  central_obesity   BOOLEAN DEFAULT false,        -- อ้วนลงพุง
  smoking_status    TEXT CHECK (smoking_status IN ('never','former','current')),
  smoking_years     INT,
  smoking_months    INT CHECK (smoking_months BETWEEN 0 AND 11),
  smoking_days      INT CHECK (smoking_days   BETWEEN 0 AND 30),
  alcohol           TEXT CHECK (alcohol IN ('never','occasional','regular','heavy')),
  pregnant          BOOLEAN DEFAULT false,        -- ตั้งครรภ์ (มีผลต่อการเลือกยา)
  recent_surgery    TEXT,                         -- การผ่าตัด/หัตถการ
  drug_allergies    TEXT,                         -- แพ้ยา
  important_notes   TEXT
);

-- ============================================================================
-- 4. PATIENT_COMORBIDITIES (โรคร่วม — ตรงกับ co_*)
-- ============================================================================
CREATE TABLE patient_comorbidities (
  patient_id    UUID PRIMARY KEY REFERENCES patients(id) ON DELETE CASCADE,
  diabetes      BOOLEAN NOT NULL DEFAULT false,   -- co_dm
  ckd           BOOLEAN NOT NULL DEFAULT false,   -- co_ckd
  cad           BOOLEAN NOT NULL DEFAULT false,   -- co_cad (ASCVD)
  heart_failure BOOLEAN NOT NULL DEFAULT false,   -- co_hf
  stroke        BOOLEAN NOT NULL DEFAULT false,   -- co_stroke (ASCVD)
  pad           BOOLEAN NOT NULL DEFAULT false,   -- หลอดเลือดส่วนปลาย (ASCVD)
  plaque        BOOLEAN NOT NULL DEFAULT false,   -- พบ plaque (ASCVD)
  af            BOOLEAN NOT NULL DEFAULT false,   -- co_atrial_fibrillation
  arrhythmias   BOOLEAN NOT NULL DEFAULT false,   -- co_arrhythmias
  dementia      BOOLEAN NOT NULL DEFAULT false,   -- co_dementia
  dyslipidemia  BOOLEAN NOT NULL DEFAULT false    -- ไขมันในเลือดผิดปกติ
);

-- ============================================================================
-- 5. PATIENT_MEDICATIONS (ยา — drug_class ตรงกับ med_*)
-- ============================================================================
CREATE TABLE patient_medications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  drug_class  TEXT NOT NULL CHECK (drug_class IN (
                'Diuretic','ACEI','ARB','CCB','Beta-blocker','Alpha-blocker',
                'Alpha2-Agonist','ARNI','Alpha-Beta-blocker','Direct-Vasodilator')),
  drug_name   TEXT NOT NULL,
  dose        TEXT,
  frequency   TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 6. BP_VISITS (ค่าความดัน + สัญญาณชีพ — vitalsign_*)
-- ============================================================================
CREATE TABLE bp_visits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  visit_date  DATE NOT NULL,
  sbp         INT NOT NULL CHECK (sbp BETWEEN 50 AND 300),   -- vitalsign_sbp_P
  dbp         INT NOT NULL CHECK (dbp BETWEEN 30 AND 200),   -- vitalsign_dbp_P
  heart_rate  INT NOT NULL CHECK (heart_rate BETWEEN 20 AND 250), -- vitalsign_hr_P
  weight_kg   NUMERIC(5,1),                                  -- vitalsign_wt_P
  bmi         NUMERIC(4,1),                                  -- vitalsign_bmi_P
  resp        NUMERIC(4,1),                                  -- vitalsign_resp_P
  o2sat       NUMERIC(4,1),                                  -- vitalsign_o2sat_P
  temp        NUMERIC(4,1),                                  -- vitalsign_temp_P
  note        TEXT,
  recorded_by TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (patient_id, visit_date)                            -- ใช้ upsert (แก้ค่าวันเดิมได้)
);

-- ============================================================================
-- 7. PATIENT_LABS (ผลแลป — lab_*)
-- ============================================================================
CREATE TABLE patient_labs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id       UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  lab_date         DATE NOT NULL,
  -- น้ำตาล/เบาหวาน
  fpg              NUMERIC(6,1), hba1c NUMERIC(4,1),
  -- ไขมัน
  ldl              NUMERIC(6,1), hdl NUMERIC(6,1), tg NUMERIC(6,1), chol NUMERIC(6,1),
  -- ไต/ปัสสาวะ
  creatinine       NUMERIC(5,2), egfr NUMERIC(5,1),
  uacr             NUMERIC(8,2), upcr NUMERIC(8,2), protein_urine_24 NUMERIC(8,1),
  -- เกลือแร่/เมตาบอลิก
  potassium        NUMERIC(4,2), sodium NUMERIC(5,1), calcium NUMERIC(4,1),
  co2              NUMERIC(4,1), cl NUMERIC(5,1), po4 NUMERIC(4,1), uric NUMERIC(4,1),
  -- CBC
  hemoglobin       NUMERIC(4,1), hematocrit NUMERIC(4,1), wbc NUMERIC(6,2), platelet NUMERIC(6,1),
  -- ไทรอยด์
  t3               NUMERIC(6,2), t4 NUMERIC(6,2),
  -- หัวใจขั้นสูง
  troponin         NUMERIC(8,4), pro_bnp NUMERIC(8,1),
  -- UA Dipstick (เชิงคุณภาพ)
  ua_protein TEXT, ua_glucose TEXT, ua_blood TEXT, ua_nitrite TEXT,
  ua_ketone TEXT, ua_leukocyte TEXT, ua_ph TEXT, ua_sg TEXT,
  -- หมายเหตุ
  ecg_note         TEXT, extra_note TEXT,
  recorded_by      TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (patient_id, lab_date)                              -- ใช้ upsert (แก้ค่าวันเดิมได้)
);

-- ============================================================================
-- 8. DOCTOR_RECORDS (บันทึกการตัดสินใจของแพทย์ + snapshot ความเสี่ยง)
-- ============================================================================
CREATE TABLE doctor_records (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id       UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_name      TEXT,
  clinical_notes   TEXT,
  recommendation   TEXT,                          -- CONTINUE / INTENSIFY / REDUCE / SWITCH / MONITOR / URGENT_REVIEW
  risk_level       TEXT,                          -- Low / Moderate / High / Critical
  risk_score       NUMERIC(5,2),
  stroke_risk      INT,
  mace_risk        INT,
  sbp_at_visit     INT,
  dbp_at_visit     INT,
  next_appt_date   DATE,
  appt_note        TEXT,
  ref_id           TEXT UNIQUE,                    -- HS-XXXXXX
  medications_json JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX idx_patients_code          ON patients(patient_code);
CREATE INDEX idx_patients_national_id   ON patients(national_id);
CREATE INDEX idx_bp_visits_patient_date ON bp_visits(patient_id, visit_date DESC);
CREATE INDEX idx_labs_patient_date      ON patient_labs(patient_id, lab_date DESC);
CREATE INDEX idx_doctor_records_patient ON doctor_records(patient_id, created_at DESC);

-- ============================================================================
-- SEED — บัญชีพนักงาน 5 คน
-- ============================================================================
INSERT INTO staff (id, staff_id, password_hash, full_name, role, department) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'DR001', crypt('1234', gen_salt('bf')), 'นพ. วิชาญ สุขใจ',       'doctor',  'อายุรกรรม'),
  ('b0000000-0000-0000-0000-000000000002', 'DR002', crypt('1234', gen_salt('bf')), 'พญ. สมหญิง รักษาดี',    'doctor',  'ต่อมไร้ท่อ'),
  ('b0000000-0000-0000-0000-000000000003', 'DR003', crypt('1234', gen_salt('bf')), 'นพ. ทวีศักดิ์ มีโชค',   'doctor',  'โรคหัวใจ'),
  ('b0000000-0000-0000-0000-000000000004', 'NR001', crypt('1234', gen_salt('bf')), 'น.ส. พรทิพย์ ใจดี',     'nurse',   'การพยาบาล'),
  ('b0000000-0000-0000-0000-000000000005', 'MT001', crypt('1234', gen_salt('bf')), 'นาย ชาญณรงค์ วิชาการ', 'medtech', 'เทคนิคการแพทย์');

-- ============================================================================
-- SEED — ผู้ป่วย 9 คน
-- ============================================================================
INSERT INTO patients (id, patient_code, national_id, full_name, age, sex, bp_target, clinical_notes) VALUES
  ('a1000000-0000-0000-0000-000000000001', '10001', '1100101234561', 'นาย สมชาย ใจดี',         67, 'ชาย',  130, 'ความดันสูงเรื้อรังมีเบาหวานและ CKD แนะนำลดเค็ม ออกกำลังกาย'),
  ('a1000000-0000-0000-0000-000000000002', '10002', '1100205678902', 'นาง สุดา รักสุขภาพ',     55, 'หญิง', 130, 'ความดันเริ่มคุมได้ดี ปฏิบัติตามคำแนะนำดี'),
  ('a1000000-0000-0000-0000-000000000003', '10003', '1100309876543', 'นาย ประเสริฐ มีสุข',     72, 'ชาย',  130, 'ความเสี่ยงสูง โรคร่วมหลายอย่าง DM+CAD+HF+AF'),
  ('a1000000-0000-0000-0000-000000000004', '10004', '1100412345674', 'นางสาว พิมพ์ใจ แสงทอง',  48, 'หญิง', 130, 'ความดันคุมได้ดีมาก ไม่มีโรคร่วม'),
  ('a1000000-0000-0000-0000-000000000005', '10005', '1100515678905', 'นาง วันเพ็ญ สุขสวัสดิ์', 78, 'หญิง', 140, 'CKD stage 3B ความดันลดต่ำเกิน ต้องปรับยา'),
  ('a1000000-0000-0000-0000-000000000006', '10006', '1100611223344', 'นาย อนุรักษ์ สมบูรณ์',   42, 'ชาย',  130, 'ปฏิบัติตามคำแนะนำดี ออกกำลังกายสม่ำเสมอ'),
  ('a1000000-0000-0000-0000-000000000007', '10007', '1100755667788', 'นาง ณัฐฐา พึ่งพา',       51, 'หญิง', 130, 'ผู้ป่วยใหม่ พบความดันสูงครั้งแรกจากการตรวจสุขภาพ'),
  ('a1000000-0000-0000-0000-000000000008', '10008', '1100899887766', 'นาย วีระ ขึ้นลง',         60, 'ชาย',  130, 'ความดันผันผวนสูง กินยาไม่สม่ำเสมอ'),
  ('a1000000-0000-0000-0000-000000000009', '10009', '1100923456789', 'นาง กมลา ครรภ์ดี',       29, 'หญิง', 130, 'ตั้งครรภ์ 24 สัปดาห์ — ความดันสูงขณะตั้งครรภ์ (ใช้ยาที่ปลอดภัยต่อทารก)');

-- ── ประวัติซักถาม ──
INSERT INTO patient_history
  (patient_id,
   ht_duration_years, ht_duration_months, ht_duration_days,
   dm_type, dm_diagnosis_year, dm_duration_years, ckd_duration_years,
   height_cm, waist_cm, central_obesity,
   smoking_status, smoking_years, smoking_months, smoking_days,
   alcohol, pregnant, recent_surgery, important_notes) VALUES
  ('a1000000-0000-0000-0000-000000000001',  8, NULL, NULL, 'เบาหวานชนิดที่ 2', 2558, 11, 3,  169, 96,  true,  'former',  10, 6, NULL, 'occasional', false, NULL, 'เบาหวานลงไต ระวังการปรับ ARB ตาม eGFR'),
  ('a1000000-0000-0000-0000-000000000002',  4, 3,    NULL, NULL, NULL, NULL, NULL,                 162, 78,  false, 'never',    0, 0, NULL, 'never',      false, NULL, NULL),
  ('a1000000-0000-0000-0000-000000000003', 15, NULL, NULL, 'เบาหวานชนิดที่ 2', 2552, 17, NULL, 168, 104, true,  'current', 30, 0, NULL, 'regular',    false, NULL, 'ASCVD: CAD + พบ plaque — เสี่ยงสูงมาก เน้นคุมไขมัน+ความดันเข้มงวด'),
  ('a1000000-0000-0000-0000-000000000004',  2, 8,    NULL, NULL, NULL, NULL, NULL,                 158, 72,  false, 'never',    0, 0, NULL, 'occasional', false, NULL, NULL),
  ('a1000000-0000-0000-0000-000000000005', 12, NULL, NULL, NULL, NULL, NULL, 5,                    156, 84,  false, 'never',    0, 0, NULL, 'never',      false, 'ผ่าตัดต้อกระจก 1 เดือนก่อน', 'ความดันต่ำเกิน ระวังหกล้ม — พิจารณาลดยา'),
  ('a1000000-0000-0000-0000-000000000006',  3, 0,    NULL, NULL, NULL, NULL, NULL,                 173, 82,  false, 'never',    0, 0, NULL, 'occasional', false, NULL, NULL),
  ('a1000000-0000-0000-0000-000000000007',  0, 3,    15,   NULL, NULL, NULL, NULL,                 160, 80,  false, 'never',    0, 0, NULL, 'occasional', false, NULL, 'ผู้ป่วยใหม่ ยังไม่ได้รับยา'),
  ('a1000000-0000-0000-0000-000000000008',  6, NULL, NULL, 'เบาหวานชนิดที่ 2', 2562, 7, NULL,  175, 98,  true,  'current', 20, 0, NULL, 'heavy',      false, NULL, 'กินยาไม่สม่ำเสมอ ดื่มหนัก — ความดันแกว่งตามพฤติกรรม'),
  ('a1000000-0000-0000-0000-000000000009',  1, 0,    NULL, NULL, NULL, NULL, NULL,                 160, NULL, false, 'never',    0, 0, NULL, 'never',      true,  NULL, 'ตั้งครรภ์ 24 สัปดาห์ — ห้ามใช้ ACEI/ARB/ARNI ใช้ Methyldopa/Labetalol/Nifedipine');

-- ── ตัวอย่างประวัติแพ้ยา (demo) ──
UPDATE patient_history SET drug_allergies = 'ACEI (ไอแห้ง), Penicillin' WHERE patient_id = 'a1000000-0000-0000-0000-000000000001';
UPDATE patient_history SET drug_allergies = 'Sulfa (ผื่นลมพิษ)'         WHERE patient_id = 'a1000000-0000-0000-0000-000000000003';

-- ── โรคร่วม ──
INSERT INTO patient_comorbidities
  (patient_id, diabetes, ckd, cad, heart_failure, stroke, pad, plaque, af, arrhythmias, dementia, dyslipidemia) VALUES
  ('a1000000-0000-0000-0000-000000000001', true,  true,  false, false, false, false, false, false, false, false, true),
  ('a1000000-0000-0000-0000-000000000002', false, false, false, false, false, false, false, false, false, false, false),
  ('a1000000-0000-0000-0000-000000000003', true,  false, true,  true,  false, false, true,  true,  true,  false, true),
  ('a1000000-0000-0000-0000-000000000004', false, false, false, false, false, false, false, false, false, false, false),
  ('a1000000-0000-0000-0000-000000000005', false, true,  false, false, false, false, false, false, false, false, false),
  ('a1000000-0000-0000-0000-000000000006', false, false, false, false, false, false, false, false, false, false, false),
  ('a1000000-0000-0000-0000-000000000007', false, false, false, false, false, false, false, false, false, false, false),
  ('a1000000-0000-0000-0000-000000000008', true,  false, false, false, false, false, false, false, true,  false, true),
  ('a1000000-0000-0000-0000-000000000009', false, false, false, false, false, false, false, false, false, false, false);

-- ── ยาปัจจุบัน ──
INSERT INTO patient_medications (patient_id, drug_class, drug_name, dose, frequency) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'ARB',           'Losartan',            '50 mg',   '1x/วัน'),
  ('a1000000-0000-0000-0000-000000000001', 'CCB',           'Amlodipine',          '5 mg',    '1x/วัน'),
  ('a1000000-0000-0000-0000-000000000002', 'CCB',           'Amlodipine',          '5 mg',    '1x/วัน'),
  ('a1000000-0000-0000-0000-000000000003', 'ACEI',          'Enalapril',           '10 mg',   '2x/วัน'),
  ('a1000000-0000-0000-0000-000000000003', 'CCB',           'Amlodipine',          '10 mg',   '1x/วัน'),
  ('a1000000-0000-0000-0000-000000000003', 'Beta-blocker',  'Bisoprolol',          '5 mg',    '1x/วัน'),
  ('a1000000-0000-0000-0000-000000000004', 'Diuretic',      'Hydrochlorothiazide', '12.5 mg', '1x/วัน'),
  ('a1000000-0000-0000-0000-000000000005', 'ACEI',          'Ramipril',            '10 mg',   '1x/วัน'),
  ('a1000000-0000-0000-0000-000000000005', 'Diuretic',      'Furosemide',          '40 mg',   '1x/วัน'),
  ('a1000000-0000-0000-0000-000000000005', 'CCB',           'Nifedipine',          '30 mg',   '1x/วัน'),
  ('a1000000-0000-0000-0000-000000000006', 'CCB',           'Amlodipine',          '2.5 mg',  '1x/วัน'),
  -- 10007: ยังไม่มียา (ผู้ป่วยใหม่)
  ('a1000000-0000-0000-0000-000000000008', 'ARB',           'Valsartan',           '80 mg',   '1x/วัน'),
  ('a1000000-0000-0000-0000-000000000008', 'Beta-blocker',  'Atenolol',            '50 mg',   '1x/วัน'),
  ('a1000000-0000-0000-0000-000000000009', 'Alpha2-Agonist','Methyldopa',          '250 mg',  '2x/วัน');

-- ── ค่าความดัน (vitalsign) ──
INSERT INTO bp_visits (patient_id, visit_date, sbp, dbp, heart_rate, weight_kg, bmi, resp, o2sat, temp, note, recorded_by) VALUES
  ('a1000000-0000-0000-0000-000000000001', '2025-12-05', 145, 88, 76, 74.0, 26.1, NULL, NULL, NULL, NULL, 'นพ. วิชาญ สุขใจ'),
  ('a1000000-0000-0000-0000-000000000001', '2026-01-08', 148, 90, 78, 74.0, 26.1, NULL, NULL, NULL, NULL, 'นพ. วิชาญ สุขใจ'),
  ('a1000000-0000-0000-0000-000000000001', '2026-02-12', 152, 92, 80, 75.0, 26.4, NULL, NULL, NULL, NULL, 'นพ. วิชาญ สุขใจ'),
  ('a1000000-0000-0000-0000-000000000001', '2026-03-05', 155, 93, 77, 75.0, 26.4, NULL, NULL, NULL, NULL, 'นพ. วิชาญ สุขใจ'),
  ('a1000000-0000-0000-0000-000000000001', '2026-04-09', 157, 95, 79, 76.0, 26.8, NULL, NULL, NULL, NULL, 'นพ. วิชาญ สุขใจ'),
  ('a1000000-0000-0000-0000-000000000001', '2026-05-14', 158, 94, 81, 76.0, 26.8, 18, 98, 36.7, NULL, 'น.ส. พรทิพย์ ใจดี'),
  ('a1000000-0000-0000-0000-000000000002', '2025-12-05', 136, 84, 70, 62.0, 24.8, NULL, NULL, NULL, NULL, 'พญ. สมหญิง รักษาดี'),
  ('a1000000-0000-0000-0000-000000000002', '2026-02-12', 129, 80, 72, 61.0, 24.4, NULL, NULL, NULL, NULL, 'พญ. สมหญิง รักษาดี'),
  ('a1000000-0000-0000-0000-000000000002', '2026-05-14', 129, 80, 70, 60.0, 24.0, 17, 99, 36.6, NULL, 'น.ส. พรทิพย์ ใจดี'),
  ('a1000000-0000-0000-0000-000000000003', '2025-12-05', 165,  96, 82, 82.0, 28.9, NULL, NULL, NULL, NULL, 'นพ. วิชาญ สุขใจ'),
  ('a1000000-0000-0000-0000-000000000003', '2026-02-12', 168,  97, 80, 83.0, 29.2, NULL, NULL, NULL, NULL, 'นพ. วิชาญ สุขใจ'),
  ('a1000000-0000-0000-0000-000000000003', '2026-03-05', 175, 100, 86, 84.0, 29.6, NULL, NULL, NULL, NULL, 'นพ. วิชาญ สุขใจ'),
  ('a1000000-0000-0000-0000-000000000003', '2026-04-09', 178, 102, 88, 84.0, 29.6, NULL, NULL, NULL, NULL, 'นพ. วิชาญ สุขใจ'),
  ('a1000000-0000-0000-0000-000000000003', '2026-05-14', 180, 104, 90, 85.0, 29.9, 20, 96, 36.9, 'BP สูงมาก', 'น.ส. พรทิพย์ ใจดี'),
  ('a1000000-0000-0000-0000-000000000004', '2025-12-05', 126, 78, 66, 56.0, 22.4, NULL, NULL, NULL, NULL, 'พญ. สมหญิง รักษาดี'),
  ('a1000000-0000-0000-0000-000000000004', '2026-02-12', 120, 74, 65, 55.0, 22.0, NULL, NULL, NULL, NULL, 'พญ. สมหญิง รักษาดี'),
  ('a1000000-0000-0000-0000-000000000004', '2026-05-14', 120, 75, 65, 56.0, 22.4, 16, 99, 36.5, NULL, 'น.ส. พรทิพย์ ใจดี'),
  ('a1000000-0000-0000-0000-000000000005', '2025-12-05', 108, 65, 58, 52.0, 21.2, NULL, NULL, NULL, NULL, 'นพ. วิชาญ สุขใจ'),
  ('a1000000-0000-0000-0000-000000000005', '2026-02-12', 100, 61, 53, 51.0, 20.8, NULL, NULL, NULL, NULL, 'นพ. วิชาญ สุขใจ'),
  ('a1000000-0000-0000-0000-000000000005', '2026-04-09',  94, 58, 50, 50.0, 20.4, NULL, NULL, NULL, NULL, 'นพ. วิชาญ สุขใจ'),
  ('a1000000-0000-0000-0000-000000000005', '2026-05-14',  95, 58, 51, 50.0, 20.4, 18, 97, 36.6, 'ความดันต่ำ', 'น.ส. พรทิพย์ ใจดี'),
  ('a1000000-0000-0000-0000-000000000006', '2025-12-05', 132, 84, 72, 70.0, 23.1, NULL, NULL, NULL, NULL, 'พญ. สมหญิง รักษาดี'),
  ('a1000000-0000-0000-0000-000000000006', '2026-03-05', 124, 79, 71, 69.0, 22.8, NULL, NULL, NULL, NULL, 'พญ. สมหญิง รักษาดี'),
  ('a1000000-0000-0000-0000-000000000006', '2026-05-14', 120, 76, 67, 68.0, 22.5, 16, 99, 36.5, NULL, 'น.ส. พรทิพย์ ใจดี'),
  ('a1000000-0000-0000-0000-000000000007', '2026-05-28', 158, 96, 82, 66.0, 25.4, 18, 98, 36.8, 'ตรวจสุขภาพประจำปี พบความดันสูง', 'น.ส. พรทิพย์ ใจดี'),
  ('a1000000-0000-0000-0000-000000000008', '2025-12-05', 162,  98, 88, 80.0, 27.7, NULL, NULL, NULL, 'กินยาไม่สม่ำเสมอ', 'นพ. ทวีศักดิ์ มีโชค'),
  ('a1000000-0000-0000-0000-000000000008', '2026-01-08', 128,  80, 72, 80.0, 27.7, NULL, NULL, NULL, NULL, 'นพ. ทวีศักดิ์ มีโชค'),
  ('a1000000-0000-0000-0000-000000000008', '2026-02-12', 174, 104, 94, 81.0, 28.0, NULL, NULL, NULL, 'ลืมกินยา', 'นพ. ทวีศักดิ์ มีโชค'),
  ('a1000000-0000-0000-0000-000000000008', '2026-04-09', 168, 100, 90, 82.0, 28.4, NULL, NULL, NULL, 'ดื่มกาแฟมากขึ้น', 'นพ. ทวีศักดิ์ มีโชค'),
  ('a1000000-0000-0000-0000-000000000008', '2026-05-14', 130,  82, 74, 82.0, 28.4, 18, 98, 36.7, NULL, 'น.ส. พรทิพย์ ใจดี'),
  ('a1000000-0000-0000-0000-000000000009', '2026-04-20', 142, 90, 84, 64.0, 25.0, NULL, NULL, NULL, NULL, 'พญ. สมหญิง รักษาดี'),
  ('a1000000-0000-0000-0000-000000000009', '2026-05-18', 146, 92, 86, 66.0, 25.8, 18, 99, 36.7, 'ความดันสูงขณะตั้งครรภ์', 'น.ส. พรทิพย์ ใจดี');

-- ── ผลแลป (lab) ──
INSERT INTO patient_labs
  (patient_id, lab_date, fpg, hba1c, ldl, hdl, tg, chol, creatinine, egfr, uacr,
   potassium, sodium, uric, hemoglobin, hematocrit, wbc, platelet) VALUES
  ('a1000000-0000-0000-0000-000000000001', '2026-04-09', 148.0, 7.8, 128.0, 42.0, 160.0, 205.0, 1.40, 52.0, 38.0, 4.20, 139.0, 7.2, 13.1, 39.0, 7.8, 250.0),
  ('a1000000-0000-0000-0000-000000000002', '2026-03-05', NULL,  5.4, 105.0, 58.0, NULL,  178.0, 0.80, 82.0, NULL, 4.00, 140.0, 5.1, 13.5, 40.0, 6.5, 280.0),
  ('a1000000-0000-0000-0000-000000000003', '2026-04-09', 195.0, 8.5, 142.0, 38.0, 210.0, 240.0, 1.00, 68.0, NULL, 4.50, 138.0, 8.1, 12.8, 38.0, 9.2, 230.0),
  ('a1000000-0000-0000-0000-000000000004', '2026-02-12', NULL,  5.1,  95.0, 62.0, NULL,  168.0, 0.70, 95.0, NULL, 3.80, 141.0, 4.5, 13.8, 41.0, 6.0, 290.0),
  ('a1000000-0000-0000-0000-000000000005', '2026-04-09', NULL,  5.6, 112.0, 52.0, NULL,  190.0, 1.60, 44.0, 42.0, 5.10, 137.0, 6.8, 11.2, 34.0, 6.2, 210.0),
  ('a1000000-0000-0000-0000-000000000006', '2026-03-05', 95.0,  5.2,  92.0, 65.0, NULL,  165.0, 0.90, 90.0, NULL, 4.10, 140.0, 4.8, 14.5, 43.0, 5.8, 300.0),
  ('a1000000-0000-0000-0000-000000000007', '2026-05-28', 102.0, NULL, 118.0, 52.0, NULL, 188.0, 0.80, 88.0, NULL, NULL, 140.0, NULL, 13.0, 39.0, NULL, NULL),
  ('a1000000-0000-0000-0000-000000000008', '2026-04-09', 138.0, 7.2, 122.0, 44.0, 180.0, 210.0, 1.10, 72.0, NULL, 4.30, 139.0, 7.4, 14.0, 42.0, 7.0, 260.0),
  ('a1000000-0000-0000-0000-000000000009', '2026-05-18', 88.0,  5.0,  98.0, 60.0, NULL,  170.0, 0.60, 110.0, 12.0, 4.10, 139.0, 3.8, 11.8, 35.0, 9.5, 240.0);

-- ── บันทึกแพทย์ (ครั้งก่อนๆ) ──
INSERT INTO doctor_records
  (patient_id, doctor_name, clinical_notes, recommendation, risk_level, risk_score,
   stroke_risk, mace_risk, sbp_at_visit, dbp_at_visit, next_appt_date, appt_note, ref_id, medications_json) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'นพ. วิชาญ สุขใจ',
   'ความดันยังสูงต่อเนื่อง ปรับขนาด Losartan ติดตามค่า K+ ทุก 1 เดือน', 'INTENSIFY', 'High', 72.50, 55, 48,
   152, 92, '2026-03-05', 'ติดตาม BP + K+', 'HS-A1B2C3',
   '[{"drugClass":"ARB","drugName":"Losartan","dose":"100 mg","frequency":"1x/วัน"},{"drugClass":"CCB","drugName":"Amlodipine","dose":"5 mg","frequency":"1x/วัน"}]'::jsonb),
  ('a1000000-0000-0000-0000-000000000001', 'นพ. วิชาญ สุขใจ',
   'eGFR ลดลงเล็กน้อย (52) ระวังการใช้ ARB ลดเค็ม < 2g/วัน', 'CONTINUE', 'High', 74.00, 58, 50,
   157, 95, '2026-05-14', 'ตรวจ eGFR + K+', 'HS-D4E5F6',
   '[{"drugClass":"ARB","drugName":"Losartan","dose":"50 mg","frequency":"1x/วัน"},{"drugClass":"CCB","drugName":"Amlodipine","dose":"5 mg","frequency":"1x/วัน"}]'::jsonb),
  ('a1000000-0000-0000-0000-000000000003', 'นพ. วิชาญ สุขใจ',
   'ASCVD เสี่ยงสูงมาก เพิ่มการคุมความดันและไขมัน พิจารณาเพิ่มยา', 'INTENSIFY', 'Critical', 91.00, 82, 75,
   178, 102, '2026-05-14', 'ติดตามใกล้ชิด', 'HS-C3D4E5',
   '[{"drugClass":"ACEI","drugName":"Enalapril","dose":"10 mg","frequency":"2x/วัน"},{"drugClass":"CCB","drugName":"Amlodipine","dose":"10 mg","frequency":"1x/วัน"},{"drugClass":"Beta-blocker","drugName":"Bisoprolol","dose":"5 mg","frequency":"1x/วัน"}]'::jsonb),
  ('a1000000-0000-0000-0000-000000000008', 'นพ. ทวีศักดิ์ มีโชค',
   'BP แกว่งมาก เน้นกินยาสม่ำเสมอ แนะนำเลิกเหล้า', 'MONITOR', 'High', 68.00, 48, 43,
   168, 100, '2026-05-14', 'pharmacy review', 'HS-M4N5O6',
   '[{"drugClass":"ARB","drugName":"Valsartan","dose":"80 mg","frequency":"1x/วัน"},{"drugClass":"Beta-blocker","drugName":"Atenolol","dose":"50 mg","frequency":"1x/วัน"}]'::jsonb);

-- ============================================================================
-- ตรวจสอบจำนวนแถวหลัง import
-- ============================================================================
SELECT 'staff' AS tbl, COUNT(*) AS rows FROM staff
UNION ALL SELECT 'patients',              COUNT(*) FROM patients
UNION ALL SELECT 'patient_history',       COUNT(*) FROM patient_history
UNION ALL SELECT 'patient_comorbidities', COUNT(*) FROM patient_comorbidities
UNION ALL SELECT 'patient_medications',   COUNT(*) FROM patient_medications
UNION ALL SELECT 'bp_visits',             COUNT(*) FROM bp_visits
UNION ALL SELECT 'patient_labs',          COUNT(*) FROM patient_labs
UNION ALL SELECT 'doctor_records',        COUNT(*) FROM doctor_records;
