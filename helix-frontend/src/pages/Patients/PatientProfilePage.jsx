import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import {
  fetchPatientDetailThunk,
  deletePatientThunk,
  selectSelectedPatient,
  selectPatientStatus,
} from '../../redux/slices/patientSlice'
import { selectUserRole } from '../../redux/slices/authSlice'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import ConfirmDialog from '../../components/ConfirmDialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Button } from '../../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import {
  RiEditLine,
  RiDeleteBin7Line,
  RiFlaskLine,
  RiScanLine,
  RiLineChartLine,
  RiCalendarLine,
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
} from 'react-icons/ri'
import { toast } from 'sonner'
import patientService from '../../services/patientService'
import PhotoSelector from '../../components/PhotoSelector'
import DatePicker from '../../components/DatePicker'

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

  const loadReports = async () => {
    try {
      const res = await patientService.getPatientReports(id)
      setReports(res.data)
    } catch (err) {
      console.error('Failed to load patient reports:', err)
    }
  }

  const loadCancerImages = async () => {
    try {
      const res = await patientService.getPatientCancerImages(id)
      setCancerImages(res.data)
    } catch (err) {
      console.error('Failed to load patient cancer images:', err)
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
  }, [dispatch, id])

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
    <div className="space-y-6">
      {/* Profile Header Block */}
      <div className="bg-brand-navy text-ink-inverse p-6 rounded-lg shadow-sm flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">
        {/* Profile Image */}
        <div className="w-20 h-20 rounded-full border-2 border-brand-light overflow-hidden bg-brand-light/20 flex items-center justify-center shrink-0 text-xl font-bold uppercase">
          {patient.photo_url ? (
            <img src={patient.photo_url} alt={patient.full_name} className="w-full h-full object-cover" />
          ) : (
            patient.full_name.charAt(0)
          )}
        </div>

        {/* Identity Details */}
        <div className="flex-1 text-center md:text-left space-y-1.5 min-w-0">
          <div className="flex flex-col md:flex-row md:items-center gap-2">
            <h2 className="text-xl font-bold text-white truncate">{patient.full_name}</h2>
            <div className="flex items-center justify-center md:justify-start gap-2">
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
        <div className="shrink-0 flex items-center gap-2">
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
                      accept=".pdf,.doc,.docx,.txt,.xls,.xlsx"
                      onChange={(e) => setReportFile(e.target.files[0])}
                      className="cursor-pointer text-xs"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={uploadingReport}
                    className="bg-brand-blue hover:bg-brand-blue-dark text-ink-inverse font-semibold h-10"
                  >
                    {uploadingReport ? 'Uploading...' : 'Upload Document'}
                  </Button>
                </form>
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
                            <a
                              href={report.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-ink-secondary hover:text-brand-blue hover:bg-surface-hover rounded-md transition-colors"
                              title="View Report"
                            >
                              <RiEyeLine size={17} />
                            </a>

                            {/* Download Button */}
                            <a
                              href={report.file_url}
                              download
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-ink-secondary hover:text-brand-blue hover:bg-surface-hover rounded-md transition-colors"
                              title="Download Report"
                            >
                              <RiDownloadLine size={17} />
                            </a>

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
                        try {
                          await patientService.createPatientCancerImage(id, {
                            title: imageTitle.trim() || 'Clinical Image Scan',
                            image_url: url
                          })
                          toast.success('Cancer image added to chart successfully.')
                          setImageTitle('')
                          loadCancerImages()
                        } catch (err) {
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
                  {filteredCancerImages.map((img) => (
                    <div
                      key={img.id}
                      className="group relative border border-surface-border rounded-lg overflow-hidden bg-surface-base hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => setActiveImageModal(img)}
                    >
                      <div className="aspect-square w-full overflow-hidden bg-black flex items-center justify-center">
                        <img
                          src={img.image_url}
                          alt={img.title || 'Cancer Scan'}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="p-3">
                        <p className="text-xs font-semibold text-ink-primary truncate">{img.title || 'Clinical Image'}</p>
                        <p className="text-[10px] text-ink-disabled mt-0.5">
                          {new Date(img.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lightbox Preview Modal */}
          {activeImageModal && (
            <div
              className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4"
              onClick={() => setActiveImageModal(null)}
            >
              <div className="relative max-w-3xl w-full max-h-[85vh] bg-surface-card rounded-lg overflow-hidden border border-surface-border flex flex-col" onClick={e => e.stopPropagation()}>
                <button
                  onClick={() => setActiveImageModal(null)}
                  className="absolute right-3 top-3 text-white bg-black/50 hover:bg-black/80 p-1.5 rounded-full transition-colors z-10"
                >
                  <RiCloseLine size={20} />
                </button>
                <div className="flex-1 bg-black flex items-center justify-center overflow-hidden p-6 min-h-[350px]">
                  <img
                    src={activeImageModal.image_url}
                    alt={activeImageModal.title || 'Full Scan View'}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <div className="p-4 bg-surface-card border-t border-surface-border flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-ink-primary">{activeImageModal.title || 'Clinical Image'}</h4>
                    <p className="text-xs text-ink-secondary mt-0.5">
                      Uploaded on {new Date(activeImageModal.created_at).toLocaleString()}
                    </p>
                  </div>
                  <a
                    href={activeImageModal.image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 bg-brand-blue hover:bg-brand-blue-dark text-ink-inverse text-xs px-3 py-1.5 rounded-md font-semibold transition-colors"
                  >
                    <RiDownloadLine size={14} /> Full Resolution
                  </a>
                </div>
              </div>
            </div>
          )}
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
