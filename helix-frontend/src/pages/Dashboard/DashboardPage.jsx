import { useEffect, useState } from 'react'
import {
  RiUserHeartLine,
  RiCalendarCheckLine,
  RiTestTubeLine,
  RiUserSettingsLine,
  RiGraduationCapLine,
} from 'react-icons/ri'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import dashboardService from '../../services/dashboardService'

// ── Stat Card ─────────────────────────────────────────────────────────────
function StatCard({ title, value, icon: Icon, color, loading }) {
  if (loading) {
    return (
      <div className="helix-card p-5 space-y-3">
        <div className="w-24 h-4 bg-surface-hover rounded animate-pulse" />
        <div className="w-16 h-8 bg-surface-hover rounded animate-pulse" />
      </div>
    )
  }

  const colorMap = {
    navy:      'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    blue:      'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    active:    'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    attention: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    light:     'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  }

  return (
    <div className="helix-card p-5 hover:shadow-md transition-shadow duration-fast animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-ink-secondary text-sm font-medium mb-1">{title}</p>
          <p className="text-3xl font-bold text-ink-primary tabular-nums">{value ?? '0'}</p>
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[color] || colorMap.blue}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  )
}

// ── Dashboard Page ────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    const fetchStats = async () => {
      try {
        const res = await dashboardService.getStats()
        if (isMounted) {
          setStats(res.data)
          setLoading(false)
        }
      } catch (err) {
        console.error('Failed to load stats:', err)
      }
    }
    fetchStats()
    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-primary">Onco Dashboard</h1>
        </div>
        <span className="text-xs text-ink-secondary bg-surface-card border border-surface-border px-3 py-1.5 rounded-lg font-mono">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </span>
      </div>

      {/* KPI stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Total Patients"        value={stats?.total_patients}       icon={RiUserHeartLine}     color="navy" loading={loading} />
        <StatCard title="Today's Registrations" value={stats?.today_registrations}  icon={RiCalendarCheckLine} color="blue" loading={loading} />
        <StatCard title="Active Treatments"     value={stats?.active_treatments}    icon={RiTestTubeLine}      color="active" loading={loading} />
        <StatCard title="Total Admins"          value={stats?.total_admins}         icon={RiUserSettingsLine}  color="attention" loading={loading} />
        <StatCard title="Total Students"        value={stats?.total_students}       icon={RiGraduationCapLine} color="light" loading={loading} />
      </div>

      {/* Cancer Staging Chart */}
      {!loading && stats?.cancer_distribution && stats.cancer_distribution.length > 0 && (
        <Card className="bg-surface-card border-surface-border animate-fade-in">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-ink-primary uppercase tracking-wider">
              Patient Volume by Cancer Type
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              {stats.cancer_distribution.map((item, index) => {
                const gradients = [
                  'from-blue-500 to-indigo-500',
                  'from-emerald-500 to-teal-500',
                  'from-rose-500 to-pink-500',
                  'from-amber-500 to-orange-500',
                  'from-purple-500 to-fuchsia-500',
                  'from-sky-500 to-cyan-500',
                ]
                const gradient = gradients[index % gradients.length]
                const maxCount = Math.max(...stats.cancer_distribution.map(d => d.count), 1)
                const percentage = (item.count / maxCount) * 100

                return (
                  <div key={item.cancer_type} className="group space-y-1.5 hover:bg-surface-hover/30 p-2 rounded-lg transition-colors">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-ink-primary">{item.cancer_type}</span>
                      <span className="font-mono text-ink-secondary bg-surface-base px-2 py-0.5 rounded font-semibold">
                        {item.count} {item.count === 1 ? 'patient' : 'patients'}
                      </span>
                    </div>
                    <div className="w-full h-3 bg-surface-base border border-surface-border rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${gradient} transition-all duration-1000 ease-out`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
