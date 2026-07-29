import { cn } from '@/lib/utils'

const STATUS_MAP = {
  'Newly Diagnosed': {
    bg: 'bg-brand-navy/10 text-brand-navy border-brand-navy/20',
    label: 'Newly Diagnosed',
  },
  'NEWLY_DIAGNOSED': {
    bg: 'bg-brand-navy/10 text-brand-navy border-brand-navy/20',
    label: 'Newly Diagnosed',
  },
  'Under Treatment': {
    bg: 'bg-status-active-bg text-status-active border-status-active/20',
    label: 'Under Treatment',
  },
  'UNDER_TREATMENT': {
    bg: 'bg-status-active-bg text-status-active border-status-active/20',
    label: 'Under Treatment',
  },
  'In Remission': {
    bg: 'bg-brand-light/30 text-brand-navy border-brand-light/40',
    label: 'In Remission',
  },
  'IN_REMISSION': {
    bg: 'bg-brand-light/30 text-brand-navy border-brand-light/40',
    label: 'In Remission',
  },
  'Palliative': {
    bg: 'bg-status-attention-bg text-status-attention border-status-attention/20',
    label: 'Palliative',
  },
  'PALLIATIVE': {
    bg: 'bg-status-attention-bg text-status-attention border-status-attention/20',
    label: 'Palliative',
  },
  'Discharged': {
    bg: 'bg-status-inactive-bg text-status-inactive border-status-inactive/20',
    label: 'Discharged',
  },
  'DISCHARGED': {
    bg: 'bg-status-inactive-bg text-status-inactive border-status-inactive/20',
    label: 'Discharged',
  },
}

export default function StatusBadge({ status, className }) {
  const config = STATUS_MAP[status] || {
    bg: 'bg-status-inactive-bg text-status-inactive border-status-inactive/20',
    label: status,
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-colors",
        config.bg,
        className
      )}
    >
      {config.label}
    </span>
  )
}
