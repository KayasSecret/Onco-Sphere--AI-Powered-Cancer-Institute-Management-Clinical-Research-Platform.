/**
 * <EmptyState message="No patients found" hint="Try adjusting your filters" />
 */
export default function EmptyState({ message, hint, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed border-surface-border rounded-lg bg-surface-base/30">
      <div className="w-12 h-12 rounded-full bg-surface-hover flex items-center justify-center text-brand-navy/30 mb-4">
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h3 className="text-sm font-semibold text-ink-primary">
        {message}
      </h3>
      {hint && (
        <p className="text-xs text-ink-secondary mt-1 max-w-xs mx-auto">
          {hint}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
