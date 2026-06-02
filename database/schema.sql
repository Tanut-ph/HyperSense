-- ============================================================
-- HyperSense Database Schema
-- PostgreSQL 15+ / Supabase
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── 1. STAFF (บัญชีผู้ใช้งาน) ────────────────────────────────────────────────
CREATE TABLE staff (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id      TEXT UNIQUE NOT NULL,              -- DR001, NR001, MT001
  password_hash TEXT NOT NULL,                     -- bcrypt via pgcrypto
  full_name     TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('doctor', 'nurse', 'medtech')),
  department    TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. PATIENTS (ข้อมูลผู้ป่วย) ──────────────────────────────────────────────
CREATE TABLE patients (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_code         TEXT UNIQUE NOT NULL,        -- รหัสผู้ป่วย 5-7 หลัก
  national_id          TEXT,                        -- เข้ารหัส / ไม่แสดงบน UI
  full_name            TEXT NOT NULL,
  age                  INT NOT NULL CHECK (age BETWEEN 0 AND 130),
  sex                  TEXT NOT NULL CHECK (sex IN ('ชาย', 'หญิง')),
  bp_target            INT NOT NULL DEFAULT 130,    -- mmHg
  treating_doctor_id   UUID REFERENCES staff(id) ON DELETE SET NULL,
  treating_doctor_name TEXT,                        -- cached display name
  clinical_notes       TEXT,
  is_active            BOOLEAN NOT NULL DEFAULT true,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3. PATIENT_COMORBIDITIES (โรคร่วม) ───────────────────────────────────────
CREATE TABLE patient_comorbidities (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id    UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  diabetes      BOOLEAN NOT NULL DEFAULT false,     -- เบาหวาน DM
  ckd           BOOLEAN NOT NULL DEFAULT false,     -- โรคไตเรื้อรัง CKD
  cad           BOOLEAN NOT NULL DEFAULT false,     -- หลอดเลือดหัวใจ CAD
  heart_failure BOOLEAN NOT NULL DEFAULT false,     -- หัวใจล้มเหลว HF
  stroke        BOOLEAN NOT NULL DEFAULT false,     -- Stroke / CVA
  af            BOOLEAN NOT NULL DEFAULT false,     -- Atrial Fibrillation
  arrhythmias   BOOLEAN NOT NULL DEFAULT false,     -- หัวใจเต้นผิดจังหวะ
  dementia      BOOLEAN NOT NULL DEFAULT false,     -- สมองเสื่อม
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (patient_id)
);

-- ── 4. PATIENT_MEDICATIONS (ยา) ───────────────────────────────────────────────
CREATE TABLE patient_medications (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id     UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  drug_class     TEXT NOT NULL,                     -- ACEI, ARB, CCB-DHP, ...
  drug_name      TEXT NOT NULL,
  dose           TEXT,                              -- เช่น 5mg, 50mg
  frequency      TEXT,                              -- เช่น 1x/วัน, 2x/วัน
  is_active      BOOLEAN NOT NULL DEFAULT true,
  prescribed_by  UUID REFERENCES staff(id) ON DELETE SET NULL,
  started_at     DATE,
  stopped_at     DATE,
  stop_reason    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 5. BP_VISITS (บันทึกความดันโลหิต) ───────────────────────────────────────
CREATE TABLE bp_visits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  visit_date      DATE NOT NULL,
  sbp             INT NOT NULL CHECK (sbp BETWEEN 50 AND 300),   -- mmHg
  dbp             INT NOT NULL CHECK (dbp BETWEEN 30 AND 200),   -- mmHg
  heart_rate      INT NOT NULL CHECK (heart_rate BETWEEN 20 AND 250), -- bpm
  weight_kg       NUMERIC(5,1),
  bmi             NUMERIC(4,1),
  note            TEXT,
  recorded_by     TEXT,                             -- ชื่อผู้บันทึก
  recorded_by_id  UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (patient_id, visit_date)
);

-- ── 6. PATIENT_LABS (ผลแลปทางห้องปฏิบัติการ) ────────────────────────────────
CREATE TABLE patient_labs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  lab_date        DATE NOT NULL,

  -- น้ำตาลและเบาหวาน
  fpg             NUMERIC(6,1),   -- Fasting Plasma Glucose (mg/dL) ปกติ < 100
  hba1c           NUMERIC(4,1),   -- HbA1c (%) ปกติ < 5.7

  -- ไขมันในเลือด
  ldl             NUMERIC(6,1),   -- LDL Cholesterol (mg/dL) ปกติ < 100-130
  hdl             NUMERIC(6,1),   -- HDL Cholesterol (mg/dL) ปกติ > 40
  tg              NUMERIC(6,1),   -- Triglyceride (mg/dL) ปกติ < 150
  chol            NUMERIC(6,1),   -- Total Cholesterol (mg/dL) ปกติ < 200

  -- ไต
  creatinine      NUMERIC(5,2),   -- Creatinine (mg/dL) ปกติ 0.6-1.2
  egfr            NUMERIC(5,1),   -- eGFR (mL/min/1.73m²) ปกติ > 60
  uacr            NUMERIC(8,2),   -- uACR (mg/g) ปกติ < 30

  -- เกลือแร่
  potassium       NUMERIC(4,2),   -- K⁺ (mEq/L) ปกติ 3.5-5.0
  sodium          NUMERIC(5,1),   -- Na⁺ (mEq/L) ปกติ 135-145

  -- CBC
  hemoglobin      NUMERIC(4,1),   -- Hb (g/dL) ปกติ > 12
  wbc             NUMERIC(5,2),   -- WBC (×10³/µL) ปกติ 4.0-10.0

  -- หัวใจขั้นสูง
  troponin        NUMERIC(8,4),   -- Troponin (ng/mL) ปกติ < 0.04
  pro_bnp         NUMERIC(8,1),   -- NT-proBNP (pg/mL) ปกติ < 125

  -- UA Dipstick (ผลเชิงคุณภาพ)
  ua_protein      TEXT,
  ua_glucose      TEXT,
  ua_blood        TEXT,
  ua_nitrite      TEXT,
  ua_ketone       TEXT,
  ua_leukocyte    TEXT,
  ua_ph           TEXT,
  ua_sg           TEXT,           -- Specific Gravity

  -- หมายเหตุ
  ecg_note        TEXT,
  extra_note      TEXT,

  recorded_by     TEXT,
  recorded_by_id  UUID REFERENCES staff(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 7. DOCTOR_RECORDS (บันทึกแพทย์) ─────────────────────────────────────────
CREATE TABLE doctor_records (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id        UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id         UUID REFERENCES staff(id) ON DELETE SET NULL,
  doctor_name       TEXT,                           -- cached

  -- บันทึกการรักษา
  clinical_notes    TEXT,
  recommendation    TEXT,                           -- CONTINUE, INTENSIFY, REDUCE, SWITCH, MONITOR, URGENT_REVIEW

  -- Snapshot ความเสี่ยงขณะบันทึก
  risk_level        TEXT,                           -- Low, Moderate, High, Critical
  risk_score        NUMERIC(5,2),
  stroke_risk       INT,                            -- %
  mace_risk         INT,                            -- %
  sbp_at_visit      INT,
  dbp_at_visit      INT,

  -- นัดหมาย
  next_appt_date    DATE,
  appt_note         TEXT,

  -- Reference ID (แสดงบน UI)
  ref_id            TEXT UNIQUE,                   -- HS-XXXXXX

  -- Snapshot ยา (JSON เผื่อยาเปลี่ยนในอนาคต)
  medications_json  JSONB,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 8. RISK_SNAPSHOTS (ประวัติการประเมินความเสี่ยง) ─────────────────────────
CREATE TABLE risk_snapshots (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id        UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  snapshot_date     DATE NOT NULL,
  avg_sbp           INT,
  avg_dbp           INT,
  last_sbp          INT,
  last_dbp          INT,
  last_hr           INT,
  bp_variability    NUMERIC(5,2),
  bp_trend          TEXT,                           -- Increasing, Decreasing, Stable
  stroke_risk       INT,
  mace_risk         INT,
  progression_risk  INT,
  risk_level        TEXT,
  risk_score        NUMERIC(5,2),
  risk_factors_json JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_patients_code          ON patients(patient_code);
CREATE INDEX idx_patients_national_id   ON patients(national_id);
CREATE INDEX idx_patients_doctor        ON patients(treating_doctor_id);
CREATE INDEX idx_bp_visits_patient_date ON bp_visits(patient_id, visit_date DESC);
CREATE INDEX idx_labs_patient_date      ON patient_labs(patient_id, lab_date DESC);
CREATE INDEX idx_doctor_records_patient ON doctor_records(patient_id, created_at DESC);
CREATE INDEX idx_staff_staff_id         ON staff(staff_id);

-- ============================================================
-- ROW LEVEL SECURITY (Supabase)
-- ============================================================
ALTER TABLE patients              ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_comorbidities ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_medications   ENABLE ROW LEVEL SECURITY;
ALTER TABLE bp_visits             ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_labs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_records        ENABLE ROW LEVEL SECURITY;

-- Policy ตัวอย่าง: authenticated users อ่านได้ทั้งหมด
CREATE POLICY "authenticated_read_patients"
  ON patients FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_read_bp_visits"
  ON bp_visits FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_read_labs"
  ON patient_labs FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_read_doctor_records"
  ON doctor_records FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- อัปเดต updated_at อัตโนมัติ
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_patients_updated_at
  BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_staff_updated_at
  BEFORE UPDATE ON staff
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- DEMO DATA: Staff Accounts (รหัสผ่าน 1234 ทุกบัญชี)
-- ============================================================
INSERT INTO staff (staff_id, password_hash, full_name, role, department) VALUES
  ('DR001', crypt('1234', gen_salt('bf')), 'นพ. วิชาญ สุขใจ',       'doctor',  'อายุรกรรม'),
  ('DR002', crypt('1234', gen_salt('bf')), 'พญ. สมหญิง รักษาดี',    'doctor',  'ต่อมไร้ท่อ'),
  ('DR003', crypt('1234', gen_salt('bf')), 'นพ. ทวีศักดิ์ มีโชค',   'doctor',  'โรคหัวใจ'),
  ('NR001', crypt('1234', gen_salt('bf')), 'น.ส. พรทิพย์ ใจดี',     'nurse',   'การพยาบาล'),
  ('MT001', crypt('1234', gen_salt('bf')), 'นาย ชาญณรงค์ วิชาการ', 'medtech', 'เทคนิคการแพทย์');

-- ============================================================
-- DEMO PATIENTS (ตัวอย่าง 8 คน)
-- ============================================================
INSERT INTO patients (id, patient_code, full_name, age, sex, bp_target, treating_doctor_name, clinical_notes) VALUES
  ('a1000000-0000-0000-0000-000000000001', '10001', 'นาย สมชาย ใจดี',         67, 'ชาย',   130, 'นพ. วิชาญ สุขใจ',     'ความดันสูงเรื้อรัง มีเบาหวานและ CKD'),
  ('a1000000-0000-0000-0000-000000000002', '10002', 'นาง สุดา รักสุขภาพ',     55, 'หญิง',  130, 'พญ. สมหญิง รักษาดี',  'ความดันเริ่มคุมได้ดี'),
  ('a1000000-0000-0000-0000-000000000003', '10003', 'นาย ประเสริฐ มีสุข',     72, 'ชาย',   130, 'นพ. วิชาญ สุขใจ',     'ความเสี่ยงสูง มีหลายโรคร่วม'),
  ('a1000000-0000-0000-0000-000000000004', '10004', 'นางสาว พิมพ์ใจ แสงทอง',  48, 'หญิง',  130, 'พญ. สมหญิง รักษาดี',  'ความดันคุมได้ดี'),
  ('a1000000-0000-0000-0000-000000000005', '10005', 'นาง วันเพ็ญ สุขสวัสดิ์', 78, 'หญิง',  140, 'นพ. วิชาญ สุขใจ',     'CKD ความดันต่ำเกินควบคุม'),
  ('a1000000-0000-0000-0000-000000000006', '10006', 'นาย อนุรักษ์ สมบูรณ์',   42, 'ชาย',   130, 'พญ. สมหญิง รักษาดี',  'ความดันปกติ คุมได้ดีมาก'),
  ('a1000000-0000-0000-0000-000000000007', '10007', 'นาง ณัฐฐา พึ่งพา',       51, 'หญิง',  130, NULL,                   'ผู้ป่วยใหม่ เพิ่งตรวจพบความดันสูง'),
  ('a1000000-0000-0000-0000-000000000008', '10008', 'นาย วีระ ขึ้นลง',         60, 'ชาย',   130, 'นพ. ทวีศักดิ์ มีโชค', 'ความดันผันผวนสูง กินยาไม่สม่ำเสมอ');

-- ============================================================
-- VIEWS ที่เป็นประโยชน์
-- ============================================================

-- สรุปผู้ป่วยพร้อมค่าความดันล่าสุด
CREATE OR REPLACE VIEW v_patient_summary AS
SELECT
  p.id,
  p.patient_code,
  p.full_name,
  p.age,
  p.sex,
  p.bp_target,
  p.treating_doctor_name,
  v.sbp          AS last_sbp,
  v.dbp          AS last_dbp,
  v.heart_rate   AS last_hr,
  v.visit_date   AS last_visit_date,
  CASE
    WHEN v.sbp >= 180 OR v.dbp >= 110 THEN 'Critical'
    WHEN v.sbp >= 160 OR v.dbp >= 100 THEN 'High'
    WHEN v.sbp >= 140 OR v.dbp >= 90  THEN 'Moderate'
    ELSE 'Low'
  END            AS risk_estimate
FROM patients p
LEFT JOIN LATERAL (
  SELECT sbp, dbp, heart_rate, visit_date
  FROM bp_visits
  WHERE patient_id = p.id
  ORDER BY visit_date DESC
  LIMIT 1
) v ON true
WHERE p.is_active = true;

-- ผู้ป่วยที่ยังไม่มีนัดหมายในอีก 30 วัน
CREATE OR REPLACE VIEW v_patients_no_upcoming_appt AS
SELECT p.patient_code, p.full_name, p.treating_doctor_name,
       MAX(d.next_appt_date) AS next_appt
FROM patients p
LEFT JOIN doctor_records d ON d.patient_id = p.id
GROUP BY p.id, p.patient_code, p.full_name, p.treating_doctor_name
HAVING MAX(d.next_appt_date) IS NULL
    OR MAX(d.next_appt_date) < NOW() + INTERVAL '30 days';
