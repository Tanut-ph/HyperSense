'use client'
import type { CardioPatient, RiskResult, MedRecommendation } from '@/lib/types'
import styles from './HyperSense.module.css'

const LEVEL_BIG: Record<string, string> = {
  Low: styles.riskLevelLow, Moderate: styles.riskLevelModerate,
  High: styles.riskLevelHigh, Critical: styles.riskLevelCritical,
}
const LEVEL_TH: Record<string, string> = {
  Low: 'ความเสี่ยงต่ำ', Moderate: 'ความเสี่ยงปานกลาง',
  High: 'ความเสี่ยงสูง', Critical: 'ความเสี่ยงวิกฤต',
}

const REC_CFG = {
  CONTINUE:  { banner: styles.recBannerContinue,  type: styles.recTypeContinue,  label: 'CONTINUE' },
  INTENSIFY: { banner: styles.recBannerIntensify, type: styles.recTypeIntensify, label: 'INTENSIFY' },
  REDUCE:    { banner: styles.recBannerReduce,    type: styles.recTypeReduce,    label: 'REDUCE' },
  SWITCH:    { banner: styles.recBannerMonitor,   type: styles.recTypeMonitor,   label: 'SWITCH' },
  MONITOR:   { banner: styles.recBannerMonitor,   type: styles.recTypeMonitor,   label: 'MONITOR' },
  URGENT_REVIEW: { banner: styles.recBannerIntensify, type: styles.recTypeIntensify, label: 'INTENSIFY' },
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
  const topFactors = [...risk.riskFactors].sort((a, b) => b.weight - a.weight).slice(0, 5)

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
            Risk Score: <strong>{risk.riskScore}</strong>/100
          </div>
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

      {/* ── Feature Importance ───────────────────────────── */}
      <div className={styles.lbl}>ปัจจัยที่ส่งผลต่อความเสี่ยง (Risk Factors)</div>
      <div className={styles.riskFactorList} style={{ marginBottom: 18 }}>
        {topFactors.map((f, i) => {
          const cls = f.weight >= 15 ? styles.rfWeightHi : f.weight >= 8 ? styles.rfWeightMd : styles.rfWeightLo
          return (
            <div key={i} className={styles.riskFactor}>
              <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', minWidth: 18 }}>#{i + 1}</span>
              <span style={{ flex: 1 }}>{f.factor}</span>
              <span className={[styles.rfWeight, cls].join(' ')}>+{f.weight}</span>
            </div>
          )
        })}
      </div>

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

      {/* Reasons */}
      <div className={styles.lbl} style={{ marginTop: 14, marginBottom: 8 }}>เหตุผลการแนะนำ</div>
      <div className={styles.reasonList} style={{ marginBottom: 14 }}>
        {recommendation.reasons.map((r, i) => (
          <div key={i} className={styles.reasonItem}>
            <span className={styles.reasonBullet}>›</span>
            <span>{r}</span>
          </div>
        ))}
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
