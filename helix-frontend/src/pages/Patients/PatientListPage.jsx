import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  fetchPatientsThunk,
  deletePatientThunk,
  selectPatients,
  selectPatientsTotal,
  selectPatientStatus,
} from '../../redux/slices/patientSlice'
import { selectUserRole } from '../../redux/slices/authSlice'
import PageHeader from '../../components/PageHeader'
import DataTable from '../../components/DataTable'
import StatusBadge from '../../components/StatusBadge'
import ConfirmDialog from '../../components/ConfirmDialog'
import { Button } from '../../components/ui/button'
import { SkeletonTable } from '../../components/Skeletons'
import { RiUserAddLine, RiEyeLine, RiEditLine, RiDeleteBin7Line } from 'react-icons/ri'
import { toast } from 'sonner'

export default function PatientListPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const cancerTypeSite = searchParams.get('cancer_type_site') || ''
  const patients = useSelector(selectPatients)
  const total = useSelector(selectPatientsTotal)
  const status = useSelector(selectPatientStatus)
  const role = useSelector(selectUserRole)

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [deleteId, setDeleteId] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const limit = 10
  const isWritable = role === 'SUPER_ADMIN' || role === 'ADMIN'

  useEffect(() => {
  dispatch(fetchPatientsThunk({ page, limit, search, cancer_type_site: cancerTypeSite }))
  }, [dispatch, page, search, cancerTypeSite])

  const handleDeleteConfirm = async () => {
    if (!deleteId) return
    try {
      await dispatch(deletePatientThunk(deleteId)).unwrap()
      toast.success('Patient record deleted successfully.')
      // Refresh list
      dispatch(fetchPatientsThunk({ page, limit, search }))
    } catch (err) {
      toast.error(err || 'Failed to delete record.')
    } finally {
      setDeleteId(null)
    }
  }

  const columns = [
    {
      header: 'Patient Code',
      accessor: 'patient_code',
      cell: (row) => (
        <span className="font-semibold text-brand-blue dark:text-blue-400 font-mono">
          {row.patient_code}
        </span>
      ),
    },
    {
      header: 'Name',
      accessor: 'full_name',
      cell: (row) => (
        <div>
          <p className="font-medium text-ink-primary">{row.full_name}</p>
          <p className="text-[10px] text-ink-secondary">{row.gender}, {calculateAge(row.date_of_birth)} yrs</p>
        </div>
      ),
    },
    {
      header: 'Diagnosis / Stage',
      accessor: 'primary_diagnosis',
      headerClassName: 'hidden sm:table-cell',
      cellClassName: 'hidden sm:table-cell',
      cell: (row) => (
        <div>
          <p className="text-sm font-medium text-ink-primary truncate max-w-xs">{row.primary_diagnosis}</p>
          <p className="text-[11px] text-ink-secondary">{row.cancer_stage} ({row.cancer_type_site})</p>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: 'treatment_status',
      cell: (row) => <StatusBadge status={row.treatment_status} />,
    },
    {
      header: 'Assigned Care',
      accessor: 'assigned_doctor',
      headerClassName: 'hidden md:table-cell',
      cellClassName: 'hidden md:table-cell',
      cell: (row) => (
        <div>
          <p className="text-xs font-semibold text-ink-primary">{row.assigned_doctor}</p>
          <p className="text-[10px] text-brand-blue uppercase font-medium">{row.department}</p>
        </div>
      ),
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7 text-ink-secondary hover:text-brand-blue"
            onClick={() => navigate(`/patients/${row.id}`)}
            title="View Chart"
          >
            <RiEyeLine size={16} />
          </Button>

          {isWritable && (
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7 text-ink-secondary hover:text-brand-blue"
              onClick={() => navigate(`/patients/${row.id}/edit`)}
              title="Edit Chart"
            >
              <RiEditLine size={16} />
            </Button>
          )}

          {isWritable && (
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7 text-ink-secondary hover:text-status-critical"
              onClick={() => {
                setDeleteId(row.id)
                setConfirmOpen(true)
              }}
              title="Delete Record"
            >
              <RiDeleteBin7Line size={16} />
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Onco Register"
        breadcrumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Patient Register' }]}
        action={
          isWritable && (
            <Button
              className="bg-brand-blue hover:bg-brand-blue-dark text-ink-inverse text-xs px-4 py-2 font-semibold flex items-center gap-1.5 rounded-md"
              onClick={() => navigate('/patients/new')}
            >
              <RiUserAddLine size={15} />
              Register Patient
            </Button>
          )
        }
      />

      {status === 'loading' && patients.length === 0 ? (
        <SkeletonTable rows={5} cols={5} />
      ) : (
        <DataTable
          columns={columns}
          items={patients}
          total={total}
          page={page}
          limit={limit}
          onPageChange={setPage}
          onSearchChange={setSearch}
          searchPlaceholder="Search patients by name or code..."
          emptyMessage="No patients found matching the criteria."
        />
      )}

      {/* Confirmation delete modal */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Patient Record?"
        description="This will permanently delete the clinical patient profile. This action will be logged in the system audit trail."
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
