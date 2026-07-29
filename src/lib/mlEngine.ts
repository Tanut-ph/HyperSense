/**
 * mlEngine.ts
 * ──────────────────────────────────────────────────────────────────────────
 * เรียก FastAPI ML backend (api.py) เพื่อทำนายความเสี่ยงโรคร่วม
 *
 * Production: POST http://localhost:8000/predict
 * Fallback:   rule-based similarity (ใช้เมื่อ API ไม่พร้อม)
 */

import type { CardioPatient, MLRiskPrediction } from './types'

const ML_API = process.env.NEXT_PUBLIC_ML_API_URL ?? 'http://localhost:8000'

// ─── Types จาก FastAPI response ───────────────────────────────────────────
interface SHAPEntry {
  feature:   string
  shap:      number
  value:     number
  direction: string
}

interface APIRiskResult {
  target:      string
  condition:   string
  probability: number
  threshold:   number
  positive:    boolean
  severity:    'low' | 'moderate' | 'high'
  shap_top5:   SHAPEntry[]
  basis?:      string[]
  model?:      'xgboost' | 'clinical'
}

interface APIResponse {
  patientId: string
  risks:     APIRiskResult[]
  summary:   Record<string, unknown>
}

// ─── เรียก API จริง ────────────────────────────────────────────────────────
async function fetchMLPrediction(patient: CardioPatient): Promise<MLRiskPrediction[] | null> {
  try {
    const payload = {
      patientId: patient.id,
      age:       patient.age,
      sex:       patient.sex,
      visits:    patient.visits.map(v => ({
        date:      v.date,
        sbp:       v.sbp,
        dbp:       v.dbp,
        heartRate: v.heartRate,
        weight:    v.weight,
        bmi:       v.bmi,
      })),
      labs: {
        hba1c:      patient.labs.hba1c      ?? null,
        ldl:        patient.labs.ldl        ?? null,
        hdl:        patient.labs.hdl        ?? null,
        creatinine: patient.labs.creatinine ?? null,
        egfr:       patient.labs.egfr       ?? null,
        potassium:  patient.labs.potassium  ?? null,
        proBNP:     patient.labs.proBNP     ?? null,
        uacr:       patient.labs.uacr       ?? null,
        tg:         patient.labs.tg         ?? null,
        fpg:        patient.labs.fpg        ?? null,
      },
      comorbidities: {
        diabetes:    patient.comorbidities.diabetes,
        ckd:         patient.comorbidities.ckd,
        cad:         patient.comorbidities.cad,
        heartFailure:patient.comorbidities.heartFailure,
        stroke:      patient.comorbidities.stroke,
        af:          patient.comorbidities.af,
        arrhythmias: patient.comorbidities.arrhythmias,
        dementia:    patient.comorbidities.dementia,
      },
      medications: patient.medications.map(m => ({
        drugClass: m.drugClass,
        drugName:  m.drugName,
        dose:      m.dose,
        frequency: m.frequency,
      })),
    }

    const res = await fetch(`${ML_API}/predict`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
      signal:  AbortSignal.timeout(5000),  // timeout 5s
    })

    if (!res.ok) return null
    const data: APIResponse = await res.json()

    return data.risks
      .filter(r => r.probability >= 35)
      .map(r => ({
        condition:   r.condition,
        probability: Math.round(r.probability),
        severity:    r.severity,
        // ใช้ SHAP เมื่อมาจากโมเดล XGBoost, ไม่งั้นใช้เหตุผลเชิงคลินิก (basis)
        basis: (r.shap_top5 && r.shap_top5.length)
          ? r.shap_top5.map(s =>
              `${s.feature} = ${s.value} (${s.direction}, SHAP: ${s.shap > 0 ? '+' : ''}${s.shap.toFixed(3)})`)
          : (r.basis ?? []),
      }))
  } catch {
    return null  // API ไม่พร้อม → fallback
  }
}

// ─── Fallback: Rule-based similarity (ใช้เมื่อ API offline) ──────────────
interface RiskProfile {
  condition:  string
  sbpThreshold: number
  labChecks:  { key: keyof CardioPatient['labs']; op: '>=' | '<='; val: number; weight: number }[]
  coWeights:  Partial<Record<keyof CardioPatient['comorbidities'], number>>
  bpVarThreshold: number
  hrThreshold?: number
}

