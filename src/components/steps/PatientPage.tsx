import { Patient } from '@/lib/patient'
import { Card, Label, Title, Desc, BtnRow, Divider } from '@/components/UI'
import styles from './Steps.module.css'

const DOT_COLOR: Record<string, string> = {
  green: 'var(--green)',
  yellow: 'var(--warn)',
  blue: 'var(--accent)',
}

export default function PatientPage({
  patient: p,
  onBack,
  onNext,
}: {
  patient: Patient
  onBack: () => void
  onNext: () => void
}) {
  const bmiStatus = p.bmi >= 25 ? styles.warn : ''
  const glucoseStatus = p.glucose >= 126 ? styles.warn : ''

  return (
    <Card>
      <Label>ขั้นตอนที่ 02 — ข้อมูลผู้ป่วย</Label>

      {/* Header row: avatar + info + rights badges */}
      <div className={styles.ptHdr}>
        <div className={styles.ptAv}>{p.name[0]}</div>
        <div style={{ flex: 1 }}>
          <div className={styles.ptName}>{p.name}</div>
          <div className={styles.ptMeta}>
            อายุ {p.age} ปี · เพศ{p.sex} · น้ำหนัก {p.weight} kg / {p.height} cm
          </div>
          <div className={styles.ptId}>{p.id} · {p.nationalId}</div>

          {/* Rights + blood type badges */}
          <div className={styles.ptBadgeRow}>
            <span className={styles.badge30}>✅ สิทธิ์ 30 บาท (บัตรทอง)</span>
            <span className={styles.badgeBlood}>🩸 กรุ๊ปเลือด {p.blood}</span>
          </div>
        </div>
      </div>

      {/* Vital stats grid */}
      <div className={styles.igrid}>
        <div className={styles.ibox}>
          <div className={styles.iboxL}>น้ำหนัก / ส่วนสูง</div>
          <div className={styles.iboxV}>{p.weight} kg / {p.height} cm</div>
        </div>
        <div className={styles.ibox}>
          <div className={styles.iboxL}>BMI</div>
          <div className={[styles.iboxV, bmiStatus].join(' ')}>
            {p.bmi} {p.bmi >= 25 ? '⚠️ เกินเกณฑ์' : '✅ ปกติ'}
          </div>
        </div>
        <div className={styles.ibox}>
          <div className={styles.iboxL}>ความดันโลหิต</div>
          <div className={styles.iboxV}>{p.bp} mmHg</div>
        </div>
        <div className={styles.ibox}>
          <div className={styles.iboxL}>น้ำตาลในเลือด</div>
          <div className={[styles.iboxV, glucoseStatus].join(' ')}>
            {p.glucose} mg/dL {p.glucose >= 126 ? '⚠️' : ''}
          </div>
        </div>
        <div className={styles.ibox}>
          <div className={styles.iboxL}>คอเลสเตอรอล</div>
          <div className={styles.iboxV}>{p.chol} mg/dL</div>
        </div>
        <div className={styles.ibox}>
          <div className={styles.iboxL}>สูบบุหรี่</div>
          <div className={styles.iboxV}>{p.smoking}</div>
        </div>
      </div>

      {/* Medications */}
      {p.meds.length > 0 && (
        <>
          <Label>ยาที่ใช้ปัจจุบัน</Label>
          <div className={styles.drugs} style={{ marginBottom: 16 }}>
            {p.meds.map(m => (
              <span key={m} className={styles.dtag}>{m}</span>
            ))}
          </div>
        </>
      )}

      <Divider />

      {/* Treatment history */}
      <Label>ประวัติการรักษา</Label>
      <div className={styles.hist}>
        {p.history.length === 0 && (
          <div className={styles.histItem} style={{ color: 'var(--text3)' }}>
            ยังไม่มีประวัติการรักษาในระบบ
          </div>
        )}
        {p.history.map((h, i) => (
          <div key={i} className={styles.histItem}>
            <div className={styles.histDot} style={{ background: DOT_COLOR[h.type] }} />
            <span style={{ flex: 1 }}>{h.note}</span>
            <div className={styles.histDate}>{h.date}</div>
          </div>
        ))}
      </div>

      <BtnRow>
        <button className={styles.btnS} onClick={onBack}>← กลับ</button>
        <button className={styles.btnP} onClick={onNext}>ดำเนินการต่อ →</button>
      </BtnRow>
    </Card>
  )
}
