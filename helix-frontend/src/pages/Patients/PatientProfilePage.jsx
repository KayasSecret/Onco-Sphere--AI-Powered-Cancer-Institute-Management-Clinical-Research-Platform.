import { useEffect, useState, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import {
  fetchPatientDetailThunk,
  deletePatientThunk,
  selectSelectedPatient,
  selectPatientStatus,
} from '../../redux/slices/patientSlice'
import { selectUserRole } from '../../redux/slices/authSlice'
import StatusBadge from '../../components/StatusBadge'
import ConfirmDialog from '../../components/ConfirmDialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import {
  RiEditLine,
  RiDeleteBin7Line,
  RiScanLine,
  RiFileTextLine,
  RiDownloadLine,
  RiSearchLine,
  RiFilter3Line,
  RiUpload2Line,
  RiFilePdfLine,
  RiFileWordLine,
  RiImageLine,
  RiCloseLine,
  RiEyeLine,
  RiPencilLine,
  RiCheckLine,
  RiTimeLine,
  RiArrowLeftLine,
} from 'react-icons/ri'
import { toast } from 'sonner'
import patientService from '../../services/patientService'
import PhotoSelector from '../../components/PhotoSelector'
import DatePicker from '../../components/DatePicker'
import PatientVisitsSection from '../../components/visits/PatientVisitsSection'

