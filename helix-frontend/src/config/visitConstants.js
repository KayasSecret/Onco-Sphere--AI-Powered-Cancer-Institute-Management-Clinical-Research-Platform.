import {
  RiCalendarLine,
  RiCheckLine,
  RiStethoscopeLine,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiAlertLine,
} from 'react-icons/ri'

export const VISIT_TYPES = [
  'Initial Consultation',
  'Follow-up',
  'Chemotherapy',
  'Radiation Therapy',
  'Surgery',
  'Diagnostic',
  'Emergency',
  'Treatment Review',
  'Post-operative Follow-up',
]

export const VISIT_STATUSES = [
  'Scheduled',
  'Checked In',
  'In Consultation',
  'Completed',
  'Cancelled',
  'No Show',
]

export const DEPARTMENTS = [
  'Oncology',
  'Radiation Oncology',
  'Surgical Oncology',
  'Medical Oncology',
  'Pathology',
  'Radiology',
  'Palliative Care',
  'Haematology',
  'Gynaecological Oncology',
  'Paediatric Oncology',
  'Emergency',
] 

export const VISIT_STATUS_CONFIG = {
  'Scheduled':       { bg: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',       icon: RiCalendarLine,       dot: 'bg-blue-500' },
  'Checked In':      { bg: 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800',       icon: RiCheckLine,          dot: 'bg-cyan-500' },
  'In Consultation': { bg: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800', icon: RiStethoscopeLine,    dot: 'bg-amber-500' },
  'Completed':       { bg: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',  icon: RiCheckboxCircleLine, dot: 'bg-green-500' },
  'Cancelled':       { bg: 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700',       icon: RiCloseCircleLine,    dot: 'bg-gray-400' },
  'No Show':         { bg: 'bg-red-100 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',             icon: RiAlertLine,          dot: 'bg-red-500' },
}

export const VISIT_TYPE_CONFIG = {
  'Initial Consultation':     { bg: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  'Follow-up':                { bg: 'bg-brand-navy/10 text-brand-navy dark:bg-blue-900/30 dark:text-blue-300' },
  'Chemotherapy':             { bg: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  'Radiation Therapy':        { bg: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  'Surgery':                  { bg: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
  'Diagnostic':               { bg: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' },
  'Emergency':                { bg: 'bg-red-200 text-red-800 font-semibold dark:bg-red-900/50 dark:text-red-200' },
  'Treatment Review':         { bg: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
  'Post-operative Follow-up': { bg: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
}
