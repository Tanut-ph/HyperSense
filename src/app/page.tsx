'use client'

import { useState, useMemo } from 'react'
import Header from '@/components/Header'
import type { UserRole } from '@/lib/types'

import LoginPage          from '@/components/LoginPage'
import StepIndicator, { type CardioStep } from '@/components/StepIndicator'
import PatientSearchPage  from '@/components/PatientSearchPage'
import PatientDetailPage  from '@/components/PatientDetailPage'
import BPTrendPage        from '@/components/BPTrendPage'
import RiskMedicationPage from '@/components/RiskMedicationPage'
import SummaryPage        from '@/components/SummaryPage'

import { calculateRisk }               from '@/lib/riskEngine'
import { getMedicationRecommendation } from '@/lib/medicationEngine'
import type { CardioPatient, BPVisit, RiskResult, MedRecommendation, PatientLab } from '@/lib/types'
import styles from '@/components/HyperSense.module.css'

export default function Home() {
  const [loggedIn,    setLoggedIn]    = useState(false)
  const [doctorName,  setDoctorName]  = useState('')
  const [userRole,    setUserRole]    = useState<UserRole>('doctor')
  const [step,        setStep]        = useState<CardioStep>(1)
  const [roleDone,    setRoleDone]    = useState(false)

  const [basePatient, setBasePatient] = useState<CardioPatient | null>(null)
  const [newBPVisit,  setNewBPVisit]  = useState<BPVisit | null>(null)
  const [newLabs,     setNewLabs]     = useState<Partial<PatientLab> | null>(null)
  const [riskResult,  setRiskResult]  = useState<RiskResult | null>(null)
  const [medRec,      setMedRec]      = useState<MedRecommendation | null>(null)

  const effectivePatient = useMemo<CardioPatient | null>(() => {
    if (!basePatient) return null
    let p: CardioPatient = basePatient
    if (newBPVisit) p = { ...p, visits: [...p.visits, newBPVisit] }
    if (newLabs)    p = { ...p, labs: { ...p.labs, ...newLabs } }
    return p
  }, [basePatient, newBPVisit, newLabs])

  const go = (s: CardioStep) => {
    setStep(s)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleLogin = (name: string, role: UserRole) => {
    setDoctorName(name); setUserRole(role); setLoggedIn(true); go(2)
  }

  const handleLogout = () => {
    setLoggedIn(false); setDoctorName(''); setStep(1); setUserRole('doctor')
    setBasePatient(null); setNewBPVisit(null); setNewLabs(null)
    setRiskResult(null); setMedRec(null); setRoleDone(false)
  }

  const handlePatientFound = (p: CardioPatient) => {
    setBasePatient(p); setNewBPVisit(null); setNewLabs(null)
    setRiskResult(null); setMedRec(null); setRoleDone(false)
    go(3)
  }

  // แพทย์: ไปต่อ BP Trend (หรือข้ามไปวิเคราะห์ยาหาก HBPM > Clinic)
  const handlePatientNext = (newVisit: BPVisit | null, hbpm?: { sbp: number; dbp: number }) => {
    setNewBPVisit(newVisit)
    let patient: CardioPatient = basePatient!
    if (newVisit) patient = { ...patient, visits: [...patient.visits, newVisit] }
    if (newLabs)  patient = { ...patient, labs: { ...patient.labs, ...newLabs } }
    const risk = calculateRisk(patient)
    const rec  = getMedicationRecommendation(patient, risk)
    setRiskResult(risk); setMedRec(rec)
    // ถ้ามี HBPM และ HBPM SBP สูงกว่า Clinic → ข้ามหน้า BP Trend ไปหน้าวิเคราะห์ยาเลย
    if (hbpm && newVisit && hbpm.sbp > newVisit.sbp) {
      go(5)
    } else {
      go(4)
    }
  }

  // พยาบาล/เทคนิคการแพทย์: กรอกข้อมูลของตัวเองเสร็จ → จบ
  const handleFinishRole = (newVisit: BPVisit | null) => {
    if (newVisit) setNewBPVisit(newVisit)
    setRoleDone(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleHome = () => {
    setBasePatient(null); setNewBPVisit(null); setNewLabs(null)
    setRiskResult(null);  setMedRec(null); setRoleDone(false)
    go(2)
  }

  if (!loggedIn) {
    return (
      <main style={{ position: 'relative', zIndex: 1, maxWidth: 860, margin: '0 auto', padding: '20px 16px 80px' }}>
        <Header />
        <LoginPage onLogin={handleLogin} />
      </main>
    )
  }

  return (
    <main style={{ position: 'relative', zIndex: 1, maxWidth: 960, margin: '0 auto', padding: '20px 16px 80px' }}>
      <Header doctorName={doctorName} userRole={userRole} onLogout={handleLogout} />
      {!roleDone && <StepIndicator step={step} userRole={userRole} />}

      {/* หน้าจอ "เสร็จสิ้น" สำหรับพยาบาล/เทคนิคการแพทย์ */}
      {roleDone && effectivePatient && (
        <div>
          <div className={styles.confirmBanner}>
            <div className={[styles.confirmCircle, styles.confirmCircleApprove].join(' ')}>
              <svg viewBox="0 0 40 40" style={{ width: 36, height: 36 }}>
                <polyline points="8,22 17,31 32,12" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className={styles.confirmTitle}>บันทึกข้อมูลเรียบร้อย</div>
            <div className={styles.confirmSub}>
              {effectivePatient.name} · {userRole === 'nurse' ? 'บันทึกค่าความดันโลหิต' : 'บันทึกผลตรวจทางห้องปฏิบัติการ'}แล้ว
            </div>
          </div>
          <div className={styles.aiNote}>
            ข้อมูลถูกส่งให้แพทย์ใช้ประกอบการตัดสินใจ — บทบาทของคุณเสร็จสิ้นแล้ว
          </div>
          <div className={styles.btnRow}>
            <button className={styles.btnP} onClick={handleHome}>ค้นหาผู้ป่วยใหม่</button>
          </div>
        </div>
      )}

      {!roleDone && step === 2 && (
        <PatientSearchPage onFound={handlePatientFound} onBack={handleLogout} />
      )}

      {!roleDone && step === 3 && effectivePatient && (
        <PatientDetailPage
          patient={effectivePatient}
          doctorName={doctorName}
          userRole={userRole}
          onBack={() => go(2)}
          onNext={(v, hbpm) => handlePatientNext(v, hbpm)}
          onFinish={handleFinishRole}
        />
      )}

      {!roleDone && step === 4 && effectivePatient && riskResult && (
        <BPTrendPage patient={effectivePatient} risk={riskResult} onBack={() => go(3)} onNext={() => go(5)} />
      )}

      {!roleDone && step === 5 && effectivePatient && riskResult && medRec && (
        <RiskMedicationPage patient={effectivePatient} risk={riskResult} recommendation={medRec} onBack={() => go(4)} onNext={() => go(6)} />
      )}

      {!roleDone && step === 6 && effectivePatient && riskResult && medRec && (
        <SummaryPage
          patient={effectivePatient}
          risk={riskResult}
          recommendation={medRec}
          doctorName={doctorName}
          userRole={userRole}
          onBack={() => go(5)}
          onHome={handleHome}
        />
      )}
    </main>
  )
}
