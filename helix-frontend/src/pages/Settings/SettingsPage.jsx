import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import axios from 'axios'
import api from '../../services/axiosInstance'
import { selectUser, selectUserRole, updateUserProfile } from '../../redux/slices/authSlice'
import PageHeader from '../../components/PageHeader'
import FormField from '../../components/FormField'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card'
import { toast } from 'sonner'
import {
  RiUserLine,
  RiPaletteLine,
  RiShieldKeyholeLine,
  RiInformationLine,
  RiCloudLine,
  RiDatabaseLine,
  RiShieldCheckLine,
  RiComputerLine,
  RiSunLine,
  RiMoonLine,
  RiServerLine,
  RiEditLine,
  RiEyeLine,
  RiEyeOffLine,
} from 'react-icons/ri'
import authService from '../../services/authService'
import PhotoSelector from '../../components/PhotoSelector'

const passwordSchema = yup.object({
  current_password: yup.string().required('Current password is required'),
  new_password: yup.string().min(8, 'Minimum 8 characters').required('New password is required'),
  confirm_password: yup
    .string()
    .oneOf([yup.ref('new_password')], 'Passwords do not match')
    .required('Please confirm your new password'),
})

export default function SettingsPage() {
  const dispatch = useDispatch()
  const user = useSelector(selectUser)
  const role = useSelector(selectUserRole)
  const isSuperAdmin = role === 'SUPER_ADMIN'

  // Tab State
  const [activeTab, setActiveTab] = useState('account')

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [profileName, setProfileName] = useState(user?.full_name || '')
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(user?.photo_url || '')
  const [savingProfile, setSavingProfile] = useState(false)

  // Sync profile editing inputs if user object loads asynchronously
  useEffect(() => {
    if (user) {
      setProfileName(user.full_name || '')
      setProfilePhotoUrl(user.photo_url || '')
    }
  }, [user])

  // Theme State (Default to Light)
  const [themeMode, setThemeMode] = useState(() => {
    return localStorage.getItem('theme') || 'light'
  })

  // Cloudinary State
  const [cloudinaryStatus, setCloudinaryStatus] = useState(null)
  const [loadingCloudinary, setLoadingCloudinary] = useState(false)
  const [loadingPassword, setLoadingPassword] = useState(false)

  // Show/Hide Password states
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPassword,
    formState: { errors: passwordErrors },
  } = useForm({
    resolver: yupResolver(passwordSchema),
  })

  // Fetch Cloudinary connection status for Super Admin on load
  const [storageStats, setStorageStats] = useState(null)
  const [loadingStorage, setLoadingStorage] = useState(false)

  const loadStorageStats = () => {
    setLoadingStorage(true)
    api
      .get('/api/v1/upload/storage')
      .then((res) => {
        setStorageStats(res.data)
      })
      .catch((err) => {
        console.error('Failed to load storage stats:', err)
      })
      .finally(() => {
        setLoadingStorage(false)
      })
  }

  useEffect(() => {
    if (activeTab === 'storage') {
      loadStorageStats( )
    }
  }, [activeTab])

  const formatBytes = (bytes) => {
    if (bytes === undefined || bytes === null) return '0 Bytes'
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
  useEffect(() => {
    if (isSuperAdmin) {
      setLoadingCloudinary(true)
      api
        .get('/api/v1/upload/status')
        .then((res) => {
          setCloudinaryStatus(res.data)
        })
        .catch(() => {
          setCloudinaryStatus({ provider: 'Local Fallback', active: false })
        })
        .finally(() => {
          setLoadingCloudinary(false)
        })
    }
  }, [isSuperAdmin])

  const handleThemeChange = (mode) => {
    setThemeMode(mode)
    localStorage.setItem('theme', mode)
    
    // DOM class toggling
    if (mode === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    toast.success(`Appearance theme set to ${mode === 'dark' ? 'Sleek Dark' : 'Classic Light'} mode.`)
  }

  const handleProfileSave = async (e) => {
    e.preventDefault()
    if (!profileName.trim()) {
      toast.error('Name cannot be empty.')
      return
    }
    setSavingProfile(true)
    try {
      const res = await authService.updateProfile({
        full_name: profileName.trim(),
        photo_url: profilePhotoUrl || null,
      })
      
      // Update Redux state and localStorage
      dispatch(updateUserProfile({
        full_name: res.data.full_name,
        photo_url: res.data.photo_url,
      }))
      
      toast.success('Profile details saved successfully.')
      setIsEditingProfile(false)
    } catch (err) {
      const detail = err.response?.data?.detail
      let errorMsg = 'Failed to update profile details.'
      if (typeof detail === 'string') {
        errorMsg = detail
      } else if (Array.isArray(detail)) {
        errorMsg = detail.map((d) => `${d.loc[d.loc.length - 1]}: ${d.msg}`).join(', ')
      }
      toast.error(errorMsg)
    } finally {
      setSavingProfile(false)
    }
  }

  const handlePasswordSubmit = async (data) => {
    setLoadingPassword(true)
    try {
      await authService.changePassword(user.id, data.current_password, data.new_password)
      toast.success('Password changed successfully.')
      resetPassword()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update password. Please check your current password.')
    } finally {
      setLoadingPassword(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Settings"
        breadcrumbs={[{ label: 'Dashboard', to: '/dashboard' }, { label: 'Settings' }]}
      />

      {/* Outer Settings Panel Container */}
      <div className="flex flex-col md:flex-row min-h-[550px] border border-surface-border bg-surface-card rounded-xl overflow-hidden shadow-xs">
        
        {/* Settings Left Sub-Navigation Sidebar */}
        <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-surface-border bg-surface-base/30 p-4 space-y-1.5 shrink-0 flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible">
          {[
            { id: 'account', label: 'Account Overview', icon: RiUserLine },
            { id: 'appearance', label: 'Appearance', icon: RiPaletteLine },
            { id: 'storage', label: 'Storage', icon: RiDatabaseLine, roles: ['SUPER_ADMIN', 'ADMIN'] },
            { id: 'security', label: 'Security', icon: RiShieldKeyholeLine },
            { id: 'about', label: 'About Onco Sphere', icon: RiInformationLine },
          ].filter((tab) => !tab.roles || tab.roles.includes(role))
          .map((tab) => {
            const IconComponent = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={[
                  'flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-semibold tracking-wide whitespace-nowrap transition-colors duration-fast w-full text-left',
                  isActive
                    ? 'bg-brand-blue text-ink-inverse shadow-xs'
                    : 'text-ink-secondary hover:bg-surface-hover hover:text-ink-primary',
                ].join(' ')}
              >
                <IconComponent size={16} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Settings Right Panel Display */}
        <div className="flex-1 p-6 md:p-8 bg-surface-card overflow-y-auto">
          
          {/* TAB 1: Account Overview */}
          {activeTab === 'account' && (
            <div className="space-y-6 max-w-xl animate-fade-in">
              <div>
                <h3 className="text-base font-bold text-ink-primary">Account Profile Overview</h3>
                <p className="text-xs text-ink-secondary mt-1">Review or edit your user login information and profile picture.</p>
              </div>

              {!isEditingProfile ? (
                <>
                  {/* Avatar Info Row */}
                  <div className="flex items-center gap-5 p-5 border border-surface-border bg-surface-base/30 rounded-xl">
                    <div className="w-16 h-16 rounded-full bg-brand-blue/15 text-brand-blue border border-brand-blue/20 overflow-hidden flex items-center justify-center text-2xl font-bold uppercase shadow-inner shrink-0">
                      {user?.photo_url ? (
                        <img src={user.photo_url} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        user?.full_name?.charAt(0) || 'U'
                      )}
                    </div>
                    <div className="space-y-1 flex-1 min-w-0">
                      <h4 className="text-base font-bold text-ink-primary leading-tight truncate">{user?.full_name}</h4>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-brand-blue/10 text-brand-blue border border-brand-blue/20">
                        {user?.role?.replace('_', ' ')}
                      </span>
                    </div>
                    <Button
                      onClick={() => setIsEditingProfile(true)}
                      className="bg-surface-card hover:bg-surface-hover border border-surface-border text-ink-primary text-xs flex items-center gap-1.5 h-9"
                    >
                      <RiEditLine size={14} />
                      Edit Profile
                    </Button>
                  </div>

                  {/* Data Table */}
                  <div className="space-y-3.5 text-sm">
                    <div className="flex justify-between py-2 border-b border-surface-border/50">
                      <span className="text-ink-secondary text-xs">Registered Name</span>
                      <span className="font-semibold text-ink-primary">{user?.full_name}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-surface-border/50">
                      <span className="text-ink-secondary text-xs">Email Address</span>
                      <span className="font-medium text-ink-primary">{user?.email}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-surface-border/50">
                      <span className="text-ink-secondary text-xs">System Authority Role</span>
                      <span className="font-medium text-ink-primary">{user?.role}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-ink-secondary text-xs">Account Status</span>
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-status-active">
                        <span className="w-1.5 h-1.5 rounded-full bg-status-active animate-pulse" />
                        Active / Audited
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                /* Profile Edit Mode Form */
                <form onSubmit={handleProfileSave} className="space-y-5">
                  <FormField label="Registered Full Name" required>
                    <Input
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="e.g. Dr. Maya Sharma"
                    />
                  </FormField>

                  <FormField label="Profile Picture (Webcam Selfie or Image File)">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full border border-surface-border bg-surface-base/55 overflow-hidden flex items-center justify-center text-xl font-bold uppercase shrink-0">
                        {profilePhotoUrl ? (
                          <img src={profilePhotoUrl} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          profileName.charAt(0) || 'U'
                        )}
                      </div>
                      <PhotoSelector
                        value={profilePhotoUrl}
                        onChange={(url) => setProfilePhotoUrl(url)}
                      />
                      {profilePhotoUrl && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setProfilePhotoUrl('')}
                          className="text-status-critical text-xs hover:bg-status-critical/10 h-9"
                        >
                          Remove Photo
                        </Button>
                      )}
                    </div>
                  </FormField>

                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      type="submit"
                      disabled={savingProfile}
                      className="bg-brand-blue hover:bg-brand-blue-dark text-ink-inverse text-xs px-4 py-2 font-bold rounded-md"
                    >
                      {savingProfile ? 'Saving Details...' : 'Save Profile'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setProfileName(user?.full_name || '')
                        setProfilePhotoUrl(user?.photo_url || '')
                        setIsEditingProfile(false)
                      }}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 2: Appearance Theme */}
          {activeTab === 'appearance' && (
            <div className="space-y-6 max-w-xl animate-fade-in">
              <div>
                <h3 className="text-base font-bold text-ink-primary">Interface Appearance</h3>
                <p className="text-xs text-ink-secondary mt-1">Select classic light theme or sleek dark theme mode for the application.</p>
              </div>

              {/* Theme Grid Selector */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-ink-secondary uppercase tracking-wider">Color Palette Mode</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    {
                      id: 'light',
                      name: 'Classic Light',
                      desc: 'Clean medical white layout with vibrant blue accents',
                      icon: RiSunLine,
                      bgPreview: 'bg-slate-100 border-slate-200 text-slate-900',
                    },
                    {
                      id: 'dark',
                      name: 'Sleek Dark',
                      desc: 'High contrast obsidian slate layout for clinical eye comfort',
                      icon: RiMoonLine,
                      bgPreview: 'bg-slate-950 border-slate-800 text-slate-100',
                    },
                  ].map((theme) => {
                    const ThemeIcon = theme.icon
                    const isSelected = themeMode === theme.id
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => handleThemeChange(theme.id)}
                        className={[
                          'flex flex-col items-start p-5 border rounded-2xl bg-surface-card hover:border-brand-blue/60 transition-all text-left space-y-3 relative overflow-hidden group cursor-pointer shadow-sm',
                          isSelected
                            ? 'border-brand-blue ring-2 ring-brand-blue/30 shadow-md shadow-brand-blue/10'
                            : 'border-surface-border',
                        ].join(' ')}
                      >
                        {/* Mini Visual Preview Box */}
                        <div className={`w-full h-20 rounded-lg p-2.5 flex flex-col justify-between border ${theme.bgPreview}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2.5 h-2.5 rounded-full bg-brand-blue" />
                              <div className="w-12 h-1.5 rounded bg-current opacity-40" />
                            </div>
                            <div className="w-4 h-4 rounded-full bg-current opacity-20" />
                          </div>
                          <div className="space-y-1">
                            <div className="w-3/4 h-2 rounded bg-current opacity-70" />
                            <div className="w-1/2 h-1.5 rounded bg-current opacity-30" />
                          </div>
                        </div>

                        <div className="flex items-center justify-between w-full pt-1">
                          <div className="flex items-center gap-2">
                            <ThemeIcon size={18} className={isSelected ? 'text-brand-blue' : 'text-ink-secondary'} />
                            <p className="text-xs font-bold text-ink-primary">{theme.name}</p>
                          </div>
                          {isSelected && (
                            <span className="text-[10px] uppercase tracking-wider font-bold bg-brand-blue/10 text-brand-blue px-2.5 py-0.5 rounded-full border border-brand-blue/20">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-ink-secondary leading-normal">{theme.desc}</p>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB: Storage */}
          {role !== 'STUDENT' && activeTab === 'storage' && (
            <div className="space-y-6 max-w-2xl animate-fade-in">
              <div>
                <h3 className="text-base font-bold text-ink-primary">System Storage Audit</h3>
                <p className="text-xs text-ink-secondary mt-1">Review the space utilized by clinical documents, imaging files, and system databases.</p>
              </div>

              {loadingStorage && !storageStats ? (
                <div className="text-center py-12 text-ink-secondary text-xs">Loading storage statistics...</div>
              ) : (
                (() => {
                  const stats = storageStats || {
                    reports_bytes: 0,
                    images_bytes: 0,
                    backups_bytes: 0,
                    avatars_bytes: 0,
                    total_used_bytes: 1,
                    capacity_bytes: 524288000,
                    utilized_percent: 0
                  }
                  
                  const total = stats.total_used_bytes || 1
                  const rPct = (stats.reports_bytes / total) * 100
                  const iPct = (stats.images_bytes / total) * 100
                  const bPct = (stats.backups_bytes / total) * 100
                  const aPct = (stats.avatars_bytes / total) * 100
                  
                  const rEnd = rPct
                  const iEnd = rEnd + iPct
                  const bEnd = iEnd + bPct
                  
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center p-6 border border-surface-border bg-surface-base/30 rounded-xl">
                      {/* Circular Graph (Pie Chart based on grade determination reference) */}
                      <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="relative w-44 h-44 rounded-full flex items-center justify-center shadow-md border-4 border-surface-card bg-surface-card overflow-hidden">
                          <div 
                            className="absolute inset-0 transition-transform duration-500 hover:scale-[1.03]"
                            style={{
                              background: `conic-gradient(#252D7E 0% ${rEnd}%, #2E9E7A ${rEnd}% ${iEnd}%, #C9973A ${iEnd}% ${bEnd}%, #8B5CF6 ${bEnd}% 100%)`,
                              borderRadius: '50%'
                            }}
                          />
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-bold text-ink-primary">Total Data Used: <span className="text-brand-blue">{formatBytes(stats.total_used_bytes)}</span></p>
                          <p className="text-[10px] text-ink-secondary mt-0.5">Allocated Capacity: {formatBytes(stats.capacity_bytes)} ({stats.utilized_percent}% utilized)</p>
                        </div>
                      </div>

                      {/* Legend & Details */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-ink-secondary uppercase tracking-wider">Storage Breakdown</h4>
                        
                        <div className="space-y-3">
                          {/* Item 1 */}
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="w-3.5 h-3.5 rounded bg-[#252D7E] inline-block border border-white/10" />
                              <span className="font-semibold text-ink-primary">Clinical Reports (PDF/DOC)</span>
                            </div>
                            <span className="font-mono text-ink-secondary">{formatBytes(stats.reports_bytes)} ({rPct.toFixed(1)}%)</span>
                          </div>

                          {/* Item 2 */}
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="w-3.5 h-3.5 rounded bg-[#2E9E7A] inline-block border border-white/10" />
                              <span className="font-semibold text-ink-primary">Cancer Scan Images</span>
                            </div>
                            <span className="font-mono text-ink-secondary">{formatBytes(stats.images_bytes)} ({iPct.toFixed(1)}%)</span>
                          </div>

                          {/* Item 3 */}
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="w-3.5 h-3.5 rounded bg-[#C9973A] inline-block border border-white/10" />
                              <span className="font-semibold text-ink-primary">System Backups & Logs</span>
                            </div>
                            <span className="font-mono text-ink-secondary">{formatBytes(stats.backups_bytes)} ({bPct.toFixed(1)}%)</span>
                          </div>

                          {/* Item 4 */}
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="w-3.5 h-3.5 rounded bg-[#8B5CF6] inline-block border border-white/10" />
                              <span className="font-semibold text-ink-primary">User Profile Avatars</span>
                            </div>
                            <span className="font-mono text-ink-secondary">{formatBytes(stats.avatars_bytes)} ({aPct.toFixed(1)}%)</span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="pt-2 border-t border-surface-border/50">
                          <div className="flex justify-between text-[10px] text-ink-secondary mb-1">
                            <span>Disk Usage</span>
                            <span>{stats.utilized_percent}%</span>
                          </div>
                          <div className="w-full h-2 bg-surface-base rounded-full overflow-hidden border border-surface-border">
                            <div className="h-full bg-brand-blue rounded-full" style={{ width: `${stats.utilized_percent}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })()
              )}
            </div>
          )}  {/* TAB 3: Security */}
          {activeTab === 'security' && (
            <div className="space-y-6 max-w-xl animate-fade-in">
              <div>
                <h3 className="text-base font-bold text-ink-primary">Security Settings</h3>
                <p className="text-xs text-ink-secondary mt-1">Manage and update your account access credentials.</p>
              </div>

              <Card className="bg-surface-base/30 border-surface-border shadow-none">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-xs font-bold text-brand-navy uppercase tracking-wider">
                    Change Password
                  </CardTitle>
                  <CardDescription className="text-[11px] text-ink-secondary">
                    Provide your current password to secure your credentials.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  <form onSubmit={handleSubmitPassword(handlePasswordSubmit)} className="space-y-4">
                    <FormField label="Current Password" error={passwordErrors.current_password?.message} required>
                      <div className="relative">
                        <Input
                          type={showCurrentPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          {...registerPassword('current_password')}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-3 text-ink-secondary hover:text-ink-primary"
                        >
                          {showCurrentPassword ? <RiEyeOffLine size={16} /> : <RiEyeLine size={16} />}
                        </button>
                      </div>
                    </FormField>

                    <FormField label="New Password" error={passwordErrors.new_password?.message} required>
                      <div className="relative">
                        <Input
                          type={showNewPassword ? 'text' : 'password'}
                          placeholder="Min. 8 characters"
                          {...registerPassword('new_password')}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-3 text-ink-secondary hover:text-ink-primary"
                        >
                          {showNewPassword ? <RiEyeOffLine size={16} /> : <RiEyeLine size={16} />}
                        </button>
                      </div>
                    </FormField>

                    <FormField label="Confirm New Password" error={passwordErrors.confirm_password?.message} required>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          {...registerPassword('confirm_password')}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-3 text-ink-secondary hover:text-ink-primary"
                        >
                          {showConfirmPassword ? <RiEyeOffLine size={16} /> : <RiEyeLine size={16} />}
                        </button>
                      </div>
                    </FormField>

                    <Button
                      type="submit"
                      disabled={loadingPassword}
                      className="bg-brand-blue hover:bg-brand-blue-dark text-ink-inverse text-xs px-4 py-2 font-bold rounded-md"
                    >
                      {loadingPassword ? 'Updating Password...' : 'Update Password'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 4: About Onco Sphere */}
          {activeTab === 'about' && (
            <div className="space-y-6 max-w-xl animate-fade-in">
              <div>
                <h3 className="text-base font-bold text-ink-primary">About Onco Sphere</h3>
                <p className="text-xs text-ink-secondary mt-1">Technical specifications and storage integrations audits.</p>
              </div>

              {/* Specs List */}
              <div className="space-y-3.5 text-xs text-ink-secondary">
                <div className="flex items-center justify-between p-3.5 bg-surface-base rounded-xl border border-surface-border">
                  <div className="flex items-center gap-3">
                    <RiComputerLine size={16} className="text-brand-navy" />
                    <div>
                      <p className="font-bold text-ink-primary">Onco Sphere Framework</p>
                      <p className="text-[10px] text-ink-secondary mt-0.5">Version 1.1.0 (Clinical Release)</p>
                    </div>
                  </div>
                  <span className="font-semibold text-ink-primary bg-surface-card border border-surface-border px-2 py-0.5 rounded uppercase text-[10px]">
                    Active
                  </span>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-surface-base rounded-xl border border-surface-border">
                  <div className="flex items-center gap-3">
                    <RiDatabaseLine size={16} className="text-brand-navy" />
                    <div>
                      <p className="font-bold text-ink-primary">Database Engine</p>
                      <p className="text-[10px] text-ink-secondary mt-0.5">SQLAlchemy ORM + MySQL Database (Production)</p>
                    </div>
                  </div>
                  <span className="font-semibold text-ink-primary bg-surface-card border border-surface-border px-2 py-0.5 rounded uppercase text-[10px] flex items-center gap-1">
                    <RiServerLine size={12} className="text-status-active" /> MySQL Connected
                  </span>
                </div>

                {/* Cloudinary Info (Super Admin only) */}
                {isSuperAdmin && (
                  <div className="flex items-center justify-between p-3.5 bg-surface-base rounded-xl border border-surface-border">
                    <div className="flex items-center gap-3">
                      <RiCloudLine size={16} className="text-brand-navy" />
                      <div>
                        <p className="font-bold text-ink-primary">Cloudinary Media Integration</p>
                        <p className="text-[10px] text-ink-secondary mt-0.5">
                          {cloudinaryStatus?.active
                            ? 'Encrypted cloud media uploads are active.'
                            : 'Local sandbox fallback uploads active.'}
                        </p>
                      </div>
                    </div>
                    <span
                      className={[
                        'px-2 py-0.5 rounded font-bold uppercase text-[9px] border',
                        cloudinaryStatus?.active
                          ? 'bg-status-active-bg text-status-active border-status-active/20'
                          : 'bg-status-attention-bg text-status-attention border-status-attention/20',
                      ].join(' ')}
                    >
                      {cloudinaryStatus?.active ? 'Active Cloud' : 'Offline / Dev Fallback'}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between p-3.5 bg-surface-base rounded-xl border border-surface-border">
                  <div className="flex items-center gap-3">
                    <RiShieldCheckLine size={16} className="text-brand-navy" />
                    <div>
                      <p className="font-bold text-ink-primary">Security Auditing Status</p>
                      <p className="text-[10px] text-ink-secondary mt-0.5">Full role-aware access controls enforced.</p>
                    </div>
                  </div>
                  <span className="font-bold text-status-active uppercase text-[9px] bg-status-active-bg border border-status-active/20 px-2 py-0.5 rounded-full">
                    Audited
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