const FALLBACK_PROFILES: RiskProfile[] = [
  {
    condition: 'เบาหวาน (co_dm)',
    sbpThreshold: 145, bpVarThreshold: 8,
    labChecks: [
      { key: 'hba1c', op: '>=', val: 6.5, weight: 20 },
      { key: 'fpg',   op: '>=', val: 126, weight: 15 },
    ],
    coWeights: { diabetes: 3, ckd: 1 },
  },
  {
    condition: 'โรคไตเรื้อรัง (co_ckd)',
    sbpThreshold: 150, bpVarThreshold: 10,
    labChecks: [
      { key: 'potassium', op: '>=', val: 5.0,  weight: 15 },
      { key: 'uacr',      op: '>=', val: 30,   weight: 15 },
      { key: 'egfr',      op: '<=', val: 60,   weight: 18 },
    ],
    coWeights: { ckd: 3, diabetes: 1, heartFailure: 1 },
  },
  {
    condition: 'หัวใจล้มเหลว (co_hf)',
    sbpThreshold: 160, bpVarThreshold: 12, hrThreshold: 95,
    labChecks: [
      { key: 'proBNP', op: '>=', val: 125, weight: 20 },
    ],
    coWeights: { heartFailure: 3, cad: 2, af: 1 },
  },
  {
    condition: 'หัวใจเต้นผิดจังหวะ / AF (co_atrial_fibrillation)',
    sbpThreshold: 148, bpVarThreshold: 15, hrThreshold: 100,
    labChecks: [],
    coWeights: { af: 3, arrhythmias: 2, heartFailure: 1 },
  },
  {
    condition: 'หลอดเลือดหัวใจ (co_cad)',
    sbpThreshold: 155, bpVarThreshold: 10,
    labChecks: [
      { key: 'ldl', op: '>=', val: 130, weight: 15 },
      { key: 'tg',  op: '>=', val: 150, weight: 10 },
    ],
    coWeights: { cad: 3, stroke: 1, diabetes: 1 },
  },
  {
    condition: 'โรคหลอดเลือดสมอง (co_stroke)',
    sbpThreshold: 162, bpVarThreshold: 18,
    labChecks: [],
    coWeights: { stroke: 3, af: 2, cad: 1 },
  },
]

function runFallback(patient: CardioPatient): MLRiskPrediction[] {
  const visits  = patient.visits
  const labs    = patient.labs
  const co      = patient.comorbidities

  const avgSBP = visits.length > 0
    ? visits.reduce((s, v) => s + v.sbp, 0) / visits.length : 0
  const sbpArr = visits.map(v => v.sbp)
  const mean   = avgSBP
  const bpVar  = visits.length > 1
    ? Math.sqrt(sbpArr.reduce((s, v) => s + (v - mean) ** 2, 0) / sbpArr.length)
    : 0
  const lastHR = visits.length > 0 ? visits[visits.length - 1].heartRate : 0

  const results: MLRiskPrediction[] = []

  for (const p of FALLBACK_PROFILES) {
    let score = 0, max = 0

    // SBP
    const sbpDiff = Math.abs(avgSBP - p.sbpThreshold)
    score += Math.max(0, 25 - sbpDiff * 0.5); max += 25

    // Lab checks
    for (const lc of p.labChecks) {
      const val = labs[lc.key]
      if (val != null) {
        if ((lc.op === '>=' && (val as number) >= lc.val) || (lc.op === '<=' && (val as number) <= lc.val)) {
          score += lc.weight
        }
        max += lc.weight
      }
    }

    // Comorbidity
    const coMap = co as unknown as Record<string, boolean>
    for (const [k, w] of Object.entries(p.coWeights)) {
      if (coMap[k]) score += (w as number) * 8
      max += (w as number) * 8
    }

    // BP variability
    if (bpVar >= p.bpVarThreshold) score += 10; max += 10

    // HR
    if (p.hrThreshold) {
      if (lastHR >= p.hrThreshold) score += 10; max += 10
    }

    // Age
    if (patient.age >= 65) score += 5; max += 5

    const prob = max > 0 ? Math.round((score / max) * 100) : 0
    if (prob >= 35) {
      results.push({
        condition:   p.condition,
        probability: prob,
        severity:    prob >= 70 ? 'high' : prob >= 50 ? 'moderate' : 'low',
        basis: [`[Fallback] SBP เฉลี่ย ${Math.round(avgSBP)} mmHg, BP Var ${bpVar.toFixed(1)}`],
      })
    }
  }

  return results.sort((a, b) => b.probability - a.probability).slice(0, 4)
}

// ─── Main export ──────────────────────────────────────────────────────────
export async function runMLSimilarityAsync(patient: CardioPatient): Promise<MLRiskPrediction[]> {
  const apiResult = await fetchMLPrediction(patient)
  if (apiResult !== null) return apiResult
  return runFallback(patient)
}

// Sync version (fallback only) — ใช้ใน PatientDetailPage แบบไม่ async
export function runMLSimilarity(patient: CardioPatient): MLRiskPrediction[] {
  return runFallback(patient)
}