export default function PatientProfilePage() {
  const { id } = useParams()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  
  const patient = useSelector(selectSelectedPatient)
  const status = useSelector(selectPatientStatus)
  const role = useSelector(selectUserRole)

  const [confirmOpen, setConfirmOpen] = useState(false)

  // Reports state
  const [reports, setReports] = useState([])
  const [reportsSearch, setReportsSearch] = useState('')
  const [reportsTypeFilter, setReportsTypeFilter] = useState('all')
  const [reportsStartDate, setReportsStartDate] = useState('')
  const [reportsEndDate, setReportsEndDate] = useState('')
  const [reportTitle, setReportTitle] = useState('')
  const [reportFile, setReportFile] = useState(null)
  const [uploadingReport, setUploadingReport] = useState(false)

  // Cancer Images state & filters
  const [cancerImages, setCancerImages] = useState([])
  const [imageTitle, setImageTitle] = useState('')
  const [activeImageModal, setActiveImageModal] = useState(null)
  const [imagesSearch, setImagesSearch] = useState('')
  const [imagesStartDate, setImagesStartDate] = useState('')
  const [imagesEndDate, setImagesEndDate] = useState('')
  // Rename state: which card is being renamed and current text
  const [renamingImageId, setRenamingImageId] = useState(null)
  const [renameText, setRenameText] = useState('')

  // Active loading state for view/download operations
  const [activeReportAction, setActiveReportAction] = useState({ id: null, type: null }) // type: 'view' | 'download'
  const [activeImageAction, setActiveImageAction] = useState({ id: null, type: null }) // type: 'view' | 'download'

  const isWritable = role === 'SUPER_ADMIN' || role === 'ADMIN'
  const isSuperAdmin = role === 'SUPER_ADMIN'

  // Filtered Cancer Images by label search and Date Range (From Date to To Date)
  const filteredCancerImages = cancerImages.filter((img) => {
    // 1. Search text filter
    if (imagesSearch.trim()) {
      const q = imagesSearch.toLowerCase().trim()
      const titleMatch = (img.title || '').toLowerCase().includes(q)
      if (!titleMatch) return false
    }

    // 2. Date Range Filter
    if (img.created_at) {
      const imgDate = new Date(img.created_at)
      const imgTime = new Date(imgDate.getFullYear(), imgDate.getMonth(), imgDate.getDate()).getTime()

      if (imagesStartDate) {
        const startParts = imagesStartDate.split('-')
        if (startParts.length === 3) {
          const startTime = new Date(parseInt(startParts[0], 10), parseInt(startParts[1], 10) - 1, parseInt(startParts[2], 10)).getTime()
          if (imgTime < startTime) return false
        }
      }

      if (imagesEndDate) {
        const endParts = imagesEndDate.split('-')
        if (endParts.length === 3) {
          const endTime = new Date(parseInt(endParts[0], 10), parseInt(endParts[1], 10) - 1, parseInt(endParts[2], 10)).getTime()
          if (imgTime > endTime) return false
        }
      }
    }

    return true
  })

  const loadReports = useCallback(async () => {
    try {
      const res = await patientService.getPatientReports(id)
      setReports(res.data)
    } catch (err) {
      console.error('Failed to load patient reports:', err)
    }
  }, [id])

  const loadCancerImages = useCallback(async () => {
    try {
      const res = await patientService.getPatientCancerImages(id)
      setCancerImages(res.data)
    } catch (err) {
      console.error('Failed to load patient cancer images:', err)
    }
  }, [id])

  const handleDeleteCancerImage = async (imageId) => {
    if (!window.confirm('Are you sure you want to delete this scan image? This cannot be undone.')) return
    try {
      await patientService.deleteCancerImage(id, imageId)
      toast.success('Scan image deleted successfully.')
      // If lightbox is open for this image, close it
      if (activeImageModal?.id === imageId) setActiveImageModal(null)
      loadCancerImages()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete image.')
    }
  }

  const handleRenameCancerImage = async (imageId) => {
    const newTitle = renameText.trim()
    if (!newTitle) { toast.error('Name cannot be empty.'); return }
    try {
      const res = await patientService.renameCancerImage(id, imageId, newTitle)
      toast.success('Image renamed successfully.')
      setCancerImages((prev) => prev.map((img) => img.id === imageId ? { ...img, title: res.data.title } : img))
      if (activeImageModal?.id === imageId) setActiveImageModal((prev) => ({ ...prev, title: res.data.title }))
      setRenamingImageId(null)
      setRenameText('')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to rename image.')
    }
  }

  const handleUploadReport = async (e) => {
    e.preventDefault()
    if (!reportTitle.trim()) {
      toast.error('Please enter a report title.')
      return
    }
    if (!reportFile) {
      toast.error('Please select a file to upload.')
      return
    }
    setUploadingReport(true)
    try {
      const uploadRes = await patientService.uploadDocument(reportFile)
      const fileUrl = uploadRes.data.url
      const fileType = reportFile.name.split('.').pop().toLowerCase()

      await patientService.createPatientReport(id, {
        title: reportTitle,
        file_url: fileUrl,
        file_type: fileType
      })
      toast.success('Report document uploaded successfully.')
      setReportTitle('')
      setReportFile(null)
      const fileInput = document.getElementById('report-file-input')
      if (fileInput) fileInput.value = ''
      loadReports()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to upload report document.')
    } finally {
      setUploadingReport(false)
    }
  }

  const handleDeleteReport = async (reportId) => {
    if (!window.confirm("Are you sure you want to delete this report? This action cannot be undone.")) return
    try {
      await patientService.deletePatientReport(id, reportId)
      toast.success("Report deleted successfully.")
      loadReports()
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to delete report.")
    }
  }

  // Handle View Report (opens inline in new browser tab)
  const handleViewReport = async (report) => {
    setActiveReportAction({ id: report.id, type: 'view' })
    try {
      const res = await patientService.fetchReportBlob(id, report.id, 'inline')
      const ext = (report.file_type || 'pdf').toLowerCase().replace(/^\./, '')
      let mimeType = res.headers['content-type']
      if (!mimeType || mimeType === 'application/octet-stream') {
        if (ext === 'pdf') mimeType = 'application/pdf'
        else if (['jpg', 'jpeg'].includes(ext)) mimeType = 'image/jpeg'
        else if (ext === 'png') mimeType = 'image/png'
        else if (ext === 'txt') mimeType = 'text/plain'
      }
      const blob = new Blob([res.data], { type: mimeType })
      const blobUrl = URL.createObjectURL(blob)
      window.open(blobUrl, '_blank', 'noopener,noreferrer')
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000)
    } catch (err) {
      console.error('Failed to view report:', err)
      // Fallback: try direct file_url if available
      if (report.file_url) {
        window.open(report.file_url, '_blank', 'noopener,noreferrer')
      } else {
        toast.error(err.response?.data?.detail || 'Failed to open report.')
      }
    } finally {
      setActiveReportAction({ id: null, type: null })
    }
  }

  // Handle Download Report (forces browser download with clean filename)
  const handleDownloadReport = async (report) => {
    setActiveReportAction({ id: report.id, type: 'download' })
    try {
      const res = await patientService.fetchReportBlob(id, report.id, 'attachment')
      const ext = (report.file_type || 'pdf').toLowerCase().replace(/^\./, '')
      const blob = new Blob([res.data], { type: res.headers['content-type'] || 'application/octet-stream' })
      const blobUrl = URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = blobUrl
      const safeTitle = (report.title || 'report').replace(/[^\w\s\.-]/g, '_').trim()
      link.download = safeTitle.toLowerCase().endsWith(`.${ext}`) ? safeTitle : `${safeTitle}.${ext}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000)
      toast.success('Report downloaded.')
    } catch (err) {
      console.error('Failed to download report:', err)
      if (report.file_url) {
        const link = document.createElement('a')
        link.href = report.file_url
        link.target = '_blank'
        link.download = `${report.title || 'report'}.${report.file_type || 'pdf'}`
        link.click()
      } else {
        toast.error(err.response?.data?.detail || 'Failed to download report.')
      }
    } finally {
      setActiveReportAction({ id: null, type: null })
    }
  }

  // Handle Download Cancer Image (forces download with clean filename)
  const handleDownloadCancerImage = async (img) => {
    setActiveImageAction({ id: img.id, type: 'download' })
    try {
      const res = await patientService.fetchCancerImageBlob(id, img.id, 'attachment')
      const blob = new Blob([res.data], { type: res.headers['content-type'] || 'image/jpeg' })
      const blobUrl = URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = blobUrl
      let ext = 'jpg'
      const match = (img.image_url || '').match(/\.([a-zA-Z0-9]+)(?:\?.*)?$/)
      if (match) ext = match[1].toLowerCase()
      const safeTitle = (img.title || 'cancer_scan').replace(/[^\w\s\.-]/g, '_').trim()
      link.download = safeTitle.toLowerCase().endsWith(`.${ext}`) ? safeTitle : `${safeTitle}.${ext}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000)
      toast.success('Scan image downloaded.')
    } catch (err) {
      console.error('Failed to download cancer image:', err)
      if (img.image_url) {
        window.open(img.image_url, '_blank', 'noopener,noreferrer')
      } else {
        toast.error(err.response?.data?.detail || 'Failed to download image.')
      }
    } finally {
      setActiveImageAction({ id: null, type: null })
    }
  }


  const filteredReports = reports.filter((r) => {
    const matchesSearch = r.title.toLowerCase().includes(reportsSearch.toLowerCase())
    const matchesType =
      reportsTypeFilter === 'all' ||
      r.file_type.toLowerCase() === reportsTypeFilter.toLowerCase() ||
      (reportsTypeFilter === 'doc' && ['doc', 'docx'].includes(r.file_type.toLowerCase())) ||
      (reportsTypeFilter === 'xls' && ['xls', 'xlsx'].includes(r.file_type.toLowerCase()))
    
    let matchesDate = true
    if (reportsStartDate || reportsEndDate) {
      const rDateStr = r.created_at.split('T')[0]
      if (reportsStartDate && rDateStr < reportsStartDate) {
        matchesDate = false
      }
      if (reportsEndDate && rDateStr > reportsEndDate) {
        matchesDate = false
      }
    }
    
    return matchesSearch && matchesType && matchesDate
  })

  useEffect(() => {
    dispatch(fetchPatientDetailThunk(id))
    loadReports()
    loadCancerImages()
  }, [dispatch, id, loadReports, loadCancerImages])

  const handleDeleteRecord = async () => {
    try {
      await dispatch(deletePatientThunk(id)).unwrap()
      toast.success('Patient record deleted successfully.')
      navigate('/patients')
    } catch (err) {
      toast.error(err || 'Failed to delete record.')
    }
  }

  if (status === 'loading' && !patient) {
    return <div className="text-center py-12 text-ink-secondary">Loading patient chart...</div>
  }

  if (!patient) {
    return <div className="text-center py-12 text-status-critical">Patient record not found.</div>
  }

  const age = calculateAge(patient.date_of_birth)

  return (
    <div className="space-y-4">
      {/* Top Breadcrumb & Back Bar */}
      <div className="flex items-center justify-between gap-2 text-xs">
        <nav className="flex items-center gap-1.5 text-ink-secondary">
          <button
            type="button"
            onClick={() => navigate('/patients')}
            className="hover:text-brand-blue font-medium transition-colors cursor-pointer"
          >
            Patient Register
          </button>
          <span className="opacity-40">/</span>
          <span className="text-ink-primary font-semibold truncate max-w-xs">{patient.full_name}</span>
        </nav>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (window.history.length > 1) {
              navigate(-1)
            } else {
              navigate('/patients')
            }
          }}
          className="text-ink-secondary hover:text-ink-primary text-xs flex items-center gap-1 h-8"
        >
          <RiArrowLeftLine size={14} /> Back to Patients
        </Button>
      </div>

      {/* Profile Header Block */}
      <div className="bg-brand-navy text-ink-inverse p-4 sm:p-6 rounded-lg shadow-sm flex flex-col sm:flex-row sm:items-center gap-4 relative overflow-hidden">
        {/* Profile Image */}
        <div className="w-20 h-20 rounded-full border-2 border-brand-light overflow-hidden bg-brand-light/20 flex items-center justify-center shrink-0 text-xl font-bold uppercase">
          {patient.photo_url ? (
            <img src={patient.photo_url} alt={patient.full_name} className="w-full h-full object-cover" />
          ) : (
            patient.full_name.charAt(0)
          )}
        </div>

        {/* Identity Details */}
        <div className="flex-1 text-center sm:text-left space-y-1.5 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h2 className="text-xl font-bold text-white truncate">{patient.full_name}</h2>
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="text-xs font-semibold font-mono bg-white/10 text-white px-2 py-0.5 rounded">
                {patient.patient_code}
              </span>
              <StatusBadge status={patient.treatment_status} className="bg-white/10 text-white border-white/25 hover:bg-white/20" />
            </div>
          </div>
          
          <p className="text-xs text-brand-light/80 font-light">
            {patient.gender} &bull; {age} years &bull; Blood group {patient.blood_group}
          </p>
          <p className="text-xs text-brand-light/80 font-light">
            Department: <span className="font-semibold">{patient.department}</span> &bull; Lead: <span className="font-semibold">{patient.assigned_doctor}</span>
          </p>
        </div>

        {/* Action Controls */}
        <div className="shrink-0 flex items-center gap-2 flex-wrap justify-center sm:justify-start">
          {isWritable && (
            <Button
              className="bg-brand-blue hover:bg-brand-blue-dark text-ink-inverse text-xs flex items-center gap-1.5 h-9"
              onClick={() => navigate(`/patients/${id}/edit`)}
            >
              <RiEditLine size={15} />
              Edit Chart
            </Button>
          )}

          {isSuperAdmin && (
            <Button
              variant="outline"
              className="border-white/20 hover:bg-white/10 text-ink-inverse hover:text-ink-inverse text-xs flex items-center gap-1.5 h-9"
              onClick={() => setConfirmOpen(true)}
            >
              <RiDeleteBin7Line size={15} />
              Delete Profile
            </Button>
          )}
        </div>
      </div>

      {/* Main Longitudinal Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-surface-card border border-surface-border p-1 h-auto flex flex-wrap rounded-lg">
          <TabsTrigger value="overview" className="data-[state=active]:bg-brand-blue data-[state=active]:text-ink-inverse text-xs px-4 py-2 font-medium">Overview</TabsTrigger>
          <TabsTrigger value="clinical" className="data-[state=active]:bg-brand-blue data-[state=active]:text-ink-inverse text-xs px-4 py-2 font-medium">Clinical Details</TabsTrigger>
          <TabsTrigger value="reports" className="data-[state=active]:bg-brand-blue data-[state=active]:text-ink-inverse text-xs px-4 py-2 font-medium">Reports</TabsTrigger>
          <TabsTrigger value="cancer_images" className="data-[state=active]:bg-brand-blue data-[state=active]:text-ink-inverse text-xs px-4 py-2 font-medium">Cancer Images</TabsTrigger>
          <TabsTrigger value="visits" className="data-[state=active]:bg-brand-blue data-[state=active]:text-ink-inverse text-xs px-4 py-2 font-medium">Visits</TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview */}
        <TabsContent value="overview" className="space-y-4 outline-none">
          <Card className="bg-surface-card border-surface-border">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-brand-navy uppercase tracking-wider">Demographics &amp; Contacts</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-3">
                <div>
                  <span className="text-xs text-ink-secondary block">Full Name</span>
                  <span className="font-semibold text-ink-primary">{patient.full_name}</span>
                </div>
                <div>
                  <span className="text-xs text-ink-secondary block">Date of Birth (Age)</span>
                  <span className="font-medium text-ink-primary">{patient.date_of_birth} ({age} years)</span>
                </div>
                <div>
                  <span className="text-xs text-ink-secondary block">Gender</span>
                  <span className="font-medium text-ink-primary">{patient.gender}</span>
                </div>
                <div>
                  <span className="text-xs text-ink-secondary block">Blood Group</span>
                  <span className="font-medium text-ink-primary">{patient.blood_group}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <span className="text-xs text-ink-secondary block">Phone Number</span>
                  <span className="font-medium text-ink-primary">{patient.phone}</span>
                </div>
                <div>
                  <span className="text-xs text-ink-secondary block">Email Address</span>
                  <span className="font-medium text-ink-primary">{patient.email || '—'}</span>
                </div>
                <div>
                  <span className="text-xs text-ink-secondary block">Residential Address</span>
                  <span className="font-medium text-ink-primary whitespace-pre-wrap">{patient.address}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-surface-card border-surface-border">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-brand-navy uppercase tracking-wider">Emergency Contact Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div>
                <span className="text-xs text-ink-secondary block">Contact Name</span>
                <span className="font-semibold text-ink-primary">{patient.emergency_contact_name}</span>
              </div>
              <div>
                <span className="text-xs text-ink-secondary block">Contact Phone</span>
                <span className="font-medium text-ink-primary">{patient.emergency_contact_phone}</span>
              </div>
              <div>
                <span className="text-xs text-ink-secondary block">Relationship</span>
                <span className="font-medium text-ink-primary">{patient.emergency_contact_relationship}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Clinical */}
        <TabsContent value="clinical" className="space-y-4 outline-none">
          <Card className="bg-surface-card border-surface-border">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-brand-navy uppercase tracking-wider">Cancer Registry Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-4">
                <div>
                  <span className="text-xs text-ink-secondary block">Primary Staging Diagnosis</span>
                  <span className="font-semibold text-ink-primary text-base">{patient.primary_diagnosis}</span>
                </div>
                <div>
                  <span className="text-xs text-ink-secondary block">Cancer Category</span>
                  <span className="font-medium text-ink-primary">{patient.cancer_category || '-'}</span>
                </div>
                <div>
                  <span className="text-xs text-ink-secondary block">Cancer Type</span>
                  <span className="font-medium text-ink-primary">{patient.cancer_type || '-'}</span>
                </div>
                <div>
                  <span className="text-xs text-ink-secondary block">Clinical Stage</span>
                  <span className="font-bold text-brand-blue">{patient.cancer_stage}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-xs text-ink-secondary block">Assigned Lead Doctor</span>
                  <span className="font-semibold text-ink-primary">{patient.assigned_doctor}</span>
                </div>
                <div>
                  <span className="text-xs text-ink-secondary block">Clinical Department</span>
                  <span className="font-medium text-ink-primary">{patient.department}</span>
                </div>
                <div>
                  <span className="text-xs text-ink-secondary block">Current Treatment Status</span>
                  <StatusBadge status={patient.treatment_status} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Reports */}
        <TabsContent value="reports" className="space-y-4 outline-none">
          {/* Upload Report Section (Admins/Super Admins only) */}
          {isWritable && (
            <Card className="bg-surface-card border-surface-border">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-brand-navy uppercase tracking-wider flex items-center gap-2">
                  <RiUpload2Line size={16} /> Upload Clinical Report
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUploadReport} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-ink-secondary">Report Title</label>
                    <Input
                      placeholder="e.g. CBC Test / Biopsy Report"
                      value={reportTitle}
                      onChange={(e) => setReportTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-ink-secondary">Select Document File</label>
                    <Input
                      id="report-file-input"
                      type="file"
                      disabled={uploadingReport}
                      accept=".pdf,.doc,.docx,.txt,.xls,.xlsx"
                      onChange={(e) => setReportFile(e.target.files[0])}
                      className="cursor-pointer text-xs disabled:opacity-60"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={uploadingReport}
                    className="bg-brand-blue hover:bg-brand-blue-dark text-ink-inverse font-semibold h-10 flex items-center justify-center gap-2"
                  >
                    {uploadingReport ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Uploading Document…</span>
                      </>
                    ) : (
                      'Upload Document'
                    )}
                  </Button>
                </form>

                {uploadingReport && (
                  <div className="mt-3 p-2.5 rounded-lg bg-brand-blue/10 border border-brand-blue/20 flex items-center gap-2 text-xs text-brand-blue animate-fade-in">
                    <span className="w-3.5 h-3.5 border-2 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin shrink-0" />
                    <span className="font-medium">Uploading and processing document, please wait…</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Reports Filter & Search Bar */}
          <Card className="bg-surface-card border-surface-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-brand-navy uppercase tracking-wider flex items-center gap-2">
                <RiFileTextLine size={16} /> Patient Report Archives
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search and Filters grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
                  <RiSearchLine className="absolute left-3 top-3 text-ink-disabled" size={16} />
                  <Input
                    placeholder="Search reports by title..."
                    value={reportsSearch}
                    onChange={(e) => setReportsSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <RiFilter3Line className="text-ink-disabled" size={16} />
                  <select
                    value={reportsTypeFilter}
                    onChange={(e) => setReportsTypeFilter(e.target.value)}
                    className="w-full h-10 rounded-md border border-surface-border bg-surface-card px-3 text-sm text-ink-primary focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  >
                    <option value="all">All File Formats</option>
                    <option value="pdf">PDF Documents</option>
                    <option value="doc">Word Files (DOC/DOCX)</option>
                    <option value="docx">Word (DOCX)</option>
                    <option value="xls">Excel sheets (XLS/XLSX)</option>
                    <option value="xlsx">Excel (XLSX)</option>
                    <option value="txt">Text Files (TXT)</option>
                  </select>
                </div>
              </div>

              {/* Date Range Filters Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 items-end border-t border-surface-border/50">
                <DatePicker
                  label="From Date"
                  value={reportsStartDate}
                  onChange={setReportsStartDate}
                  maxDate={new Date()}
                  placeholder="dd-mm-yyyy"
                />
                <DatePicker
                  label="To Date"
                  value={reportsEndDate}
                  onChange={setReportsEndDate}
                  maxDate={new Date()}
                  placeholder="dd-mm-yyyy"
                />
                <div className="flex h-10 items-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setReportsStartDate('')
                      setReportsEndDate('')
                      setReportsSearch('')
                      setReportsTypeFilter('all')
                    }}
                    className="w-full text-xs border-surface-border text-ink-primary hover:bg-surface-hover h-10"
                  >
                    Reset Filters
                  </Button>
                </div>
              </div>

              {/* Reports List */}
              {filteredReports.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-surface-border rounded-lg bg-surface-base/30">
                  <RiFileTextLine size={32} className="mx-auto text-ink-disabled mb-2 opacity-50" />
                  <p className="text-sm font-semibold text-ink-secondary">No matching reports found.</p>
                  <p className="text-xs text-ink-disabled">Try adjusting your filters or upload a new document.</p>
                </div>
              ) : (
                <div className="border border-surface-border rounded-lg overflow-hidden bg-surface-card">
                  <div className="divide-y divide-surface-border">
                    {filteredReports.map((report) => {
                      const isPdf = report.file_type.toLowerCase() === 'pdf'
                      const isWord = ['doc', 'docx'].includes(report.file_type.toLowerCase())
                      const FileIcon = isPdf ? RiFilePdfLine : (isWord ? RiFileWordLine : RiFileTextLine)
                      
                      return (
                        <div key={report.id} className="flex items-center justify-between p-4 hover:bg-surface-hover/40 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isPdf ? 'bg-red-50 text-red-500' : (isWord ? 'bg-blue-50 text-blue-500' : 'bg-slate-50 text-slate-500')}`}>
                              <FileIcon size={20} />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-ink-primary">{report.title}</p>
                              <p className="text-[10px] text-ink-disabled uppercase font-mono tracking-wider">
                                {report.file_type} &bull; {new Date(report.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {/* View Button */}
                            <button
                              type="button"
                              onClick={() => handleViewReport(report)}
                              disabled={activeReportAction.id === report.id}
                              className="p-1.5 text-ink-secondary hover:text-brand-blue hover:bg-surface-hover rounded-md transition-colors disabled:opacity-50 cursor-pointer"
                              title="View Report"
                            >
                              <RiEyeLine size={17} className={activeReportAction.id === report.id && activeReportAction.type === 'view' ? 'animate-pulse text-brand-blue' : ''} />
                            </button>

                            {/* Download Button */}
                            <button
                              type="button"
                              onClick={() => handleDownloadReport(report)}
                              disabled={activeReportAction.id === report.id}
                              className="p-1.5 text-ink-secondary hover:text-brand-blue hover:bg-surface-hover rounded-md transition-colors disabled:opacity-50 cursor-pointer"
                              title="Download Report"
                            >
                              <RiDownloadLine size={17} className={activeReportAction.id === report.id && activeReportAction.type === 'download' ? 'animate-bounce text-brand-blue' : ''} />
                            </button>

                            {/* Delete Button (Writable roles only) */}
                            {isWritable && (
                              <button
                                type="button"
                                onClick={() => handleDeleteReport(report.id)}
                                className="p-1.5 text-ink-secondary hover:text-status-critical hover:bg-status-critical-bg rounded-md transition-colors"
                                title="Delete Report"
                              >
                                <RiDeleteBin7Line size={17} />
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>


        {/* Tab: Cancer Images */}
        <TabsContent value="cancer_images" className="space-y-4 outline-none">
          {/* Upload Image Section (Admins/Super Admins only) */}
          {isWritable && (
            <Card className="bg-surface-card border-surface-border">
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-brand-navy uppercase tracking-wider flex items-center gap-2">
                  <RiImageLine size={16} /> Upload Cancer Image
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-ink-secondary">Scan Label / Description (Optional)</label>
                    <Input
                      placeholder="e.g. Chest CT Scan / Cycle 2 MRI"
                      value={imageTitle}
                      onChange={(e) => setImageTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <PhotoSelector
                      value=""
                      onChange={async (url) => {
                        // Capture the exact moment of photo selection/capture
                        const capturedAt = new Date().toISOString()
                        try {
                          await patientService.createPatientCancerImage(id, {
                            title: imageTitle.trim() || 'Clinical Image Scan',
                            image_url: url,
                            captured_at: capturedAt,
                          })
                          toast.success('Cancer image added to chart successfully.')
                          setImageTitle('')
                          loadCancerImages()
                        } catch {
                          toast.error('Failed to save cancer image record.')
                        }
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cancer Images Grid & Filter Controls */}
          <Card className="bg-surface-card border-surface-border">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="text-sm font-semibold text-brand-navy uppercase tracking-wider flex items-center gap-2">
                  <RiScanLine size={16} /> Cancer Staging &amp; Imaging Records
                </CardTitle>
                <div className="text-xs text-ink-secondary font-medium">
                  Showing {filteredCancerImages.length} of {cancerImages.length} record(s)
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search and Date Range Filters Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-1 pb-2 border-b border-surface-border/50 items-end">
                {/* Search Input */}
                <div className="relative space-y-1 md:col-span-1">
                  <label className="text-xs font-semibold text-ink-secondary block">Search Scans</label>
                  <div className="relative">
                    <RiSearchLine className="absolute left-3 top-3 text-ink-disabled pointer-events-none" size={16} />
                    <Input
                      placeholder="Filter scan label..."
                      value={imagesSearch}
                      onChange={(e) => setImagesSearch(e.target.value)}
                      className="pl-9 h-10"
                    />
                  </div>
                </div>

                {/* From Date Filter with Modern Calendar */}
                <div className="space-y-1">
                  <DatePicker
                    label="From Date"
                    value={imagesStartDate}
                    onChange={setImagesStartDate}
                    maxDate={new Date()}
                    placeholder="dd-mm-yyyy"
                  />
                </div>

                {/* To Date Filter with Modern Calendar */}
                <div className="space-y-1">
                  <DatePicker
                    label="To Date"
                    value={imagesEndDate}
                    onChange={setImagesEndDate}
                    maxDate={new Date()}
                    placeholder="dd-mm-yyyy"
                  />
                </div>

                {/* Reset Button */}
                <div className="flex h-10 items-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setImagesStartDate('')
                      setImagesEndDate('')
                      setImagesSearch('')
                    }}
                    disabled={!imagesStartDate && !imagesEndDate && !imagesSearch}
                    className="w-full text-xs border-surface-border text-ink-primary hover:bg-surface-hover h-10 flex items-center justify-center gap-1.5 disabled:opacity-40"
                  >
                    <RiFilter3Line size={14} /> Reset Filters
                  </Button>
                </div>
              </div>

              {/* Active Filter Badges notice (if filters applied) */}
              {(imagesStartDate || imagesEndDate || imagesSearch) && (
                <div className="flex items-center gap-2 flex-wrap text-xs bg-brand-blue/5 border border-brand-blue/20 rounded-md p-2 text-brand-navy">
                  <span className="font-semibold text-brand-blue flex items-center gap-1">
                    <RiFilter3Line size={13} /> Active Filter:
                  </span>
                  {imagesSearch && (
                    <span className="bg-surface-card border border-surface-border px-2 py-0.5 rounded text-[11px] font-medium">
                      Label: "{imagesSearch}"
                    </span>
                  )}
                  {imagesStartDate && (
                    <span className="bg-surface-card border border-surface-border px-2 py-0.5 rounded text-[11px] font-medium">
                      From: {imagesStartDate}
                    </span>
                  )}
                  {imagesEndDate && (
                    <span className="bg-surface-card border border-surface-border px-2 py-0.5 rounded text-[11px] font-medium">
                      To: {imagesEndDate}
                    </span>
                  )}
                </div>
              )}

              {/* Cancer Images Grid */}
              {filteredCancerImages.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-surface-border rounded-lg bg-surface-base/30">
                  <RiImageLine size={32} className="mx-auto text-ink-disabled mb-2 opacity-50" />
                  <p className="text-sm font-semibold text-ink-secondary">
                    {cancerImages.length === 0 ? 'No imaging scans recorded.' : 'No matching imaging scans found.'}
                  </p>
                  <p className="text-xs text-ink-disabled">
                    {cancerImages.length === 0
                      ? 'Upload scan documents or capture a live image above.'
                      : 'Try adjusting your date range filter or search keyword.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {filteredCancerImages.map((img) => {
                    const displayTime = img.captured_at || img.created_at
                    const isRenaming = renamingImageId === img.id
                    return (
                      <div
                        key={img.id}
                        className="group relative border border-surface-border rounded-lg overflow-hidden bg-surface-base hover:shadow-md transition-shadow"
                      >
                        {/* Image thumbnail — click to open lightbox */}
                        <div
                          className="aspect-square w-full overflow-hidden bg-black flex items-center justify-center cursor-pointer"
                          onClick={() => { if (!isRenaming) setActiveImageModal(img) }}
                        >
                          <img
                            src={img.image_url}
                            alt={img.title || 'Cancer Scan'}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>

                        {/* Card Footer */}
                        <div className="p-2.5 space-y-1">
                          {/* Title / Rename Row */}
                          {isRenaming ? (
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <input
                                autoFocus
                                value={renameText}
                                onChange={(e) => setRenameText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleRenameCancerImage(img.id)
                                  if (e.key === 'Escape') { setRenamingImageId(null); setRenameText('') }
                                }}
                                className="flex-1 min-w-0 text-xs border border-brand-blue rounded px-1.5 py-0.5 bg-surface-card text-ink-primary outline-none focus:ring-1 focus:ring-brand-blue"
                              />
                              <button
                                type="button"
                                onClick={() => handleRenameCancerImage(img.id)}
                                className="p-0.5 text-brand-blue hover:text-brand-blue-dark shrink-0"
                                title="Confirm rename"
                              >
                                <RiCheckLine size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => { setRenamingImageId(null); setRenameText('') }}
                                className="p-0.5 text-ink-secondary hover:text-status-critical shrink-0"
                                title="Cancel"
                              >
                                <RiCloseLine size={14} />
                              </button>
                            </div>
                          ) : (
                            <p className="text-xs font-semibold text-ink-primary truncate">{img.title || 'Clinical Image'}</p>
                          )}

                          {/* Date + Time */}
                          <div className="flex items-center gap-1 text-[10px] text-ink-disabled">
                            <RiTimeLine size={10} className="shrink-0" />
                            <span>{new Date(displayTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                          </div>

                          {/* Action Buttons */}
                          {!isRenaming && (
                            <div className="flex items-center gap-1 pt-0.5" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => handleDownloadCancerImage(img)}
                                disabled={activeImageAction.id === img.id}
                                className="flex-1 flex items-center justify-center gap-0.5 text-[10px] text-ink-secondary hover:text-brand-blue hover:bg-surface-hover rounded py-0.5 transition-colors cursor-pointer disabled:opacity-50"
                                title="Download image"
                              >
                                <RiDownloadLine size={11} className={activeImageAction.id === img.id ? 'animate-bounce text-brand-blue' : ''} />
                                <span>Save</span>
                              </button>
                              {isWritable && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => { setRenamingImageId(img.id); setRenameText(img.title || '') }}
                                    className="flex-1 flex items-center justify-center gap-0.5 text-[10px] text-ink-secondary hover:text-brand-blue hover:bg-surface-hover rounded py-0.5 transition-colors cursor-pointer"
                                    title="Rename"
                                  >
                                    <RiPencilLine size={11} /> Rename
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCancerImage(img.id)}
                                    className="flex-1 flex items-center justify-center gap-0.5 text-[10px] text-ink-secondary hover:text-status-critical hover:bg-status-critical-bg rounded py-0.5 transition-colors cursor-pointer"
                                    title="Delete"
                                  >
                                    <RiDeleteBin7Line size={11} /> Delete
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lightbox Preview Modal */}
          {activeImageModal && (
            <div
              className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4"
              onClick={() => { setActiveImageModal(null); setRenamingImageId(null); setRenameText('') }}
            >
              <div
                className="relative max-w-3xl w-full max-h-[90vh] bg-surface-card rounded-lg overflow-hidden border border-surface-border flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close */}
                <button
                  type="button"
                  onClick={() => { setActiveImageModal(null); setRenamingImageId(null); setRenameText('') }}
                  className="absolute right-3 top-3 text-white bg-black/50 hover:bg-black/80 p-1.5 rounded-full transition-colors z-10"
                >
                  <RiCloseLine size={20} />
                </button>

                {/* Image */}
                <div className="flex-1 bg-black flex items-center justify-center overflow-hidden p-6 min-h-[350px]">
                  <img
                    src={activeImageModal.image_url}
                    alt={activeImageModal.title || 'Full Scan View'}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>

                {/* Footer info bar */}
                <div className="p-4 bg-surface-card border-t border-surface-border space-y-3">
                  {/* Title + rename */}
                  {renamingImageId === activeImageModal.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        value={renameText}
                        onChange={(e) => setRenameText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameCancerImage(activeImageModal.id)
                          if (e.key === 'Escape') { setRenamingImageId(null); setRenameText('') }
                        }}
                        className="flex-1 text-sm border border-brand-blue rounded px-2 py-1 bg-surface-card text-ink-primary outline-none focus:ring-2 focus:ring-brand-blue"
                      />
                      <button
                        type="button"
                        onClick={() => handleRenameCancerImage(activeImageModal.id)}
                        className="flex items-center gap-1 bg-brand-blue hover:bg-brand-blue-dark text-white text-xs px-3 py-1.5 rounded font-semibold"
                      >
                        <RiCheckLine size={13} /> Save
                      </button>
                      <button
                        type="button"
                        onClick={() => { setRenamingImageId(null); setRenameText('') }}
                        className="text-xs text-ink-secondary hover:text-status-critical px-2 py-1.5"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-semibold text-ink-primary">{activeImageModal.title || 'Clinical Image'}</h4>
                        <div className="flex items-center gap-1 text-xs text-ink-secondary mt-1">
                          <RiTimeLine size={12} />
                          <span>
                            Captured: {new Date(activeImageModal.captured_at || activeImageModal.created_at).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'medium' })}
                          </span>
                        </div>
                      </div>
                      {/* Action buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        {isWritable && (
                          <>
                            <button
                              type="button"
                              onClick={() => { setRenamingImageId(activeImageModal.id); setRenameText(activeImageModal.title || '') }}
                              className="flex items-center gap-1 text-xs text-ink-secondary hover:text-brand-blue border border-surface-border hover:border-brand-blue px-2.5 py-1.5 rounded-md transition-colors"
                            >
                              <RiPencilLine size={13} /> Rename
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCancerImage(activeImageModal.id)}
                              className="flex items-center gap-1 text-xs text-status-critical border border-status-critical/30 hover:bg-status-critical-bg px-2.5 py-1.5 rounded-md transition-colors"
                            >
                              <RiDeleteBin7Line size={13} /> Delete
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDownloadCancerImage(activeImageModal)}
                          disabled={activeImageAction.id === activeImageModal.id}
                          className="flex items-center gap-1 bg-brand-blue hover:bg-brand-blue-dark text-ink-inverse text-xs px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <RiDownloadLine size={14} className={activeImageAction.id === activeImageModal.id ? 'animate-bounce' : ''} />
                          <span>{activeImageAction.id === activeImageModal.id ? 'Downloading...' : 'Full Resolution'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Tab 5: Patient Clinical Visits */}
        <TabsContent value="visits" className="space-y-4 outline-none">
          <PatientVisitsSection patient={patient} patientId={id} isWritable={isWritable} />
        </TabsContent>
      </Tabs>



      {/* Confirmation delete modal */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={handleDeleteRecord}
        title="Delete Patient Record?"
        description="This will permanently delete this oncology profile. This action will be logged in the system audit trail."
        confirmText="Delete Record"
        isDestructive
      />
    </div>
  )
}

// Age calculator helper
function calculateAge(dobString) {
  if (!dobString) return ''
  const dob = new Date(dobString)
  const diffMs = Date.now() - dob.getTime()
  const ageDate = new Date(diffMs)
  return Math.abs(ageDate.getUTCFullYear() - 1970)
}
