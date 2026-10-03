import { cn } from "@/lib/utils"
import { VISIT_STATUS_CONFIG } from "@/config/visitConstants"

/**
 * VisitStatusBadge � color-coded pill badge for visit statuses.
 * Status conveyed by both color AND icon (WCAG 2.1 AA).
 */
export default function VisitStatusBadge({ status, className, showIcon = true }) {
  const config = VISIT_STATUS_CONFIG[status] || {
    bg: "bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700",
    icon: null,
  }
  const Icon = config.icon

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
        config.bg,
        className
      )}
    >
      {showIcon && Icon && <Icon size={11} aria-hidden="true" />}
      {status || "Unknown"}
    </span>
  )
}
