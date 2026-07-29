import { Label } from './ui/label'

/**
 * FormField wrapper — binds validation error states and helper descriptions.
 */
export default function FormField({
  label,
  error,
  hint,
  id,
  required = false,
  children,
}) {
  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <Label htmlFor={id} className="text-ink-primary text-sm font-semibold flex items-center gap-1">
          {label}
          {required && <span className="text-status-critical font-bold">*</span>}
        </Label>
      )}
      <div className="relative">
        {children}
      </div>
      {hint && !error && (
        <p className="text-[11px] text-ink-secondary leading-normal">
          {hint}
        </p>
      )}
      {error && (
        <p className="text-[11px] text-status-critical font-medium animate-fade-in leading-normal">
          {error}
        </p>
      )}
    </div>
  )
}
