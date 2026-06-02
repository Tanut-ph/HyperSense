import type { UserRole } from '@/lib/types'
import styles from './StepIndicator.module.css'

export type CardioStep = 1 | 2 | 3 | 4 | 5 | 6 | 7

const DOCTOR_STEPS = ['ค้นหาผู้ป่วย', 'ข้อมูลผู้ป่วย', 'BP Trend', 'ความเสี่ยง + ยา', 'สรุปและบันทึก']
const NURSE_STEPS  = ['ค้นหาผู้ป่วย', 'กรอกค่าความดัน']
const MEDTECH_STEPS = ['ค้นหาผู้ป่วย', 'กรอกผลแลป']

export default function CardioStepIndicator({ step, userRole = 'doctor' }: { step: CardioStep; userRole?: UserRole }) {
  const activeIdx = step - 2   // step 2 = search (index 0)
  if (step < 2) return null

  const STEPS = userRole === 'nurse' ? NURSE_STEPS : userRole === 'medtech' ? MEDTECH_STEPS : DOCTOR_STEPS

  return (
    <div className={styles.steps}>
      {STEPS.map((label, i) => (
        <div key={i} className={[
          styles.stp,
          activeIdx === i ? styles.active : '',
          activeIdx > i  ? styles.done  : '',
        ].join(' ')}>
          <span className={styles.num}>0{i + 1}</span>
          {label}
        </div>
      ))}
    </div>
  )
}
