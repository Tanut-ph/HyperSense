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

export default function Home() {
  const [loggedIn,    setLoggedIn]    = useState(false)
  const [doctorName,  setDoctorName]  = useState('')
  const [userRole,    setUserRole]    = useState<UserRole>('doctor')
  const [step,        setStep]        = useState<CardioStep>(1)

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
    setDoctorName(name)
    setUserRole(role)
    setLoggedIn(true)
    go(2)
  }

  const handleLogout = () => {
    setLoggedIn(false); setDoctorName(''); setStep(1); setUserRole('doctor')
    setBasePatient(null); setNewBPVisit(null)
    setRiskResult(null); setMedRec(null)
  }

  const handlePatientFound = (p: CardioPatient) => {
    setBasePatient(p); setNewBPVisit(null); setNewLabs(null)
    setRiskResult(null); setMedRec(null)
    go(3)
  }

  const handlePatientNext = (newVisit: BPVisit | null) => {
    setNewBPVisit(newVisit)
    let patient: CardioPatient = basePatient!
    if (newVisit) patient = { ...patient, visits: [...patient.visits, newVisit] }
    if (newLabs)  patient = { ...patient, labs: { ...patient.labs, ...newLabs } }
    const risk = calculateRisk(patient)
    const rec  = getMedicationRecommendation(patient, risk)
    setRiskResult(risk); setMedRec(rec)
    go(4)
  }

  const handleNurseDone = () => go(2)

  // nurse เลือกไปหน้านัดหมาย
  const handleNurseNext = (newVisit: BPVisit, selectedDoc: string) => {
    setNewBPVisit(newVisit)
    // อัปเดต treatingDoctor ใน basePatient (ไม่เพิ่ม visit ซ้ำ — effectivePatient จัดการเอง)
    let updated: CardioPatient = basePatient!
    if (selectedDoc) {
      updated = { ...updated, treatingDoctor: selectedDoc }
    } else if (!updated.treatingDoctor) {
      updated = { ...updated, treatingDoctor: doctorName }
    }
    setBasePatient(updated)
    // คำนวณ risk จาก patient เต็ม (รวม visit ใหม่)
    let full = { ...updated, visits: [...updated.visits, newVisit] }
    if (newLabs) full = { ...full, labs: { ...full.labs, ...newLabs } }
    const risk = calculateRisk(full)
    const rec  = getMedicationRecommendation(full, risk)
    setRiskResult(risk); setMedRec(rec)
    go(4)
  }

  const handleHome = () => {
    setBasePatient(null); setNewBPVisit(null); setNewLabs(null)
    setRiskResult(null);  setMedRec(null)
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
      <StepIndicator step={step} />

      {step === 2 && (
        <PatientSearchPage onFound={handlePatientFound} onBack={handleLogout} />
      )}

      {step === 3 && effectivePatient && (
        <PatientDetailPage
          patient={effectivePatient}
          doctorName={doctorName}
          userRole={userRole}
          onBack={() => go(2)}
          onNext={handlePatientNext}
          onNurseDone={handleNurseDone}
          onNurseNext={handleNurseNext}
        />
      )}

      {step === 4 && effectivePatient && riskResult && (
        <BPTrendPage
          patient={effectivePatient}
          risk={riskResult}
          onBack={() => go(3)}
          onNext={() => go(5)}
        />
      )}

      {step === 5 && effectivePatient && riskResult && medRec && (
        <RiskMedicationPage
          patient={effectivePatient}
          risk={riskResult}
          recommendation={medRec}
          onBack={() => go(4)}
          onNext={() => go(6)}
        />
      )}

      {step === 6 && effectivePatient && riskResult && medRec && (
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
