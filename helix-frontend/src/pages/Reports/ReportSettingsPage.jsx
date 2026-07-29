import { useState, useEffect } from 'react'
import PageHeader from '../../components/PageHeader'
import FormField from '../../components/FormField'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card'
import { toast } from 'sonner'
import reportService from '../../services/reportService'
import patientService from '../../services/patientService'
import {
  RiHotelLine,
  RiFileList3Line,
  RiBallPenLine,
  RiUploadCloud2Line,
  RiSaveLine,
} from 'react-icons/ri'

export default function ReportSettingsPage() {
  const [activeSubTab, setActiveSubTab] = useState('institute')
  const [loading, setLoading] = useState(false)

  // 1. Institute Info States
  const [instName, setInstName] = useState('')
  const [instAddress, setInstAddress] = useState('')
  const [instWebsite, setInstWebsite] = useState('')
  const [instEmail, setInstEmail] = useState('')
  const [instContact, setInstContact] = useState('')
  const [instLogo, setInstLogo] = useState('')
  const [instStamp, setInstStamp] = useState('')

  // 2. Doctor Signature States
  const [signatures, setSignatures] = useState([])
  const [newDoctorName, setNewDoctorName] = useState('')
  const [newSigUrl, setNewSigUrl] = useState('')

  // 3. Parameter Ranges States
  const [templates, setTemplates] = useState([])

  // Load Settings on Mount
  useEffect(() => {
    fetchSettings()
    fetchTemplates()
  }, [])

  const fetchSettings = async () => {
    try {
      const res = await reportService.getSettings()
      const inst = res.data.institute
      if (inst) {
        setInstName(inst.name || '')
        setInstAddress(inst.address || '')
        setInstWebsite(inst.website || '')
        setInstEmail(inst.email || '')
        setInstContact(inst.contact_number || '')
        setInstLogo(inst.logo_url || '')
        setInstStamp(inst.stamp_url || '')
      }
      setSignatures(res.data.signatures || [])
    } catch (err) {
      toast.error('Failed to load institute settings.')
    }
  }

  const fetchTemplates = async () => {
    try {
      const res = await reportService.getTemplates()
      setTemplates(res.data || [])
    } catch (err) {
      toast.error('Failed to load report templates.')
    }
  }

  const handleInstituteSave = async (e) => {
    e.preventDefault()
    if (!instName.trim() || !instAddress.trim()) {
      toast.error('Name and Address are required.')
      return
    }
    setLoading(true)
    try {
      await reportService.updateSettings({
        name: instName,
        address: instAddress,
        website: instWebsite,
        email: instEmail,
        contact_number: instContact,
        logo_url: instLogo || null,
        stamp_url: instStamp || null,
      })
      toast.success('Institute details updated successfully.')
      fetchSettings()
    } catch (err) {
      toast.error('Failed to update institute details.')
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (e, type) => {
    const file = e.target.files[0]
    if (!file) return
    const toastId = toast.loading(`Uploading ${type}...`)
    try {
      const res = await patientService.uploadImage(file)
      const url = res.data.url
      if (type === 'logo') setInstLogo(url)
      if (type === 'stamp') setInstStamp(url)
      if (type === 'signature') setNewSigUrl(url)
      toast.success(`${type} uploaded successfully.`, { id: toastId })
    } catch (err) {
      toast.error(`Failed to upload ${type}.`, { id: toastId })
    }
  }

  const handleAddSignature = async (e) => {
    e.preventDefault()
    if (!newDoctorName.trim()) {
      toast.error('Doctor name is required.')
      return
    }
    if (!newSigUrl) {
      toast.error('Please upload a signature image.')
      return
    }
    setLoading(true)
    try {
      await reportService.addSignature({
        doctor_name: newDoctorName,
        signature_url: newSigUrl,
        is_active: true,
      })
      toast.success('Doctor signature added successfully.')
      setNewDoctorName('')
      setNewSigUrl('')
      fetchSettings()
    } catch (err) {
      toast.error('Failed to add doctor signature.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Onco Receipt Settings"
        breadcrumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Onco Receipt', to: '/reports' },
          { label: 'Settings' },
        ]}
      />

      <div className="flex flex-col md:flex-row min-h-[500px] border border-surface-border bg-surface-card rounded-xl overflow-hidden">
        
        {/* Left Sub-Navigation */}
        <div className="w-full md:w-60 border-b md:border-b-0 md:border-r border-surface-border bg-surface-base/30 p-4 space-y-1.5 shrink-0 flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible">
          {[
            { id: 'institute', label: 'Institute Branding', icon: RiHotelLine },
            { id: 'signatures', label: 'Doctor Signatures', icon: RiBallPenLine },
            { id: 'parameters', label: 'Master Parameters', icon: RiFileList3Line },
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeSubTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={[
                  'flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-semibold tracking-wide whitespace-nowrap transition-colors duration-fast w-full text-left',
                  isActive
                    ? 'bg-brand-blue text-ink-inverse shadow-xs'
                    : 'text-ink-secondary hover:bg-surface-hover hover:text-ink-primary',
                ].join(' ')}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Right Settings Content */}
        <div className="flex-1 p-6 md:p-8 bg-surface-card overflow-y-auto">
          
          {/* TAB 1: Institute Branding */}
          {activeSubTab === 'institute' && (
            <div className="max-w-2xl space-y-6 animate-fade-in">
              <div>
                <h3 className="text-sm font-bold text-ink-primary uppercase tracking-wider">Institute Details & Branding</h3>
                <p className="text-xs text-ink-secondary mt-1">Configure clinical identity details, logos, and report stamps.</p>
              </div>

              <form onSubmit={handleInstituteSave} className="space-y-4">
                <FormField label="Institute Full Name" required>
                  <Input value={instName} onChange={(e) => setInstName(e.target.value)} placeholder="INSTITUTE OF CANCER AND STEM CELL RESEARCH" />
                </FormField>

                <FormField label="Physical Address" required>
                  <Input value={instAddress} onChange={(e) => setInstAddress(e.target.value)} placeholder="M4 Mishika Tower Sampna Sangeeta Indore M.P. 452001" />
                </FormField>

                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Official Website">
                    <Input value={instWebsite} onChange={(e) => setInstWebsite(e.target.value)} placeholder="www.icsrofficial.com" />
                  </FormField>
                  <FormField label="Official Email">
                    <Input value={instEmail} onChange={(e) => setInstEmail(e.target.value)} placeholder="icsrofficial@gmail.com" />
                  </FormField>
                </div>

                <FormField label="Contact Number">
                  <Input value={instContact} onChange={(e) => setInstContact(e.target.value)} placeholder="+91 7582950349" />
                </FormField>

                {/* Upload Logos & Stamps */}
                <div className="grid grid-cols-2 gap-6 pt-2">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-ink-secondary uppercase">Institute Logo</label>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 border rounded bg-surface-base flex items-center justify-center overflow-hidden shrink-0">
                        {instLogo ? (
                          <img src={instLogo} alt="Logo" className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-[10px] text-ink-disabled">No Logo</span>
                        )}
                      </div>
                      <label className="cursor-pointer">
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'logo')} />
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-surface-border rounded text-xs font-semibold hover:bg-surface-hover text-ink-primary">
                          <RiUploadCloud2Line size={14} /> Upload Logo
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-ink-secondary uppercase">Institute Stamp</label>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 border rounded bg-surface-base flex items-center justify-center overflow-hidden shrink-0">
                        {instStamp ? (
                          <img src={instStamp} alt="Stamp" className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-[10px] text-ink-disabled">No Stamp</span>
                        )}
                      </div>
                      <label className="cursor-pointer">
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'stamp')} />
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-surface-border rounded text-xs font-semibold hover:bg-surface-hover text-ink-primary">
                          <RiUploadCloud2Line size={14} /> Upload Stamp
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-surface-border">
                  <Button type="submit" disabled={loading} className="bg-brand-blue hover:bg-brand-blue-dark text-ink-inverse text-xs flex items-center gap-1.5 font-bold">
                    <RiSaveLine size={14} /> Save Branding Settings
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: Doctor Signatures */}
          {activeSubTab === 'signatures' && (
            <div className="max-w-2xl space-y-6 animate-fade-in">
              <div>
                <h3 className="text-sm font-bold text-ink-primary uppercase tracking-wider">Authorized Doctor Signatures</h3>
                <p className="text-xs text-ink-secondary mt-1">Upload and manage digitized signatures printed on verified receipts.</p>
              </div>

              {/* Add New Signature */}
              <form onSubmit={handleAddSignature} className="p-4 border border-surface-border bg-surface-base/30 rounded-xl space-y-4">
                <h4 className="text-xs font-bold text-ink-primary uppercase">Add New Signatory</h4>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Authorized Signatory Name" required>
                    <Input value={newDoctorName} onChange={(e) => setNewDoctorName(e.target.value)} placeholder="Dr. S. Somani" />
                  </FormField>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-ink-secondary uppercase">Signature Image</label>
                    <div className="flex items-center gap-4">
                      {newSigUrl && (
                        <div className="h-10 border bg-white rounded overflow-hidden flex items-center justify-center p-1 px-3">
                          <img src={newSigUrl} alt="Signature" className="h-full object-contain" />
                        </div>
                      )}
                      <label className="cursor-pointer">
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'signature')} />
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-surface-border rounded text-xs font-semibold hover:bg-surface-hover text-ink-primary h-10">
                          <RiUploadCloud2Line size={14} /> Browse Image
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="bg-brand-blue hover:bg-brand-blue-dark text-ink-inverse text-xs font-bold">
                  Add Authorized Signatory
                </Button>
              </form>

              {/* Existing Signatures List */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-ink-secondary uppercase tracking-wider">Active Signatories</label>
                <div className="space-y-2.5">
                  {signatures.length === 0 ? (
                    <p className="text-xs text-ink-secondary italic">No active signatures registered.</p>
                  ) : (
                    signatures.map((sig) => (
                      <div key={sig.id} className="flex items-center justify-between p-3.5 border border-surface-border bg-surface-base/10 rounded-lg">
                        <div>
                          <p className="text-xs font-bold text-ink-primary">{sig.doctor_name}</p>
                          <p className="text-[10px] text-ink-secondary mt-0.5">Status: Active</p>
                        </div>
                        <div className="h-9 bg-white border border-surface-border px-4 py-1 rounded flex items-center">
                          <img src={sig.signature_url} alt="Signature Preview" className="h-full object-contain" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Master Parameters */}
          {activeSubTab === 'parameters' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h3 className="text-sm font-bold text-ink-primary uppercase tracking-wider">Master Parameter Configurations</h3>
                <p className="text-xs text-ink-secondary mt-1">Review templates and parameter configurations. System templates are configured dynamically via seeding.</p>
              </div>

              {templates.map((tpl) => (
                <div key={tpl.id} className="space-y-3 p-5 border border-surface-border rounded-xl bg-surface-base/10">
                  <div className="flex items-center justify-between pb-3 border-b border-surface-border">
                    <div>
                      <h4 className="text-sm font-bold text-ink-primary">{tpl.name}</h4>
                      <p className="text-[10px] text-ink-secondary mt-0.5">Code: {tpl.code}</p>
                    </div>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-brand-blue/10 text-brand-blue border border-brand-blue/20 rounded">
                      Standard
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-surface-border text-ink-secondary font-bold">
                          <th className="py-2 pr-4">Parameter Name</th>
                          <th className="py-2 px-4">Section</th>
                          <th className="py-2 px-4 text-center">Unit</th>
                          <th className="py-2 px-4">Reference Range</th>
                          <th className="py-2 pl-4">Default Interpretation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-border/50 text-ink-primary">
                        {tpl.parameters.map((param) => (
                          <tr key={param.id}>
                            <td className="py-2.5 pr-4 font-semibold">{param.name}</td>
                            <td className="py-2.5 px-4 text-ink-secondary">{param.section}</td>
                            <td className="py-2.5 px-4 text-center font-mono">{param.unit || '-'}</td>
                            <td className="py-2.5 px-4 font-mono font-medium">{param.reference_range}</td>
                            <td className="py-2.5 pl-4 text-ink-secondary italic">{param.default_interpretation}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
