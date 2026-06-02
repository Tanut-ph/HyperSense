'use client'
import { useState } from 'react'
import type { CardioPatient, RiskResult } from '@/lib/types'
import styles from './HyperSense.module.css'

// ─── Linear Regression ──────────────────────────────────────────────────────
function linReg(ys: number[]) {
  const n = ys.length
  const xs = ys.map((_, i) => i)
  const mx = (n - 1) / 2
  const my = ys.reduce((a, b) => a + b, 0) / n
  const num = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0)
  const den = xs.reduce((s, x) => s + (x - mx) ** 2, 0)
  const m = den === 0 ? 0 : num / den
  const b = my - m * mx
  return { m, b, predict: (x: number) => m * x + b }
}

// ─── SVG BP Chart ───────────────────────────────────────────────────────────
function BPChart({ patient, risk }: { patient: CardioPatient; risk: RiskResult }) {
  const visits = patient.visits
  const W = 600, H = 210
  const padL = 44, padR = 60, padT = 16, padB = 40

  const sbps = visits.map(v => v.sbp)
  const dbps = visits.map(v => v.dbp)
  const n    = visits.length

  // Regression on SBP
  const reg = linReg(sbps)
  const pred1 = Math.round(reg.predict(n))      // +1 month
  const pred2 = Math.round(reg.predict(n + 2))  // +3 months

  const allVals = [...sbps, ...dbps, pred1, pred2]
  const minV = Math.max(50, Math.floor((Math.min(...allVals) - 14) / 10) * 10)
  const maxV = Math.ceil((Math.max(...allVals) + 14) / 10) * 10

  const cW = W - padL - padR
  const cH = H - padT - padB

  const xS = (i: number) => padL + (i / (n + 2)) * cW    // +3 extra for prediction
  const yS = (v: number) => padT + cH - ((v - minV) / (maxV - minV)) * cH

  const sbpPath = visits.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xS(i).toFixed(1)} ${yS(v.sbp).toFixed(1)}`).join(' ')
  const dbpPath = visits.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xS(i).toFixed(1)} ${yS(v.dbp).toFixed(1)}`).join(' ')

  // Trend line: from first to last real point, extended to n+2
  const trendStart = { x: xS(0), y: yS(reg.predict(0)) }
  const trendEnd   = { x: xS(n + 2), y: yS(reg.predict(n + 2)) }
  const trendPath  = `M ${trendStart.x.toFixed(1)} ${trendStart.y.toFixed(1)} L ${trendEnd.x.toFixed(1)} ${trendEnd.y.toFixed(1)}`

  const targetY = yS(patient.bpTarget)
  const yticks  = [minV, Math.round((minV + maxV) / 2), maxV]

  const fmt = (d: string) => {
    const dt = new Date(d)
    return `${dt.toLocaleString('th-TH', { month: 'short' })}`
  }

  const trendColor = reg.m > 0 ? '#e55039' : reg.m < 0 ? '#00b894' : '#f39c12'

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {/* Target zone */}
      <rect x={padL} y={padT} width={cW + padR} height={targetY - padT} fill="rgba(0,184,148,0.07)" />
      <line x1={padL} y1={targetY} x2={padL + cW + padR} y2={targetY}
        stroke="rgba(0,184,148,0.55)" strokeWidth={1.2} strokeDasharray="5,4" />
      <text x={padL + cW + padR + 2} y={targetY + 4} fontSize={8} fill="#00a872">目標</text>

      {/* Gridlines */}
      {yticks.map(v => {
        const y = yS(v)
        return (
          <g key={v}>
            <line x1={padL} y1={y} x2={padL + cW + padR} y2={y} stroke="rgba(0,160,114,0.1)" strokeWidth={1} />
            <text x={padL - 5} y={y + 4} textAnchor="end" fontSize={9} fill="#7aaa90">{v}</text>
          </g>
        )
      })}

      {/* Prediction region divider */}
      <line x1={xS(n - 0.5)} y1={padT} x2={xS(n - 0.5)} y2={padT + cH}
        stroke="rgba(150,150,150,0.3)" strokeWidth={1} strokeDasharray="3,3" />
      <text x={xS(n - 0.5) + 4} y={padT + 12} fontSize={8} fill="#aaa">← จริง │ คาดการณ์ →</text>

      {/* Trend / Regression line */}
      <path d={trendPath} fill="none" stroke={trendColor} strokeWidth={1.5}
        strokeDasharray="7,4" opacity={0.7} />

      {/* DBP line */}
      <path d={dbpPath} fill="none" stroke="#00a872" strokeWidth={2} strokeLinejoin="round" />
      {/* SBP line */}
      <path d={sbpPath} fill="none" stroke="#e55039" strokeWidth={2.5} strokeLinejoin="round" />

      {/* Predicted points */}
      {[pred1, pred2].map((pv, pi) => {
        const ix = n + pi
        return (
          <g key={pi}>
            <circle cx={xS(ix)} cy={yS(pv)} r={5} fill="none" stroke={trendColor} strokeWidth={2} strokeDasharray="3,2" />
            <text x={xS(ix)} y={yS(pv) - 8} textAnchor="middle" fontSize={9} fill={trendColor} fontWeight="700">{pv}</text>
            <text x={xS(ix)} y={H - 6} textAnchor="middle" fontSize={8} fill="#aaa">
              +{(pi + 1) === 1 ? '1 เดือน' : '3 เดือน'}
            </text>
          </g>
        )
      })}

      {/* Real data points */}
      {visits.map((v, i) => (
        <g key={i}>
          <circle cx={xS(i)} cy={yS(v.sbp)} r={4} fill="#e55039" stroke="#fff" strokeWidth={1.5} />
          <circle cx={xS(i)} cy={yS(v.dbp)} r={3} fill="#00a872" stroke="#fff" strokeWidth={1.5} />
          <text x={xS(i)} y={H - 6} textAnchor="middle" fontSize={8.5} fill="#7aaa90">{fmt(v.date)}</text>
        </g>
      ))}

      {/* Legend */}
      <circle cx={padL + 4} cy={padT + 10} r={3} fill="#e55039" />
      <text x={padL + 12} y={padT + 14} fontSize={9} fill="#3d6b52">SBP</text>
      <circle cx={padL + 42} cy={padT + 10} r={3} fill="#00a872" />
      <text x={padL + 50} y={padT + 14} fontSize={9} fill="#3d6b52">DBP</text>
      <line x1={padL + 82} y1={padT + 10} x2={padL + 96} y2={padT + 10}
        stroke={trendColor} strokeWidth={1.5} strokeDasharray="4,3" />
      <text x={padL + 100} y={padT + 14} fontSize={9} fill="#3d6b52">Trend (ML)</text>
    </svg>
  )
}

