'use client'
import { useState } from 'react'
import StepIndicator from '@/components/StepIndicator'
import Header from '@/components/Header'
import LoginPage from '@/components/steps/LoginPage'
import SearchPage from '@/components/steps/SearchPage'
import PatientPage from '@/components/steps/PatientPage'
import ModePage from '@/components/steps/ModePage'
import DnaUploadPage from '@/components/steps/DnaUploadPage'
import AnalysisPage from '@/components/steps/AnalysisPage'
import TreatmentPage from '@/components/steps/TreatmentPage'
import ReferPage from '@/components/steps/ReferPage'
import ConfirmPage from '@/components/steps/ConfirmPage'
import { findPatient, Patient } from '@/lib/patient'

export type Mode = 'analyze' | 'refer' | null
export type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

export default function Home() {
  const [loggedIn, setLoggedIn]   = useState(false)
  const [doctorName, setDoctorName] = useState('')
  const [step, setStep]           = useState<Step>(1)
  const [mode, setMode]           = useState<Mode>(null)
  const [patient, setPatient]     = useState<Patient | null>(null)
  const [vcfDone, setVcfDone]     = useState(false)
  const [confirmData, setConfirmData] = useState<Record<string, string>>({})
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError]     = useState('')

  const go = (s: Step) => {
    setStep(s)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleLogin = (name: string) => {
    setDoctorName(name)
    setLoggedIn(true)
  }

  const handleSearch = async (params: { patientCode?: string; nationalId?: string }) => {
    setSearchLoading(true)
    setSearchError('')
    try {
      const found = await findPatient(params)
      setPatient(found)
      go(2)
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'ค้นหาผู้ป่วยไม่สำเร็จ')
    } finally {
      setSearchLoading(false)
    }
  }

  // Accumulate analysis data then go to treatment page (step 6)
  const handleAnalysisNext = (data: Record<string, string>) => {
    setConfirmData(prev => ({ ...prev, ...data }))
    go(6)
  }

  // After treatment, go to referral (step 7)
  const handleTreatmentNext = () => {
    go(7)
  }

  // Referral confirm for analyze mode → step 8 (confirm)
  const handleAnalysisReferConfirm = (data: Record<string, string>) => {
    setConfirmData(prev => ({ ...prev, ...data }))
    go(8)
  }

  // Referral confirm for refer mode → step 5 (confirm)
  const handleReferConfirm = (data: Record<string, string>) => {
    setConfirmData(data)
    go(5)
  }

  const reset = () => {
    setStep(1); setMode(null); setPatient(null)
    setVcfDone(false); setConfirmData({}); setSearchError('')
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
    <main style={{ position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto', padding: '20px 16px 80px' }}>
      <Header doctorName={doctorName} />
      <StepIndicator step={step} mode={mode} />

      {/* Step 1: Search */}
      {step === 1 && (
        <SearchPage onSearch={handleSearch} loading={searchLoading} error={searchError} />
      )}

      {/* Step 2: Patient Info */}
      {step === 2 && patient && (
        <PatientPage patient={patient} onBack={() => go(1)} onNext={() => go(3)} />
      )}

      {/* Step 3: Mode select */}
      {step === 3 && (
        <ModePage mode={mode} onSelect={setMode} onBack={() => go(2)} onNext={() => go(4)} />
      )}

      {/* Step 4: DNA upload (analyze) or Referral form (refer) */}
      {step === 4 && mode === 'analyze' && (
        <DnaUploadPage
          vcfDone={vcfDone}
          onVcfDone={() => setVcfDone(true)}
          onBack={() => go(3)}
          onNext={() => go(5)}
        />
      )}
      {step === 4 && mode === 'refer' && patient && (
        <ReferPage patient={patient} onBack={() => go(3)} onConfirm={handleReferConfirm} />
      )}

      {/* Step 5: Analysis (analyze) or Confirm (refer) */}
      {step === 5 && mode === 'analyze' && patient && (
        <AnalysisPage patient={patient} onBack={() => go(4)} onNext={handleAnalysisNext} />
      )}
      {step === 5 && mode === 'refer' && (
        <ConfirmPage mode={mode} data={confirmData} onReset={reset} />
      )}

      {/* Step 6: Treatment table (analyze only) */}
      {step === 6 && mode === 'analyze' && patient && (
        <TreatmentPage patient={patient} onBack={() => go(5)} onNext={handleTreatmentNext} />
      )}

      {/* Step 7: Referral after analysis (analyze only) */}
      {step === 7 && mode === 'analyze' && patient && (
        <ReferPage patient={patient} onBack={() => go(6)} onConfirm={handleAnalysisReferConfirm} />
      )}

      {/* Step 8: Confirm (analyze only) */}
      {step === 8 && mode === 'analyze' && (
        <ConfirmPage mode={mode} data={confirmData} onReset={reset} />
      )}
    </main>
  )
}
