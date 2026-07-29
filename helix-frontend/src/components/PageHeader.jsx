import { Link } from 'react-router-dom'

/**
 * <PageHeader title="Helix Registry" breadcrumbs={[{ label: 'Home', to: '/' }]} action={<Button>Register</Button>} />
 */
export default function PageHeader({ title, breadcrumbs = [], action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-surface-border pb-5 mb-6">
      <div className="space-y-1.5">
        {breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1.5 text-xs text-ink-secondary">
            {breadcrumbs.map((crumb, idx) => (
              <span key={idx} className="flex items-center gap-1.5">
                {idx > 0 && <span className="opacity-40">/</span>}
                {crumb.to ? (
                  <Link to={crumb.to} className="hover:text-brand-blue font-medium transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-ink-disabled font-normal">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-2xl font-bold text-ink-primary tracking-tight leading-tight">
          {title}
        </h1>
      </div>
      {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
    </div>
  )
}