// ─── Trend Interpretation ───────────────────────────────────────────────────
function TrendInterpretation({ risk, bpTarget, sbps }: { risk: RiskResult; bpTarget: number; sbps: number[] }) {
  const reg = linReg(sbps)
  const n   = sbps.length
  const pred1 = Math.round(reg.predict(n))
  const pred3 = Math.round(reg.predict(n + 2))

  const trendDesc = reg.m > 1.5 ? { label: 'เพิ่มขึ้นอย่างมีนัยสำคัญ', color: '#e55039', icon: '📈' }
    : reg.m > 0.3 ? { label: 'เพิ่มขึ้นเล็กน้อย', color: '#e67e22', icon: '↗️' }
    : reg.m < -1.5 ? { label: 'ลดลงอย่างดี', color: '#00b894', icon: '📉' }
    : reg.m < -0.3 ? { label: 'ลดลงเล็กน้อย', color: '#00b894', icon: '↘️' }
    : { label: 'คงที่', color: '#f39c12', icon: '→' }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
      <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--rs)', padding: '14px' }}>
        <div className={styles.lbl} style={{ marginBottom: 8 }}>🤖 ML Trend Analysis</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: trendDesc.color, marginBottom: 6 }}>
          {trendDesc.icon} SBP {trendDesc.label}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.8 }}>
          • ความชัน (slope): <strong style={{ fontFamily: 'var(--mono)' }}>{reg.m.toFixed(2)} mmHg/visit</strong><br />
          • คาดการณ์ 1 เดือน: <strong style={{ fontFamily: 'var(--mono)', color: pred1 > bpTarget ? '#e55039' : '#00b894' }}>{pred1} mmHg</strong><br />
          • คาดการณ์ 3 เดือน: <strong style={{ fontFamily: 'var(--mono)', color: pred3 > bpTarget ? '#e55039' : '#00b894' }}>{pred3} mmHg</strong>
        </div>
      </div>
      <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--rs)', padding: '14px' }}>
        <div className={styles.lbl} style={{ marginBottom: 8 }}>📊 สถิติ BP</div>
        {[
          ['SBP เฉลี่ย', `${risk.avgSBP} mmHg`, risk.avgSBP > bpTarget],
          ['DBP เฉลี่ย', `${risk.avgDBP} mmHg`, risk.avgDBP > 90],
          ['BP Variability (σ)', `${risk.bpVariability} mmHg`, risk.bpVariability > 10],
          ['Cumulative SBP', `${risk.cumulativeSBP} mmHg`, false],
        ].map(([k, v, warn]) => (
          <div key={String(k)} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--text2)' }}>{k}</span>
            <span style={{ fontWeight: 700, fontFamily: 'var(--mono)', color: warn ? '#e67e22' : 'var(--text)' }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function BPTrendPage({
  patient, risk, onBack, onNext,
}: {
  patient: CardioPatient
  risk: RiskResult
  onBack: () => void
  onNext: () => void
}) {
  const sbps = patient.visits.map(v => v.sbp)
  const fmt = (d: string) => new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
  const [tableExpanded, setTableExpanded] = useState(true)

  return (
    <div>
      <div className={styles.stepHdr}>
        <span className={styles.stepNum}>03 / 05</span>
        <h1 className={styles.stepTitle}>BP Trend + ML Prediction</h1>
      </div>
      <p className={styles.stepDesc}>
        กราฟแนวโน้มความดัน {patient.visits.length} visit + คาดการณ์จาก Linear Regression — {patient.name}
      </p>

      {/* Chart */}
      <div className={styles.chartWrap}>
        <div className={styles.chartTitle}>📈 SBP / DBP Timeline พร้อม Trend Line (ML)</div>
        <BPChart patient={patient} risk={risk} />

        {/* BP stat badges */}
        <div className={styles.bpStatGrid}>
          <div className={styles.bpStat}>
            <div className={[styles.bpStatVal, styles.bpStatSbp].join(' ')}>{risk.lastSBP}</div>
            <div className={styles.bpStatLabel}>SBP ล่าสุด</div>
          </div>
          <div className={styles.bpStat}>
            <div className={[styles.bpStatVal, styles.bpStatDbp].join(' ')}>{risk.lastDBP}</div>
            <div className={styles.bpStatLabel}>DBP ล่าสุด</div>
          </div>
          <div className={styles.bpStat}>
            <div className={[styles.bpStatVal, risk.bpVariability > 10 ? styles.bpStatVar : ''].join(' ')}>
              {risk.bpVariability}
            </div>
            <div className={styles.bpStatLabel}>BPV (σ)</div>
          </div>
          <div className={styles.bpStat}>
            <span className={[
              styles.trendBadge,
              risk.bpTrend === 'Increasing' ? styles.trendUp : risk.bpTrend === 'Decreasing' ? styles.trendDown : styles.trendStable,
            ].join(' ')}>
              {risk.bpTrend === 'Increasing' ? '↑ เพิ่ม' : risk.bpTrend === 'Decreasing' ? '↓ ลด' : '→ คงที่'}
            </span>
            <div className={styles.bpStatLabel} style={{ marginTop: 4 }}>Trend</div>
          </div>
        </div>
      </div>

      {/* ML Interpretation */}
      <TrendInterpretation risk={risk} bpTarget={patient.bpTarget} sbps={sbps} />

      {/* Visit table */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 8 }}>
        <div className={styles.lbl} style={{ marginBottom: 0 }}>ตารางค่าความดันทุก Visit</div>
        <button
          onClick={() => setTableExpanded(p => !p)}
          style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px' }}
        >
          {tableExpanded ? '▲ ย่อตาราง' : '▼ ขยายตาราง'}
        </button>
      </div>
      {tableExpanded && (
        <div style={{ overflow: 'hidden', borderRadius: 'var(--rs)', border: '1px solid var(--border)', marginBottom: 8 }}>
          <table className={styles.medTable}>
            <thead>
              <tr><th>#</th><th>วันที่</th><th>SBP</th><th>DBP</th><th>HR</th><th>Weight</th></tr>
            </thead>
            <tbody>
              {patient.visits.map((v, i) => {
                const isLast = i === patient.visits.length - 1
                return (
                  <tr key={i} style={isLast ? { background: 'rgba(0,168,114,.04)' } : {}}>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)' }}>V{i + 1}{isLast ? ' ★' : ''}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{fmt(v.date)}</td>
                    <td style={{ fontWeight: 700, color: v.sbp > 140 ? '#e55039' : 'var(--text)' }}>{v.sbp}</td>
                    <td>{v.dbp}</td>
                    <td style={{ color: v.heartRate < 55 ? '#e67e22' : 'var(--text)' }}>{v.heartRate}</td>
                    <td>{v.weight} kg</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className={styles.aiNote}>
        🤖 <strong>ML Model:</strong> Linear Regression บน SBP time-series ใช้เพื่อคาดการณ์แนวโน้ม
        — ในระบบ production จะใช้ XGBoost / LSTM สำหรับ multi-feature prediction
      </div>

      <div className={styles.btnRow}>
        <button className={styles.btnS} onClick={onBack}>← กลับ</button>
        <button className={styles.btnP} onClick={onNext}>ประเมินความเสี่ยง + ยา →</button>
      </div>
    </div>
  )
}
