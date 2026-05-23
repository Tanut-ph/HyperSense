-- GenomeMed AI schema for Supabase/PostgreSQL
-- Run this file in Supabase SQL Editor.
-- ตารางทั้งหมดใช้ patients.id เป็น primary key และ foreign key อ้างอิง REFERENCES patients(id)
-- เพื่อแก้ error: column "patient_id" referenced in foreign key constraint does not exist

create extension if not exists pgcrypto;

-- Drop order matters because child tables reference patients.
drop table if exists referrals cascade;
drop table if exists drug_recommendations cascade;
drop table if exists ai_assessments cascade;
drop table if exists visits cascade;
drop table if exists genetic_profiles cascade;
drop table if exists patient_histories cascade;
drop table if exists patients cascade;

create table patients (
  id uuid primary key default gen_random_uuid(),
  patient_code text unique not null,
  -- Development note: for real use, do not store national ID as plaintext.
  -- Store national_id_hash instead and keep real identifiers in a secure HIS.
  national_id text unique,
  national_id_hash text,
  full_name text not null,
  age integer check (age >= 0 and age <= 130),
  sex text,
  blood_type text,
  weight_kg numeric(5,2),
  height_cm numeric(5,2),
  bmi numeric(4,1),
  blood_pressure text,
  glucose_mg_dl integer,
  cholesterol_mg_dl integer,
  smoking_status text,
  current_meds text[] default '{}',
  risks jsonb not null default '{"diabetes":0,"crc":0,"dyslip":0}'::jsonb,
  snps text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table patient_histories (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  history_date date,
  note text not null,
  type text not null default 'blue' check (type in ('green', 'yellow', 'blue')),
  created_at timestamptz not null default now()
);

create table visits (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  doctor_name text,
  visit_date timestamptz not null default now(),
  symptom_text text,
  weight_kg numeric(5,2),
  height_cm numeric(5,2),
  blood_pressure text,
  temperature_c numeric(4,1),
  lab_summary text,
  created_at timestamptz not null default now()
);

create table ai_assessments (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid references visits(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  risk_level text check (risk_level in ('low', 'medium', 'high')),
  possible_diseases jsonb default '[]'::jsonb,
  ai_summary text,
  doctor_review text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'edited')),
  created_at timestamptz not null default now()
);

create table genetic_profiles (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  storage_path text,
  gene_markers jsonb default '{}'::jsonb,
  uploaded_at timestamptz not null default now()
);

create table drug_recommendations (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid references visits(id) on delete cascade,
  patient_id uuid not null references patients(id) on delete cascade,
  drug_name text not null,
  dosage_suggestion text,
  genetic_warning text,
  ai_reason text,
  doctor_confirmed boolean not null default false,
  created_at timestamptz not null default now()
);

create table referrals (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patients(id) on delete cascade,
  from_hospital text,
  to_hospital text not null,
  department text,
  reason text,
  consent_status text not null default 'pending' check (consent_status in ('pending', 'granted', 'rejected')),
  transfer_status text not null default 'draft' check (transfer_status in ('draft', 'sent', 'accepted', 'cancelled')),
  ai_summary text,
  created_at timestamptz not null default now()
);

create index idx_patient_histories_patient_id on patient_histories(patient_id);
create index idx_visits_patient_id on visits(patient_id);
create index idx_ai_assessments_patient_id on ai_assessments(patient_id);
create index idx_genetic_profiles_patient_id on genetic_profiles(patient_id);
create index idx_drug_recommendations_patient_id on drug_recommendations(patient_id);
create index idx_referrals_patient_id on referrals(patient_id);

-- Seed data below is stored in Supabase for testing queries.
-- It is not mock data inside the application code.
insert into patients (
  patient_code, national_id, full_name, age, sex, blood_type,
  weight_kg, height_cm, bmi, blood_pressure, glucose_mg_dl,
  cholesterol_mg_dl, smoking_status, current_meds, risks, snps
) values (
  'PT-20240087',
  '3-1002-01234-56-7',
  'สมชาย มีสุข',
  52,
  'ชาย',
  'A+',
  78,
  168,
  27.6,
  '138/88',
  116,
  210,
  'เคย (เลิกแล้ว)',
  array['Amlodipine 5mg'],
  '{"diabetes":72,"crc":38,"dyslip":24}'::jsonb,
  array[
    'rs7903146 (TCF7L2·T)',
    'rs1801282 (PPARG·C)',
    'rs6983267 (MYC·G)',
    'rs4779584 (SMAD7·T)',
    'rs1800588 (LIPC·C)'
  ]
);

insert into patient_histories (patient_id, history_date, note, type)
select id, '2024-01-15', 'ความดันโลหิตสูง — ได้รับยา Amlodipine 5mg', 'green'
from patients where patient_code = 'PT-20240087';

insert into patient_histories (patient_id, history_date, note, type)
select id, '2023-09-03', 'Pre-diabetes — ปรับอาหารและออกกำลังกาย', 'yellow'
from patients where patient_code = 'PT-20240087';

insert into patient_histories (patient_id, history_date, note, type)
select id, '2023-03-20', 'ตรวจสุขภาพประจำปี — ผลปกติ', 'blue'
from patients where patient_code = 'PT-20240087';
