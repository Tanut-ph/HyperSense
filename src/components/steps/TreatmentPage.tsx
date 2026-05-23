'use client'
import { useState } from 'react'
import { Patient } from '@/lib/patient'
import { Card, Label, Title, Desc, BtnRow, Divider } from '@/components/UI'
import styles from './Steps.module.css'

interface DrugRow {
  disease: string
  diseaseCls: string
  name: string
  dose: string
  usage: string
  note: string
}

const ALL_DRUGS: DrugRow[] = [
  // Diabetes
  { disease: 'เบาหวาน T2DM',    diseaseCls: 'Diab', name: 'Metformin',          dose: '500 mg',  usage: '2 ครั้ง/วัน พร้อมอาหาร',   note: 'First-line สำหรับ T2DM' },
  { disease: 'เบาหวาน T2DM',    diseaseCls: 'Diab', name: 'Sitagliptin',         dose: '100 mg',  usage: '1 ครั้ง/วัน',              note: 'ทางเลือกเสริม Metformin' },
  // CRC prevention
  { disease: 'มะเร็งลำไส้ใหญ่', diseaseCls: 'Crc',  name: 'Aspirin low-dose',   dose: '81 mg',   usage: '1 ครั้ง/วัน หลังอาหาร',    note: 'ป้องกัน เฝ้าระวัง' },
  { disease: 'มะเร็งลำไส้ใหญ่', diseaseCls: 'Crc',  name: 'Colonoscopy follow-up', dose: '—',   usage: 'ทุก 3–5 ปี',               note: 'ตามดุลยพินิจแพทย์' },
  // Dyslipidemia
  { disease: 'ไขมันในเลือดสูง', diseaseCls: 'Dysl', name: 'Atorvastatin',        dose: '20 mg',   usage: '1 ครั้ง/วัน ก่อนนอน',     note: 'ปรับตาม LDL เป้าหมาย' },
  { disease: 'ไขมันในเลือดสูง', diseaseCls: 'Dysl', name: 'Fenofibrate',         dose: '160 mg',  usage: '1 ครั้ง/วัน พร้อมอาหาร',   note: 'ถ้า Triglyceride สูง' },
]

const LIFESTYLE = [
  { ico: '🏃', title: 'ออกกำลังกาย',       desc: 'อย่างน้อย 150 นาที/สัปดาห์ แบบ aerobic เพื่อลดน้ำตาลและไขมัน' },
  { ico: '🥗', title: 'ควบคุมอาหาร',       desc: 'ลด carbohydrate และ saturated fat เพิ่ม fiber ผัก ผลไม้ไม่หวาน' },
  { ico: '⚖️', title: 'ลดน้ำหนัก',        desc: 'ลด BMI ให้ต่ำกว่า 25 ช่วยลดความเสี่ยงเบาหวานและไขมันได้อย่างมีนัยสำคัญ' },
  { ico: '🚭', title: 'งดสูบบุหรี่',       desc: 'ลดความเสี่ยงมะเร็งและโรคหัวใจได้ทันที ขอรับคำปรึกษาได้ที่ 1600' },
  { ico: '😴', title: 'นอนหลับพักผ่อน',   desc: '7–8 ชั่วโมงต่อคืน ช่วยควบคุมฮอร์โมนและน้ำตาลในเลือด' },
  { ico: '🩺', title: 'ติดตามสุขภาพ',     desc: 'ตรวจเลือดและพบแพทย์ตามนัด เพื่อปรับยาและประเมินความเสี่ยงอย่างต่อเนื่อง' },
]

function getDiseaseRows(p: Patient): DrugRow[] {
  const rows: DrugRow[] = []
  if (p.risks.diabetes >= 30) rows.push(...ALL_DRUGS.filter(d => d.diseaseCls === 'Diab'))
  if (p.risks.crc      >= 30) rows.push(...ALL_DRUGS.filter(d => d.diseaseCls === 'Crc'))
  if (p.risks.dyslip   >= 30) rows.push(...ALL_DRUGS.filter(d => d.diseaseCls === 'Dysl'))
  if (rows.length === 0) rows.push(...ALL_DRUGS.filter(d => d.diseaseCls === 'Dysl'))
  return rows
}

export default function TreatmentPage({
  patient: p,
  onBack,
  onNext,
}: {
  patient: Patient
  onBack: () => void
  onNext: () => void
}) {
  const drugs = getDiseaseRows(p)
  const [selectedDrugs, setSelectedDrugs] = useState<string[]>(
    drugs.map(d => d.name)
  )

  const toggleDrug = (name: string) => {
    setSelectedDrugs(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    )
  }

  return (
    <Card>
      <Label>ขั้นตอนที่ 06 — ยาและการรักษา</Label>
      <Title>ตารางยาที่แนะนำและวิธีการรักษา</Title>
      <Desc>ยาที่แนะนำตามผลวิเคราะห์ความเสี่ยง กรุณาตรวจสอบและยืนยันก่อนบันทึก</Desc>

      {/* Drug recommendations table */}
      <Label>ยาที่แนะนำ (Recommended Medications)</Label>
      <div className={styles.drugTableWrap}>
        <table className={styles.drugTable}>
          <thead>
            <tr>
              <th style={{ width: 32 }}>✓</th>
              <th>โรค</th>
              <th>ชื่อยา</th>
              <th>ขนาดยา</th>
              <th>วิธีการใช้</th>
              <th>หมายเหตุ</th>
            </tr>
          </thead>
          <tbody>
            {drugs.map((d, i) => (
              <tr key={i}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedDrugs.includes(d.name)}
                    onChange={() => toggleDrug(d.name)}
                    style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer' }}
                  />
                </td>
                <td>
                  <span className={[
                    styles.diseaseBadge,
                    d.diseaseCls === 'Diab' ? styles.diseaseBadgeDiab :
                    d.diseaseCls === 'Crc'  ? styles.diseaseBadgeCrc  :
                    styles.diseaseBadgeDysl
                  ].join(' ')}>
                    {d.disease}
                  </span>
                </td>
                <td><div className={styles.drugName}>{d.name}</div></td>
                <td><div className={styles.drugDose}>{d.dose}</div></td>
                <td>{d.usage}</td>
                <td><div className={styles.drugNote}>{d.note}</div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Divider />

      {/* Lifestyle recommendations */}
      <Label>คำแนะนำการปรับพฤติกรรม (Lifestyle Recommendations)</Label>
      <div style={{ background: 'var(--bg3)', borderRadius: 'var(--rs)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        <table className={styles.lifeTable}>
          <tbody>
            {LIFESTYLE.map((l, i) => (
              <tr key={i}>
                <td className={styles.lifeIco}>{l.ico}</td>
                <td>
                  <div className={styles.lifeTitle}>{l.title}</div>
                  <div className={styles.lifeDesc}>{l.desc}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <BtnRow>
        <button className={styles.btnS} onClick={onBack}>← กลับ</button>
        <button className={styles.btnP} onClick={onNext}>ส่งต่อผู้ป่วย →</button>
      </BtnRow>
    </Card>
  )
}
