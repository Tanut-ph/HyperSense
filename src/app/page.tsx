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
import type { CardioPatient, BPVisit, RiskResult, MedRecommendation } from '@/lib/types'

export default function Home() {
  const [loggedIn,    setLoggedIn]    = useState(false)
  const [doctorName,  setDoctorName]  = useState('')
  const [userRole,    setUserRole]    = useState<UserRole>('doctor')
  const [step,        setStep]        = useState<CardioStep>(1)

  const [basePatient, setBasePatient] = useState<CardioPatient | null>(null)
  const [newBPVisit,  setNewBPVisit]  = useState<BPVisit | null>(null)
  const [riskResult,  setRiskResult]  = useState<RiskResult | null>(null)
  const [medRec,      setMedRec]      = useState<MedRecommendation | null>(null)

  const effectivePatient = useMemo<CardioPatient | null>(() => {
    if (!basePatient) return null
    if (newBPVisit)   return { ...basePatient, visits: [...basePatient.visits, newBPVisit] }
    return basePatient
  }, [basePatient, newBPVisit])

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
    setBasePatient(p); setNewBPVisit(null)
    setRiskResult(null); setMedRec(null)
    go(3)
  }

  const handlePatientNext = (newVisit: BPVisit | null) => {
    setNewBPVisit(newVisit)
    const patient = newVisit
      ? { ...basePatient!, visits: [...basePatient!.visits, newVisit] }
      : basePatient!
    const risk = calculateRisk(patient)
    const rec  = getMedicationRecommendation(patient, risk)
    setRiskResult(risk); setMedRec(rec)
    go(4)
  }

  const handleHome = () => {
    setBasePatient(null); setNewBPVisit(null)
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

      {step === 3 && basePatient && (
        <PatientDetailPage
          patient={basePatient}
          doctorName={doctorName}
          userRole={userRole}
          onBack={() => go(2)}
          onNext={handlePatientNext}
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
