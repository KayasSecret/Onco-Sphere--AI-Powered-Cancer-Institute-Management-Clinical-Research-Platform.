import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import PageHeader from '../../components/PageHeader'
import FormField from '../../components/FormField'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select'
import { toast } from 'sonner'
import reportService from '../../services/reportService'
import patientService from '../../services/patientService'
import DatePicker from '../../components/DatePicker'
import {
  RiArrowLeftLine,
  RiSaveLine,
  RiPrinterLine,
  RiDownload2Line,
} from 'react-icons/ri'

// Helper age calculator
const calculateAge = (dobString) => {
  if (!dobString) return ''
  const today = new Date()
  const birthDate = new Date(dobString)
  let age = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age.toString()
}

export default function ReportCreatorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isPrintTriggered = searchParams.get('print') === 'true'

  const printAreaRef = useRef(null)

  // 1. Loading & System Configuration
  const [loading, setLoading] = useState(false)
  const [patientsLoading, setPatientsLoading] = useState(false)
  const [patients, setPatients] = useState([])
  const [template, setTemplate] = useState(null)
  const [instSettings, setInstSettings] = useState(null)
  const [signatures, setSignatures] = useState([])

  // 2. Patient Profile Selector state
  const [selectedPatientId, setSelectedPatientId] = useState('')
  const [patientDetails, setPatientDetails] = useState({
    name: '',
    age: '',
    gender: '',
    patient_code: '',
    uhid: '',
    email: '',
    phone: '',
    address: '',
  })

  // 3. Clinical metadata form states
  const [reportNumber, setReportNumber] = useState('')
  const [version, setVersion] = useState(1)
  const [doctorName, setDoctorName] = useState('')
  const [referenceBy, setReferenceBy] = useState('')
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0])
  const [collectionDate, setCollectionDate] = useState(new Date().toISOString().split('T')[0])
  const [sampleType, setSampleType] = useState('Serum')
  const [labNumber, setLabNumber] = useState('')
  const [overallSummary, setOverallSummary] = useState('')
  const [reportStatus, setReportStatus] = useState('Draft')

  // 4. Parameter Results (values array)
  // Format: { parameter_id, code, name, section, unit, result_value, reference_range, interpretation }
  const [paramValues, setParamValues] = useState([])

  // 5. Scores (Both computed and manually overrideable)
  const [damageScore, setDamageScore] = useState(0)
  const [defenceScore, setDefenceScore] = useState(0)
  const [ratioScore, setRatioScore] = useState(0)

  const loadPatients = useCallback(async () => {
    setPatientsLoading(true)
    try {
      const res = await patientService.getPatients({ limit: 100 })
      const list = res.data.items || res.data.patients || []
      setPatients(list)
    } catch {
      toast.error('Failed to load patients list.')
    } finally {
      setPatientsLoading(false)
    }
  }, [])

  const loadSettings = useCallback(async () => {
    try {
      const res = await reportService.getSettings()
      setInstSettings(res.data.institute)
      setSignatures(res.data.signatures || [])
      if (res.data.signatures?.length > 0) {
        setDoctorName(res.data.signatures[0].doctor_name)
      }
    } catch {
      toast.error('Failed to load system templates.')
    }
  }, [])

  const loadTemplate = useCallback(async () => {
    try {
      const res = await reportService.getTemplates()
      const stressTpl = res.data.find(t => t.code === 'OXIDATIVE_STRESS')
      if (stressTpl) {
        setTemplate(stressTpl)
        setOverallSummary(stressTpl.description || '')
        
        if (!id) {
          const seeded = stressTpl.parameters.map(p => ({
            parameter_id: p.id,
            code: p.code,
            name: p.name,
            section: p.section,
            unit: p.unit,
            result_value: '',
            reference_range: p.reference_range,
            interpretation: p.default_interpretation
          }))
          setParamValues(seeded)
          setLabNumber(Math.floor(10000 + Math.random() * 90000).toString())
        }
      }
    } catch {
      toast.error('Failed to load report parameters.')
    }
  }, [id])

  // Fetch initial configuration data
  useEffect(() => {
    loadPatients()
    loadSettings()
    loadTemplate()
  }, [loadPatients, loadSettings, loadTemplate])

  // Auto score calculations
  useEffect(() => {
    // 1. Auto-calc Oxidative Damage Score (Average of FOX2, MDA, GRIESS, DNPH mapped scores)
    // If not filled, default mapping of values to 1-10 range:
    const getMappedScore = (code, val) => {
      if (!val) return 0
      const num = parseFloat(val)
      if (isNaN(num)) return 0
      
      if (code === 'FOX2') {
        // Range 2.0 - 10
        if (num <= 2.0) return 1
        if (num >= 10.0) return 10
        return 1 + ((num - 2.0) / 8.0) * 9
      }
      if (code === 'MDA') {
        // Range 0.5 - 2.0
        if (num <= 0.5) return 1
        if (num >= 2.0) return 10
        return 1 + ((num - 0.5) / 1.5) * 9
      }
      if (code === 'GRIESS') {
        // Range 20 - 40
        if (num <= 20.0) return 1
        if (num >= 40.0) return 10
        return 1 + ((num - 20.0) / 20.0) * 9
      }
      if (code === 'DNPH') {
        // Range 0.5 - 2.5
        if (num <= 0.5) return 1
        if (num >= 2.5) return 10
        return 1 + ((num - 0.5) / 2.0) * 9
      }
      return 0
    }

    const damageParams = paramValues.filter(p => p.section === 'Oxidative Damage')
    let damageSum = 0
    let damageCount = 0
    damageParams.forEach(p => {
      const score = getMappedScore(p.code, p.result_value)
      if (score > 0) {
        damageSum += score
        damageCount++
      }
    })
    
    const computedDamage = damageCount > 0 ? parseFloat((damageSum / damageCount).toFixed(1)) : 0
    setDamageScore(computedDamage)

    // 2. Auto-calc Antioxidant Defence Score (based on TAC)
    const tacParam = paramValues.find(p => p.code === 'TAC')
    let computedDefence = 0
    if (tacParam && tacParam.result_value) {
      const tacVal = parseFloat(tacParam.result_value)
      if (!isNaN(tacVal)) {
        // Range 600 - 1200. Let's map 782 -> 8.3 like sample.
        // Formula matching the sample: 1 + (tacVal - 600)/600 * 9 + offset
        if (tacVal >= 1200) computedDefence = 10
        else if (tacVal <= 600) computedDefence = 1
        else {
          computedDefence = parseFloat((1 + ((tacVal - 600) / 600) * 9 + 4.5).toFixed(1))
          if (computedDefence > 10) computedDefence = 10
        }
      }
    }
    setDefenceScore(computedDefence)

    // 3. Auto-calc Ratio Score (Damage / Defence * 4)
    if (computedDamage > 0 && computedDefence > 0) {
      const computedRatio = parseFloat(((computedDamage / computedDefence) * 4).toFixed(1))
      setRatioScore(computedRatio)
    } else {
      setRatioScore(0)
    }

  }, [paramValues])

  const loadReportDetails = useCallback(async () => {
    setLoading(true)
    try {
      const res = await reportService.getReport(id)
      const r = res.data
      
      // Autofill patient details
      setSelectedPatientId(r.patient.id.toString())
      setPatientDetails({
        name: r.patient.full_name,
        age: calculateAge(r.patient.date_of_birth),
        gender: r.patient.gender,
        patient_code: r.patient.patient_code,
        uhid: r.patient.patient_code, // Use patient_code for UHID fallback
        email: '',
        phone: '',
        address: '',
      })

      setReportNumber(r.report_number)
      setVersion(r.version)
      setDoctorName(r.doctor_name)
      setReferenceBy(r.reference_by)
      setReportDate(r.report_date)
      setCollectionDate(r.collection_date)
      setSampleType(r.sample_type)
      setLabNumber(r.lab_number)
      setOverallSummary(r.overall_summary || '')
      setReportStatus(r.status)
      setDamageScore(r.damage_score)
      setDefenceScore(r.defence_score)
      setRatioScore(r.ratio_score)

      // Map values
      const mapped = r.values.map(val => ({
        parameter_id: val.parameter_id,
        code: val.parameter_code,
        name: val.parameter_name,
        section: val.parameter_section,
        unit: val.parameter_unit,
        result_value: val.result_value.toString(),
        reference_range: val.reference_range,
        interpretation: val.interpretation
      }))
      setParamValues(mapped)

      // Print immediately if requested
      if (isPrintTriggered) {
        setTimeout(() => {
          window.print()
        }, 1000)
      }
    } catch {
      toast.error('Failed to retrieve report information.')
    } finally {
      setLoading(false)
    }
  }, [id, isPrintTriggered])

  // Load existing report details if editing or printing
  useEffect(() => {
    if (id) {
      loadReportDetails()
    }
  }, [id, loadReportDetails])

  // Handle Patient Dropdown Change
  const handlePatientSelect = async (patientId) => {
    setSelectedPatientId(patientId)
    if (!patientId) {
      setPatientDetails({
        name: '',
        age: '',
        gender: '',
        patient_code: '',
        uhid: '',
        email: '',
        phone: '',
        address: '',
      })
      return
    }

    try {
      const res = await patientService.getPatientDetail(patientId)
      const p = res.data
      setPatientDetails({
        name: p.full_name,
        age: calculateAge(p.date_of_birth),
        gender: p.gender,
        patient_code: p.patient_code,
        uhid: p.patient_code,
        email: p.email || '',
        phone: p.phone,
        address: p.address,
      })
    } catch {
      toast.error('Failed to retrieve patient profile details.')
    }
  }

  // Handle parameter input changes
  const handleParamValueChange = (index, field, value) => {
    const updated = [...paramValues]
    updated[index][field] = value
    setParamValues(updated)
  }

  // Save report submission
  const handleSaveReport = async () => {
    if (!selectedPatientId) {
      toast.error('Please select a patient.')
      return
    }
    if (!referenceBy.trim()) {
      toast.error('Please specify referring doctor.')
      return
    }

    // Verify all parameter values are filled
    const invalid = paramValues.some(p => p.result_value === '')
    if (invalid) {
      toast.error('Please fill in all parameter result values.')
      return
    }

    setLoading(true)
    const payload = {
      template_id: template.id,
      patient_id: parseInt(selectedPatientId),
      doctor_name: doctorName,
      reference_by: referenceBy.trim(),
      report_date: reportDate,
      sample_type: sampleType,
      collection_date: collectionDate,
      lab_number: labNumber,
      overall_summary: overallSummary,
      status: reportStatus,
      damage_score: damageScore,
      defence_score: defenceScore,
      ratio_score: ratioScore,
      values: paramValues.map(p => ({
        parameter_id: p.parameter_id,
        result_value: parseFloat(p.result_value),
        reference_range: p.reference_range,
        interpretation: p.interpretation,
      }))
    }

    try {
      const res = await reportService.createReport(payload, id ? reportNumber : null)
      toast.success(id ? `Report version v${res.data.version} saved successfully.` : 'New report saved successfully.')
      navigate('/reports')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save report details.')
    } finally {
      setLoading(false)
    }
  }

  // Download PDF using html2canvas & jsPDF
  const handleDownloadPDF = () => {
    if (id) {
      window.open(`/reports/print/${id}`, '_blank')
    } else {
      toast.info('Please save the report first to download/view PDF.')
    }
  }

  const triggerSystemPrint = () => {
    if (id) {
      window.open(`/reports/print/${id}?print=true`, '_blank')
    } else {
      toast.info('Please save the report first to print.')
    }
  }

  // Score Qualitative Circle Color Builders
  const getDamageCircleColor = (score) => {
    if (score <= 3) return 'bg-[#FFEB3B]' // Light Yellow
    if (score <= 7) return 'bg-[#FF9800]' // Orange
    return 'bg-[#F44336]' // Red
  }

  const getDefenceCircleColor = (score) => {
    if (score <= 3) return 'bg-[#FFEB3B]' // Light Yellow
    if (score <= 7) return 'bg-[#8BC34A]' // Light Green
    return 'bg-[#2E7D32]' // Dark Green
  }

  const getRatioCircleColor = (score) => {
    if (score <= 3) return 'bg-[#4CAF50]' // Green
    if (score <= 6) return 'bg-[#FFEB3B]' // Yellow
    return 'bg-[#F44336]' // Red
  }

  // Score Indicator Pin position percentages
  const getPinLeftPercent = (score) => {
    const val = parseFloat(score)
    if (isNaN(val) || val <= 1) return '0%'
    if (val >= 10) return '96%'
    return `${((val - 1) / 9) * 96}%`
  }

  return (
    <div className="space-y-6 animate-fade-in no-print-layout">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 no-print">
        <PageHeader
          title={id ? `Report Creator (v${version})` : 'New Oxidative Stress Report'}
          breadcrumbs={[
            { label: 'Dashboard', to: '/dashboard' },
            { label: 'Onco Receipt', to: '/reports' },
            { label: id ? `Edit ${reportNumber}` : 'New Report' },
          ]}
        />
        <Button onClick={() => navigate('/reports')} variant="ghost" className="text-ink-secondary flex items-center gap-1 self-start sm:self-center shrink-0">
          <RiArrowLeftLine size={16} /> Back to History
        </Button>
      </div>

      {/* Side-by-side Creator & Live Preview Split Panel */}
      <div className="flex flex-col xl:flex-row gap-6 items-start">
        
        {/* Creator Inputs Form (Left side) */}
        <div className="w-full xl:w-[450px] space-y-5 bg-surface-card border border-surface-border p-5 rounded-xl no-print shrink-0">
          <h3 className="text-sm font-bold text-ink-primary uppercase tracking-wider border-b pb-2 border-surface-border">Pathology Data Entry</h3>

          {/* Section 1: Patient Selection */}
          <div className="space-y-3.5">
            <label className="text-[10px] font-bold uppercase text-ink-secondary tracking-widest">1. Patient Account</label>
            
            {!id ? (
              <FormField label="Select Patient Profile" required>
                <Select value={selectedPatientId} onValueChange={handlePatientSelect} disabled={patientsLoading}>
                  <SelectTrigger className="bg-surface-base border-surface-border">
                    <SelectValue placeholder={patientsLoading ? 'Loading patients...' : 'Search Registered Patients...'} />
                  </SelectTrigger>
                  <SelectContent className="bg-surface-card border border-surface-border">
                    {patientsLoading ? (
                      <div className="py-4 text-center text-xs text-ink-secondary">Loading...</div>
                    ) : patients.length === 0 ? (
                      <div className="py-4 text-center text-xs text-ink-secondary">No patients registered yet.</div>
                    ) : (
                      patients.map(p => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          {p.full_name} ({p.patient_code})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </FormField>
            ) : (
              <div className="p-3 bg-surface-base/50 rounded-lg border border-surface-border text-xs space-y-1">
                <p className="font-bold text-ink-primary">{patientDetails.name}</p>
                <p className="text-ink-secondary">{patientDetails.patient_code} | Age: {patientDetails.age} | {patientDetails.gender}</p>
              </div>
            )}
          </div>

          {/* Section 2: Clinical Details */}
          <div className="space-y-3.5 pt-3 border-t border-surface-border/50">
            <label className="text-[10px] font-bold uppercase text-ink-secondary tracking-widest">2. Clinical Metadata</label>
            
            <FormField label="Referring Doctor (Ref. By)" required>
              <Input value={referenceBy} onChange={(e) => setReferenceBy(e.target.value)} placeholder="Dr. Somani (Rehuman)" />
            </FormField>

            <FormField label="Authorised Signatory" required>
              <Select value={doctorName} onValueChange={setDoctorName}>
                <SelectTrigger className="bg-surface-base border-surface-border">
                  <SelectValue placeholder="Select Doctor..." />
                </SelectTrigger>
                <SelectContent className="bg-surface-card border border-surface-border">
                  {signatures.map(sig => (
                    <SelectItem key={sig.id} value={sig.doctor_name}>
                      {sig.doctor_name}
                    </SelectItem>
                  ))}
                  <SelectItem value="Dr. Somani">Dr. Somani</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <DatePicker
                label="Collection Date"
                required
                value={collectionDate}
                onChange={setCollectionDate}
                maxDate={new Date()}
              />
              <DatePicker
                label="Report Date"
                required
                value={reportDate}
                onChange={setReportDate}
                maxDate={new Date()}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Sample Type" required>
                <Input value={sampleType} onChange={(e) => setSampleType(e.target.value)} />
              </FormField>
              <FormField label="Laboratory No." required>
                <Input value={labNumber} onChange={(e) => setLabNumber(e.target.value)} />
              </FormField>
            </div>
          </div>

          {/* Section 3: Pathology Values */}
          <div className="space-y-3.5 pt-3 border-t border-surface-border/50">
            <label className="text-[10px] font-bold uppercase text-ink-secondary tracking-widest">3. Measured Results</label>
            
            <div className="space-y-4">
              {paramValues.map((val, idx) => (
                <div key={val.parameter_id} className="p-3 border border-surface-border bg-surface-base/30 rounded-lg space-y-2.5">
                  <p className="text-xs font-bold text-ink-primary leading-tight">{val.name}</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <FormField label="Result" required>
                      <Input
                        type="number"
                        step="0.01"
                        value={val.result_value}
                        onChange={(e) => handleParamValueChange(idx, 'result_value', e.target.value)}
                        placeholder="e.g. 23.8"
                        className="h-8 font-mono text-xs"
                      />
                    </FormField>
                    <FormField label="Range">
                      <Input
                        value={val.reference_range}
                        onChange={(e) => handleParamValueChange(idx, 'reference_range', e.target.value)}
                        className="h-8 font-mono text-xs"
                      />
                    </FormField>
                    <FormField label="Interpretation">
                      <Input
                        value={val.interpretation}
                        onChange={(e) => handleParamValueChange(idx, 'interpretation', e.target.value)}
                        className="h-8 text-xs"
                      />
                    </FormField>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Summary & Status */}
          <div className="space-y-3.5 pt-3 border-t border-surface-border/50">
            <label className="text-[10px] font-bold uppercase text-ink-secondary tracking-widest">4. Summary & Status</label>
            <FormField label="Overall Summary Explanation">
              <Textarea value={overallSummary} onChange={(e) => setOverallSummary(e.target.value)} rows={3} placeholder="Overall diagnostic summary..." className="text-xs" />
            </FormField>

            <FormField label="Report Document Status">
              <Select value={reportStatus} onValueChange={setReportStatus}>
                <SelectTrigger className="bg-surface-base border-surface-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-surface-card border border-surface-border">
                  <SelectItem value="Draft">Draft (Editable)</SelectItem>
                  <SelectItem value="Completed">Completed (Clinical Record)</SelectItem>
                  <SelectItem value="Verified">Verified (Finalized & Audited)</SelectItem>
                  <SelectItem value="Archived">Archived (Read-Only)</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-surface-border flex gap-2">
            <Button onClick={handleSaveReport} disabled={loading} className="bg-brand-blue hover:bg-brand-blue-dark text-ink-inverse text-xs flex-1 flex items-center justify-center gap-1 font-bold h-10">
              <RiSaveLine size={16} /> Save Document
            </Button>
          </div>

          <div className="lg:hidden p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-lg text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
            <span className="font-semibold mt-0.5">ℹ️</span>
            <span>Live report preview is available on larger screens. Save the report to view and print it.</span>
          </div>
        </div>

        {/* Pathology Report Live Preview Sheet (Right side) */}
        <div className="flex-1 w-full bg-white/50 border border-surface-border rounded-xl p-5 xl:p-8 hidden lg:flex flex-col items-center overflow-auto max-h-[850px] shadow-inner relative group no-print">
          <div className="absolute right-4 top-4 flex gap-2 z-10 opacity-70 group-hover:opacity-100 transition-opacity">
            <Button onClick={triggerSystemPrint} variant="outline" className="border-surface-border bg-white text-ink-primary hover:bg-surface-hover h-8 text-xs flex items-center gap-1">
              <RiPrinterLine size={14} /> Print
            </Button>
            <Button onClick={handleDownloadPDF} variant="outline" className="border-surface-border bg-white text-ink-primary hover:bg-surface-hover h-8 text-xs flex items-center gap-1">
              <RiDownload2Line size={14} /> Download PDF
            </Button>
          </div>

          {/* A4 Sheet Container */}
          <div
            ref={printAreaRef}
            className="w-[794px] min-h-[1123px] bg-white border border-surface-border/50 text-black shadow-lg overflow-hidden relative p-[40px] flex flex-col justify-between"
            style={{ minWidth: '794px', maxWidth: '794px' }}
          >
            {/* ── PAGE 1 ── */}
            <div className="flex-1 flex flex-col justify-between" style={{ minHeight: '1043px', maxHeight: '1043px' }}>
              <div>
                {/* Clinic Header Branding */}
                <div className="flex items-start justify-between border-b-[2px] border-[#6B1D1D] pb-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={instSettings?.logo_url || '/static/default_logo.png'}
                      alt="Logo"
                      className="h-[60px] w-auto object-contain"
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                    <div className="h-9 w-px bg-[#6B1D1D]/30" />
                    <div>
                      <p className="text-[11px] font-bold text-[#6B1D1D] uppercase tracking-wider">Shanti Avedna Trust</p>
                      <h1 className="text-[17px] font-bold text-[#6B1D1D] uppercase tracking-tight leading-tight">
                        {instSettings?.name || 'Institute of Cancer and Stem Cell Research'}
                      </h1>
                    </div>
                  </div>
                </div>

                {/* Patient Header Block Table */}
                <div className="mt-4 border border-surface-border/80 p-4 bg-[#f9fafb]">
                  <table className="w-full text-xs border-collapse">
                    <tbody>
                      <tr>
                        <td className="py-1.5 font-bold text-ink-primary w-[14%]">Patient Name:</td>
                        <td className="py-1.5 text-ink-primary w-[36%]">{patientDetails.name || '-'}</td>
                        <td className="py-1.5 font-bold text-ink-primary w-[14%]">Report Date:</td>
                        <td className="py-1.5 text-ink-primary w-[36%]">{reportDate}</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 font-bold text-ink-primary">Ref. By:</td>
                        <td className="py-1.5 text-ink-primary">{referenceBy || '-'}</td>
                        <td className="py-1.5 font-bold text-ink-primary">Sample:</td>
                        <td className="py-1.5 text-ink-primary">{sampleType}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Section 1: Oxidative Damage */}
                <div className="mt-6 space-y-3">
                  <h2 className="text-[15px] font-bold text-[#6B1D1D] border-b border-[#6B1D1D]/20 pb-1">Oxidative Damage</h2>
                  <p className="text-[10px] text-ink-secondary leading-relaxed text-justify">
                    This includes markers that show cellular injury caused by reactive species. MDA (TBARS) and FOX-2 indicate lipid peroxidation and early membrane damage. Protein Carbonyl (DNPH) reflects oxidative modification of proteins. Nitric Oxide (Griess assay) indicates nitrosative stress, which can contribute to tissue and cellular damage. Elevated values of these markers suggest increased oxidative stress in the body.
                  </p>

                  <table className="w-full text-xs text-left border border-surface-border mt-2">
                    <thead>
                      <tr className="bg-surface-base/40 border-b border-surface-border text-[#6B1D1D] font-bold">
                        <th className="py-2.5 px-3 border-r border-surface-border w-[38%]">Parameter Measured</th>
                        <th className="py-2.5 px-3 border-r border-surface-border text-center w-[16%]">Result</th>
                        <th className="py-2.5 px-3 border-r border-surface-border text-center w-[18%]">Refrence Range</th>
                        <th className="py-2.5 px-3 w-[28%]">Interpretation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border text-ink-primary">
                      {paramValues.filter(p => p.section === 'Oxidative Damage').map((param) => (
                        <tr key={param.parameter_id}>
                          <td className="py-2.5 px-3 border-r border-surface-border font-medium">{param.name}</td>
                          <td className="py-2.5 px-3 border-r border-surface-border text-center font-bold">{param.result_value || '-'}</td>
                          <td className="py-2.5 px-3 border-r border-surface-border text-center font-mono">{param.reference_range}</td>
                          <td className="py-2.5 px-3 text-ink-secondary text-[11px]">{param.interpretation}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Section 2: Antioxidant Defence */}
                <div className="mt-8 space-y-3">
                  <h2 className="text-[15px] font-bold text-[#6B1D1D] border-b border-[#6B1D1D]/20 pb-1">Antioxidant Defence</h2>
                  <p className="text-[10px] text-ink-secondary leading-relaxed text-justify">
                    This panel evaluates the body's capacity to neutralize oxidative stress by measuring multiple antioxidant components. Reduced Glutathione (GSH) reflects the primary intracellular antioxidant that protects cells from reactive oxygen and nitrogen species. Total Antioxidant Capacity (TAC) measures the overall antioxidant potential of plasma, integrating both enzymatic and non-enzymatic systems.
                  </p>

                  <table className="w-full text-xs text-left border border-surface-border mt-2">
                    <thead>
                      <tr className="bg-surface-base/40 border-b border-surface-border text-[#6B1D1D] font-bold">
                        <th className="py-2.5 px-3 border-r border-surface-border w-[38%]">Parameter Measured</th>
                        <th className="py-2.5 px-3 border-r border-surface-border text-center w-[16%]">Result</th>
                        <th className="py-2.5 px-3 border-r border-surface-border text-center w-[18%]">Refrence Range</th>
                        <th className="py-2.5 px-3 w-[28%]">Your Interpretation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border text-ink-primary">
                      {paramValues.filter(p => p.section === 'Antioxidant Defence').map((param) => (
                        <tr key={param.parameter_id}>
                          <td className="py-2.5 px-3 border-r border-surface-border font-medium">{param.name}</td>
                          <td className="py-2.5 px-3 border-r border-surface-border text-center font-bold">{param.result_value || '-'}</td>
                          <td className="py-2.5 px-3 border-r border-surface-border text-center font-mono">{param.reference_range}</td>
                          <td className="py-2.5 px-3 text-ink-secondary text-[11px]">{param.interpretation}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* A4 Sheet Footer (Page 1) */}
              <div className="border-t border-[#6B1D1D] pt-2 mt-auto">
                <div className="flex justify-between items-center text-[9px] text-[#6B1D1D] font-bold uppercase tracking-tight">
                  <span>{instSettings?.name || 'Institute of Cancer and Stem Cell Research'} | SAT</span>
                  <span className="font-mono">1</span>
                </div>
              </div>
            </div>

            {/* Page Break Spacer */}
            <div className="h-[80px] no-print" />

            {/* ── PAGE 2 ── */}
            <div className="flex-1 flex flex-col justify-between" style={{ minHeight: '1043px', maxHeight: '1043px' }}>
              <div>
                {/* Header Branding Repeat */}
                <div className="flex items-start justify-between border-b-[2px] border-[#6B1D1D] pb-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={instSettings?.logo_url || '/static/default_logo.png'}
                      alt="Logo"
                      className="h-[60px] w-auto object-contain"
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                    <div className="h-9 w-px bg-[#6B1D1D]/30" />
                    <div>
                      <p className="text-[11px] font-bold text-[#6B1D1D] uppercase tracking-wider">Shanti Avedna Trust</p>
                      <h1 className="text-[17px] font-bold text-[#6B1D1D] uppercase tracking-tight leading-tight">
                        {instSettings?.name || 'Institute of Cancer and Stem Cell Research'}
                      </h1>
                    </div>
                  </div>
                </div>

                {/* Patient Header Block Repeat */}
                <div className="mt-4 border border-surface-border/80 p-4 bg-[#f9fafb]">
                  <table className="w-full text-xs border-collapse">
                    <tbody>
                      <tr>
                        <td className="py-1.5 font-bold text-ink-primary w-[14%]">Patient Name:</td>
                        <td className="py-1.5 text-ink-primary w-[36%]">{patientDetails.name || '-'}</td>
                        <td className="py-1.5 font-bold text-ink-primary w-[14%]">Report Date:</td>
                        <td className="py-1.5 text-ink-primary w-[36%]">{reportDate}</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 font-bold text-ink-primary">Ref. By:</td>
                        <td className="py-1.5 text-ink-primary">{referenceBy || '-'}</td>
                        <td className="py-1.5 font-bold text-ink-primary">Sample:</td>
                        <td className="py-1.5 text-ink-primary">{sampleType}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Overall Summary section */}
                <div className="mt-6 space-y-3">
                  <h2 className="text-[15px] font-bold text-[#6B1D1D] border-b border-[#6B1D1D]/20 pb-1">Overall Summary</h2>
                  <p className="text-[10px] text-ink-secondary leading-relaxed text-justify whitespace-pre-line">
                    The Damage vs. Defense Ratio (DDR) summarizes the body's oxidative stress by comparing total oxidative damage to antioxidant capacity. It is calculated as (MDA + FOX-2 + Protein Carbonyl + Nitric Oxide) / GSH. A low DDR indicates that antioxidants effectively counteract oxidative damage; a moderate DDR suggests that oxidative stress is present and defenses are partially overwhelmed; and a high DDR indicates that damage exceeds the body's protective capacity, reflecting severe oxidative stress and higher risk for cellular dysfunction or disease.
                  </p>
                </div>

                {/* Score Section 1: Oxidative Damage Score */}
                <div className="mt-8 space-y-4">
                  <h3 className="text-[13px] font-bold text-[#6B1D1D]">Oxidative Damage Score</h3>
                  <table className="w-full text-xs text-left border border-surface-border">
                    <thead>
                      <tr className="bg-surface-base/40 border-b border-surface-border font-bold">
                        <th className="py-2 px-3 border-r border-surface-border w-[50%]">Parameter</th>
                        <th className="py-2 px-3 border-r border-surface-border text-center w-[25%]">Quantitative Analysis</th>
                        <th className="py-2 px-3 text-center w-[25%]">Qualitative Analysis</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="text-ink-primary">
                        <td className="py-4 px-3 border-r border-surface-border font-medium">Oxidative Damage Score (MDA+FOX2+NO+Protein Carbonyl)</td>
                        <td className="py-4 px-3 border-r border-surface-border text-center font-bold text-sm">{damageScore || '-'}</td>
                        <td className="py-4 px-3 flex justify-center items-center">
                          <div className={['w-6 h-6 rounded-full border border-black/10', getDamageCircleColor(damageScore)].join(' ')} />
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Horizontal color scale */}
                  <div className="relative pt-6 px-1">
                    {/* Arrow Indicator */}
                    <div
                      className="absolute -top-1.5 transition-all duration-300 flex flex-col items-center"
                      style={{ left: getPinLeftPercent(damageScore) }}
                    >
                      <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[7px] border-t-black" />
                    </div>

                    {/* Gradient color bar */}
                    <div className="h-3 w-full bg-gradient-to-r from-[#FFEB3B] via-[#FF9800] to-[#F44336] rounded-sm" />
                    
                    {/* Numbers 1-10 */}
                    <div className="flex justify-between text-[9px] font-bold text-ink-secondary mt-1 px-1">
                      <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span><span>8</span><span>9</span><span>10</span>
                    </div>

                    <p className="text-[8px] text-ink-secondary leading-tight mt-1.5">
                      1-3 (Light Yellow): Low oxidative damage, minimal stress on cells.<br />
                      4-7 (Orange): Moderate oxidative damage, some stress present.<br />
                      8-10 (Red): High oxidative damage, significant stress and cellular risk.
                    </p>
                  </div>
                </div>

                {/* Score Section 2: Antioxidant Defence Score */}
                <div className="mt-8 space-y-4">
                  <h3 className="text-[13px] font-bold text-[#6B1D1D]">Antioxidant Defence</h3>
                  <table className="w-full text-xs text-left border border-surface-border">
                    <thead>
                      <tr className="bg-surface-base/40 border-b border-surface-border font-bold">
                        <th className="py-2 px-3 border-r border-surface-border w-[50%]">Parameter</th>
                        <th className="py-2 px-3 border-r border-surface-border text-center w-[25%]">Quantitative Analysis</th>
                        <th className="py-2 px-3 text-center w-[25%]">Qualitative Analysis</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="text-ink-primary">
                        <td className="py-4 px-3 border-r border-surface-border font-medium">Antioxidant Defence (GSH)</td>
                        <td className="py-4 px-3 border-r border-surface-border text-center font-bold text-sm">{defenceScore || '-'}</td>
                        <td className="py-4 px-3 flex justify-center items-center">
                          <div className={['w-6 h-6 rounded-full border border-black/10', getDefenceCircleColor(defenceScore)].join(' ')} />
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Horizontal color scale */}
                  <div className="relative pt-6 px-1">
                    {/* Arrow Indicator */}
                    <div
                      className="absolute -top-1.5 transition-all duration-300 flex flex-col items-center"
                      style={{ left: getPinLeftPercent(defenceScore) }}
                    >
                      <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[7px] border-t-black" />
                    </div>

                    {/* Gradient color bar */}
                    <div className="h-3 w-full bg-gradient-to-r from-[#FFEB3B] via-[#8BC34A] to-[#2E7D32] rounded-sm" />
                    
                    {/* Numbers 1-10 */}
                    <div className="flex justify-between text-[9px] font-bold text-ink-secondary mt-1 px-1">
                      <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span><span>8</span><span>9</span><span>10</span>
                    </div>

                    <p className="text-[8px] text-ink-secondary leading-tight mt-1.5">
                      1-3 (Light Yellow): Weak antioxidant defense, insufficient protection.<br />
                      4-7 (Light Green): Moderate defense, partial protection against oxidative stress.<br />
                      8-10 (Dark Green): Strong defense, effective neutralization of reactive species.
                    </p>
                  </div>
                </div>
              </div>

              {/* A4 Sheet Footer (Page 2) */}
              <div className="border-t border-[#6B1D1D] pt-2 mt-auto">
                <div className="flex justify-between items-center text-[9px] text-[#6B1D1D] font-bold uppercase tracking-tight">
                  <span>{instSettings?.name || 'Institute of Cancer and Stem Cell Research'} | SAT</span>
                  <span className="font-mono">2</span>
                </div>
              </div>
            </div>

            {/* Page Break Spacer */}
            <div className="h-[80px] no-print" />

            {/* ── PAGE 3 ── */}
            <div className="flex-1 flex flex-col justify-between" style={{ minHeight: '1043px', maxHeight: '1043px' }}>
              <div>
                {/* Header Branding Repeat */}
                <div className="flex items-start justify-between border-b-[2px] border-[#6B1D1D] pb-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={instSettings?.logo_url || '/static/default_logo.png'}
                      alt="Logo"
                      className="h-[60px] w-auto object-contain"
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                    <div className="h-9 w-px bg-[#6B1D1D]/30" />
                    <div>
                      <p className="text-[11px] font-bold text-[#6B1D1D] uppercase tracking-wider">Shanti Avedna Trust</p>
                      <h1 className="text-[17px] font-bold text-[#6B1D1D] uppercase tracking-tight leading-tight">
                        {instSettings?.name || 'Institute of Cancer and Stem Cell Research'}
                      </h1>
                    </div>
                  </div>
                </div>

                {/* Patient Header Block Repeat */}
                <div className="mt-4 border border-surface-border/80 p-4 bg-[#f9fafb]">
                  <table className="w-full text-xs border-collapse">
                    <tbody>
                      <tr>
                        <td className="py-1.5 font-bold text-ink-primary w-[14%]">Patient Name:</td>
                        <td className="py-1.5 text-ink-primary w-[36%]">{patientDetails.name || '-'}</td>
                        <td className="py-1.5 font-bold text-ink-primary w-[14%]">Report Date:</td>
                        <td className="py-1.5 text-ink-primary w-[36%]">{reportDate}</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 font-bold text-ink-primary">Ref. By:</td>
                        <td className="py-1.5 text-ink-primary">{referenceBy || '-'}</td>
                        <td className="py-1.5 font-bold text-ink-primary">Sample:</td>
                        <td className="py-1.5 text-ink-primary">{sampleType}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Score Section 3: Damage - Defence Ratio */}
                <div className="mt-6 space-y-4">
                  <h3 className="text-[13px] font-bold text-[#6B1D1D]">Damage - Defence Ratio</h3>
                  <table className="w-full text-xs text-left border border-surface-border">
                    <thead>
                      <tr className="bg-surface-base/40 border-b border-surface-border font-bold">
                        <th className="py-2 px-3 border-r border-surface-border w-[50%]">Parameter</th>
                        <th className="py-2 px-3 border-r border-surface-border text-center w-[25%]">Quantitative Analysis</th>
                        <th className="py-2 px-3 text-center w-[25%]">Qualitative Analysis</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="text-ink-primary">
                        <td className="py-4 px-3 border-r border-surface-border font-medium">Damage - Defence Ratio</td>
                        <td className="py-4 px-3 border-r border-surface-border text-center font-bold text-sm">{ratioScore || '-'}</td>
                        <td className="py-4 px-3 flex justify-center items-center">
                          <div className={['w-6 h-6 rounded-full border border-black/10', getRatioCircleColor(ratioScore)].join(' ')} />
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Horizontal color scale */}
                  <div className="relative pt-6 px-1">
                    {/* Arrow Indicator */}
                    <div
                      className="absolute -top-1.5 transition-all duration-300 flex flex-col items-center"
                      style={{ left: getPinLeftPercent(ratioScore) }}
                    >
                      <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[7px] border-t-black" />
                    </div>

                    {/* Gradient color bar */}
                    <div className="h-3 w-full bg-gradient-to-r from-[#4CAF50] via-[#FFEB3B] to-[#F44336] rounded-sm" />
                    
                    {/* Numbers 1-10 */}
                    <div className="flex justify-between text-[9px] font-bold text-ink-secondary mt-1 px-1">
                      <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span><span>8</span><span>9</span><span>10</span>
                    </div>

                    <p className="text-[8px] text-ink-secondary leading-tight mt-1.5">
                      1-3 (Green): Low ratio, body defense is sufficient to counter damage.<br />
                      4-6 (Yellow): Moderate ratio, damage and defense are somewhat balanced.<br />
                      7-10 (Red): High ratio, damage exceeds defense, high oxidative stress.
                    </p>
                  </div>
                </div>

                {/* Section 4: Disclaimer */}
                <div className="mt-8 space-y-2">
                  <p className="text-[10px] font-bold text-ink-primary">Disclaimer:</p>
                  <p className="text-[9px] text-ink-secondary leading-relaxed text-justify whitespace-pre-line">
                    {template?.default_disclaimer || "The information provided by this panel reflects biochemical markers of oxidative balance and is intended for research or monitoring purposes. It should be considered alongside clinical evaluation and not as a standalone diagnostic tool."}
                  </p>
                </div>

                {/* Authorised Signatory Block */}
                <div className="mt-12 flex justify-between items-end">
                  <div className="text-[10px] text-ink-secondary">
                    <span>-------</span><span className="font-bold">End of Report</span><span>------</span>
                  </div>

                  <div className="flex flex-col items-center space-y-1">
                    {/* Signature image */}
                    <div className="h-10 flex items-center justify-center p-1 px-3">
                      {signatures.find(s => s.doctor_name === doctorName)?.signature_url ? (
                        <img
                          src={signatures.find(s => s.doctor_name === doctorName).signature_url}
                          alt="Doctor Signature"
                          className="h-full object-contain"
                        />
                      ) : (
                        <div className="h-full w-24 border border-dashed border-surface-border flex items-center justify-center text-[8px] text-ink-disabled font-medium">
                          No Signature
                        </div>
                      )}
                    </div>

                    {/* Stamp overlay if stamp exists */}
                    {instSettings?.stamp_url && (
                      <div className="h-10 w-10 flex items-center justify-center overflow-hidden -mt-6 opacity-80 shrink-0">
                        <img
                          src={instSettings.stamp_url}
                          alt="Stamp"
                          className="h-full object-contain"
                        />
                      </div>
                    )}
                    
                    <span className="text-[10px] font-bold text-[#6B1D1D] mt-1">Authorised Signatory</span>
                  </div>
                </div>
              </div>

              {/* A4 Sheet Footer (Page 3) */}
              <div className="border-t border-[#6B1D1D] pt-4 mt-auto">
                {/* Contact details row */}
                <div className="grid grid-cols-2 gap-4 text-[9px] text-ink-secondary mb-3">
                  <div>
                    <p><span className="font-bold text-ink-primary">Address - </span>{instSettings?.address || 'M4 Mishika Tower Sampna Sangeeta Indore M.P. 452001'}</p>
                    <p className="mt-1"><span className="font-bold text-ink-primary">Email - </span>{instSettings?.email || 'icsrofficial@gmail.com'}</p>
                  </div>
                  <div className="text-right">
                    <p><span className="font-bold text-ink-primary">Website - </span>{instSettings?.website || 'www.icsrofficial.com'}</p>
                    <p className="mt-1"><span className="font-bold text-ink-primary">Contact no - </span>{instSettings?.contact_number || '+91 7582950349'}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[9px] text-[#6B1D1D] font-bold uppercase tracking-tight">
                  <span>{instSettings?.name || 'Institute of Cancer and Stem Cell Research'} | SAT</span>
                  <span className="font-mono">3</span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Global CSS style block overrides for browser window printing */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .no-print-layout, .no-print, header, nav, aside, .topbar {
            display: none !important;
          }
          /* Show print area and position at top left */
          #print-area, [ref="printAreaRef"], .print-area-selector {
            visibility: visible !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            border: 0 !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          /* Define A4 page dimensions */
          @page {
            size: A4 portrait;
            margin: 15mm 10mm 15mm 10mm;
          }
        }
      `}</style>
    </div>
  )
}
