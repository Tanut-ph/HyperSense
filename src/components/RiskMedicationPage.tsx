'use client'
import { useState, useEffect } from 'react'
import type { CardioPatient, RiskResult, MedRecommendation, MLRiskPrediction } from '@/lib/types'
import { runMLSimilarityAsync } from '@/lib/mlEngine'
import styles from './HyperSense.module.css'

const SEV_COLOR  = { low: '#00a872', moderate: '#d97706', high: '#dc2626' }
const SEV_BG     = { low: 'rgba(0,168,114,.08)', moderate: 'rgba(217,119,6,.08)', high: 'rgba(220,38,38,.08)' }
const SEV_BORDER = { low: 'rgba(0,168,114,.25)', moderate: 'rgba(217,119,6,.25)', high: 'rgba(220,38,38,.3)' }

function MLPanel({ patient }: { patient: CardioPatient }) {
  const [predictions, setPredictions] = useState<MLRiskPrediction[]>([])
  const [loading,     setLoading]     = useState(true)
  const [source,      setSource]      = useState<'api' | 'fallback'>('fallback')

  useEffect(() => {
    setLoading(true)
    runMLSimilarityAsync(patient).then(results => {
      const fromAPI = results.some(r => r.basis[0]?.includes('SHAP'))
      setSource(fromAPI ? 'api' : 'fallback')
      setPredictions(results)
      setLoading(false)
    })
  }, [patient.id])

  if (loading) return (
    <div style={{ background: 'rgba(59,130,246,.03)', border: '1.5px solid rgba(59,130,246,.15)', borderRadius: 'var(--r)', padding: '16px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text3)', fontSize: 13 }}>
      <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #3b82f6', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      กำลังวิเคราะห์ความเสี่ยงจาก ML...
    </div>
  )

  if (predictions.length === 0) return null

  return (
    <div style={{ background: 'rgba(59,130,246,.03)', border: '1.5px solid rgba(59,130,246,.2)', borderRadius: 'var(--r)', padding: '16px 18px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: source === 'api' ? '#00a872' : '#3b82f6', flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6', fontFamily: 'var(--mono)', letterSpacing: '.06em' }}>ML RISK ANALYSIS</span>
        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: source === 'api' ? 'rgba(0,168,114,.1)' : 'rgba(107,114,128,.1)', color: source === 'api' ? '#00a872' : '#6b7280', border: `1px solid ${source === 'api' ? 'rgba(0,168,114,.3)' : 'rgba(107,114,128,.2)'}`, fontFamily: 'var(--mono)', fontWeight: 600 }}>
          {source === 'api' ? 'XGBoost + SHAP' : 'Rule-based'}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {predictions.map((p, i) => (
          <div key={i} style={{ background: SEV_BG[p.severity], border: `1.5px solid ${SEV_BORDER[p.severity]}`, borderRadius: 'var(--rs)', padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{p.condition}</span>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 80, height: 6, background: 'var(--surface)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${p.probability}%`, height: '100%', background: SEV_COLOR[p.severity], borderRadius: 3 }} />
                </div>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: SEV_COLOR[p.severity] }}>{p.probability}%</span>
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.7 }}>
              {p.basis.slice(0, 3).map((b, bi) => <div key={bi} style={{ fontFamily: 'var(--mono)' }}>{b}</div>)}
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>
        {source === 'api' ? 'XGBoost trained บน dataset จริง · SHAP explainability' : 'Rule-based fallback — รัน python train.py เพื่อใช้ XGBoost จริง'}
      </div>
    </div>
  )
}

const LEVEL_BIG: Record<string, string> = {
  Low: styles.riskLevelLow, Moderate: styles.riskLevelModerate,
  High: styles.riskLevelHigh, Critical: styles.riskLevelCritical,
}
const LEVEL_TH: Record<string, string> = {
  Low: 'ความเสี่ยงต่ำ', Moderate: 'ความเสี่ยงปานกลาง',
  High: 'ความเสี่ยงสูง', Critical: 'ความเสี่ยงวิกฤต',
}

const REC_CFG = {
  CONTINUE:     { banner: styles.recBannerIntensify, type: styles.recTypeIntensify, label: 'แนวทางปรับยา' },
  INTENSIFY:    { banner: styles.recBannerIntensify, type: styles.recTypeIntensify, label: 'แนวทางปรับยา' },
  REDUCE:       { banner: styles.recBannerIntensify, type: styles.recTypeIntensify, label: 'แนวทางปรับยา' },
  SWITCH:       { banner: styles.recBannerIntensify, type: styles.recTypeIntensify, label: 'แนวทางปรับยา' },
  MONITOR:      { banner: styles.recBannerIntensify, type: styles.recTypeIntensify, label: 'แนวทางปรับยา' },
  URGENT_REVIEW:{ banner: styles.recBannerIntensify, type: styles.recTypeIntensify, label: 'แนวทางปรับยา' },
}

function RiskBar({ value, level }: { value: number; level: string }) {
  const barClass = level === 'Critical' || value >= 70 ? styles.riskBarHi
    : level === 'Low' || value < 35 ? styles.riskBarLo : styles.riskBarMd
  const valClass = level === 'Critical' || value >= 70 ? styles.riskHiVal
    : level === 'Low' || value < 35 ? styles.riskLoVal : styles.riskMdVal
  return (
    <div>
      <div className={[styles.riskScoreVal, valClass].join(' ')}>{value}%</div>
      <div className={styles.riskBarBg}>
        <div className={[styles.riskBarFill, barClass].join(' ')} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

export default function RiskMedicationPage({
  patient, risk, recommendation, onBack, onNext,
}: {
  patient: CardioPatient
  risk: RiskResult
  recommendation: MedRecommendation
  onBack: () => void
  onNext: () => void
}) {
  const cfg = REC_CFG[recommendation.type] ?? REC_CFG.MONITOR

  return (
    <div>
      <div className={styles.stepHdr}>
        <span className={styles.stepNum}>04 / 05</span>
        <h1 className={styles.stepTitle}>ความเสี่ยงโรค + แนะนำยา</h1>
      </div>
      <p className={styles.stepDesc}>
        Risk Assessment & Medication Decision Support — {patient.name}
      </p>

      {/* ── Overall Risk Banner ──────────────────────────── */}
      <div className={styles.riskHeader} style={{ marginBottom: 14 }}>
        <div className={styles.overallRisk}>Overall Cardiovascular Risk</div>
        <div className={[styles.riskLevelBig, LEVEL_BIG[risk.riskLevel]].join(' ')}>
          {LEVEL_TH[risk.riskLevel]}
        </div>
        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'center', gap: 10 }}>
          <div style={{ background: 'var(--bg2)', border: '1.5px solid var(--border2)', borderRadius: 'var(--rs)', padding: '7px 20px', fontFamily: 'var(--mono)', fontSize: 13 }}>
            SBP เฉลี่ย: <strong>{risk.avgSBP}</strong> mmHg
          </div>
        </div>
      </div>

      {/* ── Score Cards ──────────────────────────────────── */}
      <div className={styles.riskScoreGrid} style={{ marginBottom: 14 }}>
        <div className={styles.riskScoreCard}>
          <div className={styles.riskScoreCardTitle}>Stroke Risk</div>
          <RiskBar value={risk.strokeRisk} level={risk.riskLevel} />
          <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 5 }}>5-year predicted risk</div>
        </div>
        <div className={styles.riskScoreCard}>
          <div className={styles.riskScoreCardTitle}>MACE Risk</div>
          <RiskBar value={risk.maceRisk} level={risk.riskLevel} />
          <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 5 }}>Major Adverse CV Events</div>
        </div>
        <div className={styles.riskScoreCard}>
          <div className={styles.riskScoreCardTitle}>HTN Progression</div>
          <RiskBar value={risk.progressionRisk} level={risk.riskLevel} />
          <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 5 }}>Hypertension worsening</div>
        </div>
      </div>

      {/* ── ML Risk Analysis ─────────────────────────────── */}
      <div className={styles.lbl} style={{ marginBottom: 10 }}>การวิเคราะห์ความเสี่ยงจาก ML (ข้อมูลในอดีต)</div>
      <MLPanel patient={patient} />

      <div className={styles.divider} />

      {/* ── Medication Recommendation ─────────────────────── */}
      <div className={styles.lbl} style={{ marginBottom: 10 }}>แนะนำการให้ยากลุ่มความดัน</div>

      {/* Current meds */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <span style={{ fontSize: 12, color: 'var(--text3)', alignSelf: 'center' }}>ยาปัจจุบัน:</span>
        {patient.medications.map((m, i) => (
          <span key={i} style={{
            fontSize: 12, padding: '4px 10px', borderRadius: 20,
            background: 'var(--surface)', border: '1px solid var(--border2)',
            fontFamily: 'var(--mono)', color: 'var(--text2)',
          }}>
            {m.drugClass} – {m.drugName} {m.dose}
          </span>
        ))}
      </div>

      {/* Recommendation banner */}
      <div className={[styles.recBanner, cfg.banner].join(' ')}>
        <div style={{ flex: 1 }}>
          <div className={[styles.recType, cfg.type].join(' ')}>{cfg.label}</div>
          <div className={styles.recTitle}>{recommendation.title}</div>
          <div className={styles.recThai}>{recommendation.thai}</div>
        </div>
      </div>

      {/* Drug guidance */}
      <div style={{
        marginTop: 12, padding: '14px 16px',
        background: 'var(--bg3)', border: '1px solid var(--border2)',
        borderRadius: 'var(--rs)', fontSize: 13, color: 'var(--text)', lineHeight: 1.8,
      }}>
        <div className={styles.lbl} style={{ marginBottom: 8 }}>แนวทางการปรับยา</div>
        {(recommendation.type === 'CONTINUE') && (
          <div><strong>ใช้ยาตามเดิม</strong> — ยาที่ใช้อยู่ปัจจุบันได้ผลดี ไม่จำเป็นต้องปรับขนาดหรือเปลี่ยนชนิดยา</div>
        )}
        {(recommendation.type === 'INTENSIFY' || recommendation.type === 'URGENT_REVIEW') && (
          <div><strong>แนะนำเพิ่มขนาดยา หรือเพิ่มกลุ่มยาใหม่</strong> — ความดันยังสูงกว่าเป้าหมาย ควรพิจารณาเพิ่มโดสยาเดิม หรือเพิ่มยากลุ่มใหม่เข้าในสูตรการรักษา</div>
        )}
        {recommendation.type === 'REDUCE' && (
          <div><strong>แนะนำลดขนาดยา</strong> — ความดันต่ำเกินไปหรืออัตราการเต้นหัวใจช้า ควรลดโดสยาที่ใช้อยู่</div>
        )}
        {recommendation.type === 'SWITCH' && (
          <div><strong>แนะนำเปลี่ยนกลุ่มยา</strong> — ยาปัจจุบันอาจไม่เหมาะสมหรือมีผลข้างเคียง พิจารณาเปลี่ยนเป็นยากลุ่มอื่น</div>
        )}
        {recommendation.type === 'MONITOR' && (
          <div><strong>ใช้ยาตามเดิมและติดตามอาการใกล้ชิด</strong> — ความดันอยู่ในเกณฑ์ชายแดน ยังไม่ต้องปรับยา แต่ควรนัดติดตามในระยะเวลาสั้น</div>
        )}
      </div>

      <div className={styles.aiNote} style={{ marginTop: 12 }}>
        <strong>คำแนะนำนี้เป็นเพียงข้อมูลประกอบการตัดสินใจทางคลินิก</strong>
        {' '}การตัดสินใจขั้นสุดท้ายอยู่ที่ดุลพินิจของแพทย์
      </div>

      <div className={styles.btnRow}>
        <button className={styles.btnS} onClick={onBack}>← กลับ</button>
        <button className={styles.btnP} onClick={onNext}>ดูสรุปและบันทึก →</button>
      </div>
    </div>
  )
}
