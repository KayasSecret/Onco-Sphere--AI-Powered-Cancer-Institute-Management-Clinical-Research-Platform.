import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectUser } from '../../redux/slices/authSlice'
import PageHeader from '../../components/PageHeader'
import DataTable from '../../components/DataTable'
import FormField from '../../components/FormField'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog'
import { SkeletonTable } from '../../components/Skeletons'
import reportService from '../../services/reportService'
import { toast } from 'sonner'
import {
  RiSearchLine,
  RiAddLine,
  RiEditLine,
  RiHistoryLine,
  RiFileList2Line,
  RiDeleteBin7Line,
  RiSettingsLine,
  RiEyeLine,
} from 'react-icons/ri'
import ConfirmDialog from '../../components/ConfirmDialog'

export default function ReportHistoryPage() {
  const navigate = useNavigate()
  const currentUser = useSelector(selectUser)
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN'

  // Query States
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [reports, setReports] = useState([])

  // Modal States
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyLogs, setHistoryLogs] = useState([])
  const [historyReportNumber, setHistoryReportNumber] = useState('')

  const [versionsOpen, setVersionsOpen] = useState(false)
  const [versionsList, setVersionsList] = useState([])
  const [versionsReportNumber, setVersionsReportNumber] = useState('')

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [deleteNum, setDeleteNum] = useState('')

  useEffect(() => {
    fetchReports()
  }, [page, search])

  const fetchReports = async () => {
    setLoading(true)
    try {
      const res = await reportService.listReports({
        search: search.trim() || undefined,
        page,
        limit,
      })
      // Group by report_number to only show the latest version in the main list
      const allReports = res.data.reports || []
      
      // Filter latest version of each report_number manually to ensure clean UI
      const grouped = {}
      allReports.forEach(r => {
        if (!grouped[r.report_number] || grouped[r.report_number].version < r.version) {
          grouped[r.report_number] = r
        }
      })
      
      setReports(Object.values(grouped))
      setTotal(res.data.total || 0)
    } catch (err) {
      toast.error('Failed to retrieve reports history.')
    } finally {
      setLoading(false)
    }
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setPage(1)
    fetchReports()
  }

  const handleViewAuditHistory = async (reportNumber) => {
    setHistoryReportNumber(reportNumber)
    setLoading(true)
    try {
      const res = await reportService.getReportHistory(reportNumber)
      setHistoryLogs(res.data || [])
      setHistoryOpen(true)
    } catch (err) {
      toast.error('Failed to load audit logs.')
    } finally {
      setLoading(false)
    }
  }

  const handleViewVersions = async (reportNumber) => {
    setVersionsReportNumber(reportNumber)
    setLoading(true)
    try {
      const res = await reportService.getReportVersions(reportNumber)
      setVersionsList(res.data || [])
      setVersionsOpen(true)
    } catch (err) {
      toast.error('Failed to load report versions.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTrigger = (id, reportNumber) => {
    setDeleteId(id)
    setDeleteNum(reportNumber)
    setDeleteOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteId) return
    try {
      await reportService.deleteReport(deleteId)
      toast.success('Report deleted successfully.')
      fetchReports()
    } catch (err) {
      toast.error('Failed to delete report.')
    } finally {
      setDeleteOpen(false)
      setDeleteId(null)
      setDeleteNum('')
    }
  }

  const handlePrint = (reportId) => {
    navigate(`/reports/print/${reportId}?print=true`)
  }

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Draft':
        return 'bg-status-attention-bg text-status-attention border-status-attention/20'
      case 'Completed':
        return 'bg-brand-blue/10 text-brand-blue border-brand-blue/20'
      case 'Verified':
        return 'bg-status-active-bg text-status-active border-status-active/20'
      case 'Printed':
        return 'bg-ink-secondary/15 text-ink-primary border-surface-border'
      case 'Archived':
        return 'bg-ink-disabled/20 text-ink-disabled border-surface-border'
      default:
        return 'bg-surface-base text-ink-secondary border-surface-border'
    }
  }

  const columns = [
    {
      header: 'Report Number',
      cell: (row) => <span className="font-mono font-bold text-ink-primary">{row.report_number}</span>,
    },
    {
      header: 'Patient Info',
      cell: (row) => (
        <div>
          <p className="font-semibold text-ink-primary">{row.patient.full_name}</p>
          <p className="text-[10px] text-ink-secondary mt-0.5">{row.patient.patient_code} | {row.patient.gender}, {row.patient.date_of_birth}</p>
        </div>
      ),
    },
    {
      header: 'Report Date',
      cell: (row) => <span className="text-ink-secondary text-xs">{row.report_date}</span>,
    },
    {
      header: 'Authorizing Doctor',
      cell: (row) => <span className="text-ink-primary text-xs font-medium">{row.doctor_name}</span>,
    },
    {
      header: 'Status',
      cell: (row) => (
        <span className={['px-2 py-0.5 border text-[10px] font-bold rounded uppercase tracking-wide', getStatusStyle(row.status)].join(' ')}>
          {row.status}
        </span>
      ),
    },

    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7 text-ink-secondary hover:text-brand-blue"
            onClick={() => navigate(`/reports/edit/${row.id}`)}
            title="Edit / Open Report"
          >
            <RiEditLine size={16} />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7 text-ink-secondary hover:text-brand-blue"
            onClick={() => navigate(`/reports/print/${row.id}`)}
            title="View Pathology Report"
          >
            <RiEyeLine size={16} />
          </Button>



          {isSuperAdmin && (
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7 text-ink-secondary hover:text-status-critical"
              onClick={() => handleDeleteTrigger(row.id, row.report_number)}
              title="Delete Report"
            >
              <RiDeleteBin7Line size={16} />
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Onco Receipt History"
        breadcrumbs={[
          { label: 'Dashboard', to: '/dashboard' },
          { label: 'Onco Receipt' },
        ]}
      />

      {/* Control Row */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border border-surface-border bg-surface-card rounded-xl">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:max-w-md">
          <RiSearchLine className="absolute left-3 top-3 text-ink-secondary" size={16} />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by patient name, patient code, or report number..."
            className="pl-9 pr-4 bg-surface-base border-surface-border h-9"
          />
        </form>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={() => navigate('/reports/settings')}
            variant="outline"
            className="border-surface-border text-ink-primary hover:bg-surface-hover text-xs flex items-center gap-1.5 h-9"
          >
            <RiSettingsLine size={15} />
            Branding & Parameters
          </Button>
          
          <Button
            onClick={() => navigate('/reports/new')}
            className="bg-brand-blue hover:bg-brand-blue-dark text-ink-inverse text-xs flex items-center gap-1 font-bold h-9"
          >
            <RiAddLine size={16} />
            New Pathology Report
          </Button>
        </div>
      </div>

      {/* Main Table */}
      {loading && reports.length === 0 ? (
        <SkeletonTable rows={5} columns={7} />
      ) : (
        <div className="border border-surface-border bg-surface-card rounded-xl overflow-hidden shadow-xs">
          <DataTable
            items={reports}
            columns={columns}
            page={page}
            total={total}
            limit={limit}
            onPageChange={setPage}
            emptyMessage="No pathology reports generated yet."
          />
        </div>
      )}

      {/* MODAL 1: Audit Log History */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="sm:max-w-lg bg-surface-card border border-surface-border">
          <DialogHeader>
            <DialogTitle className="text-ink-primary font-bold text-base flex items-center gap-2">
              <RiFileList2Line className="text-brand-blue" />
              Audit Logs: {historyReportNumber}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 py-2">
            {historyLogs.map((log) => (
              <div key={log.id} className="flex gap-4 border-l-2 border-brand-blue/30 pl-4 py-1 relative">
                <div className="absolute w-2.5 h-2.5 rounded-full bg-brand-blue -left-[6px] top-2" />
                <div className="space-y-0.5 flex-1 min-w-0">
                  <p className="text-xs font-bold text-ink-primary">{log.action}</p>
                  <p className="text-[10px] text-ink-secondary">
                    Performed by {log.user_name} ({log.user_role})
                  </p>
                  <p className="text-[9px] text-ink-disabled font-medium">
                    {new Date(log.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              className="border-surface-border text-ink-primary hover:bg-surface-hover text-xs"
              onClick={() => setHistoryOpen(false)}
            >
              Close Log Viewer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Report Versions list */}
      <Dialog open={versionsOpen} onOpenChange={setVersionsOpen}>
        <DialogContent className="sm:max-w-lg bg-surface-card border border-surface-border">
          <DialogHeader>
            <DialogTitle className="text-ink-primary font-bold text-base flex items-center gap-2">
              <RiHistoryLine className="text-brand-blue" />
              Document Versions: {versionsReportNumber}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 py-2">
            {versionsList.map((ver) => (
              <div
                key={ver.id}
                className="flex items-center justify-between p-3.5 border border-surface-border bg-surface-base/10 rounded-lg"
              >
                <div>
                  <p className="text-xs font-bold text-ink-primary">Version {ver.version}</p>
                  <p className="text-[10px] text-ink-secondary mt-0.5">
                    Saved: {new Date(ver.created_at).toLocaleDateString()} by {ver.created_by?.full_name}
                  </p>
                  <span className={['inline-block px-1.5 py-0.5 border text-[9px] font-bold rounded uppercase tracking-wider mt-1.5', getStatusStyle(ver.status)].join(' ')}>
                    {ver.status}
                  </span>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    onClick={() => {
                      setVersionsOpen(false)
                      navigate(`/reports/edit/${ver.id}`)
                    }}
                    variant="outline"
                    className="border-surface-border text-ink-primary hover:bg-surface-hover text-[10px] h-8 px-2.5 font-bold"
                  >
                    Open
                  </Button>
                  <Button
                    onClick={() => {
                      setVersionsOpen(false)
                      handlePrint(ver.id)
                    }}
                    variant="outline"
                    className="border-surface-border text-ink-primary hover:bg-surface-hover text-[10px] h-8 px-2.5 font-bold"
                  >
                    Print
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              className="border-surface-border text-ink-primary hover:bg-surface-hover text-xs"
              onClick={() => setVersionsOpen(false)}
            >
              Close Version List
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRM: Report deletion */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDeleteConfirm}
        title="Wipe Report History?"
        description={`Are you sure you want to permanently delete this report ${deleteNum}? This action logs audits and cannot be undone.`}
        confirmText="Confirm Permanent Delete"
        isDestructive
      />
    </div>
  )
}
