import { cn } from "@/lib/utils"
import { VISIT_TYPE_CONFIG } from "@/config/visitConstants"

export default function VisitTypeBadge({ type, className }) {
  const config = VISIT_TYPE_CONFIG[type] || {
    bg: "bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400",
  }
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold", config.bg, className)}>
      {type || "�"}
    </span>
  )
}
