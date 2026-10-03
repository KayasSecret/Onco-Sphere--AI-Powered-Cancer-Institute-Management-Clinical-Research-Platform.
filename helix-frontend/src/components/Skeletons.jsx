import { Skeleton } from './ui/skeleton'

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="border border-surface-border rounded-lg overflow-hidden bg-surface-card">
        <div className="bg-surface-base h-10 border-b border-surface-border flex items-center px-4 gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
        <div className="divide-y divide-surface-border">
          {Array.from({ length: rows }).map((_, r) => (
            <div key={r} className="h-12 flex items-center px-4 gap-4">
              {Array.from({ length: cols }).map((_, c) => (
                <Skeleton key={c} className="h-3.5 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
