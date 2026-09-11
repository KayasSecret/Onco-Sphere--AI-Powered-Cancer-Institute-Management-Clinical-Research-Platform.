import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { useState, useEffect, useRef } from 'react'
import {
  RiDashboardLine,
  RiUserHeartLine,
  RiUserSettingsLine,
  RiSettings4Line,
  RiLogoutBoxLine,
  RiMenuLine,
  RiCloseLine,
  RiTestTubeLine,
  RiFileTextLine,
} from 'react-icons/ri'
import ICSRLogo from '../assets/ICSR-LOGO.png'
import { selectSidebarOpen, setSidebarOpen } from '../redux/slices/uiSlice'
import { selectUser, logoutThunk, getMeThunk } from '../redux/slices/authSlice'
import { Sheet, SheetContent } from '../components/ui/sheet'

// ── Nav items — role-aware filtering happens in the component ────────────────
const NAV_ITEMS = [
  {
    label: 'Onco Dashboard',
    icon: RiDashboardLine,
    to: '/dashboard',
    roles: ['SUPER_ADMIN', 'ADMIN', 'STUDENT'],
  },
  {
    label: 'Onco Register',
    icon: RiUserHeartLine,
    to: '/patients',
    roles: ['SUPER_ADMIN', 'ADMIN', 'STUDENT'],
  },
  {
    label: 'Onco Receipt',
    icon: RiFileTextLine,
    to: '/reports',
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    label: 'Onco Access',
    icon: RiUserSettingsLine,
    to: '/admin-management',
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    label: 'Settings',
    icon: RiSettings4Line,
    to: '/settings',
    roles: ['SUPER_ADMIN', 'ADMIN', 'STUDENT'],
  },
]

// ── Logo mark SVG ──────────────────────────────────────────────────────────
function HelixLogo({ collapsed }) {
  return (
    <div className="flex items-center gap-3 px-4 h-16 shrink-0">
      {/* Logo image — always visible */}
      <img
        src={ICSRLogo}
        alt="ICSR Logo"
        className="h-9 w-auto object-contain shrink-0"
      />
    </div>
  )
}

// ── Single nav item ────────────────────────────────────────────────────────
function NavItem({ item, collapsed }) {
  const Icon = item.icon

  return (
    <NavLink
      to={item.to}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        [
          'flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-all duration-300 ease-out group relative select-none',
          isActive
            ? 'bg-brand-blue !text-white font-bold shadow-md shadow-brand-blue/25 hover:bg-brand-blue-dark hover:!text-white focus:!text-white'
            : 'text-ink-secondary hover:bg-surface-hover hover:text-ink-primary font-medium',
        ].join(' ')
      }
    >
      {/* Icon with smooth scale micro-animation on hover */}
      <div className="shrink-0 w-5 h-5 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
        <Icon size={20} className="shrink-0" />
      </div>

      {/* Label — with 5% text scale micro-animation on hover */}
      <span
        className="label-transition overflow-hidden whitespace-nowrap text-sm font-semibold tracking-tight transition-transform duration-300 origin-left group-hover:scale-[1.05]"
        style={{
          opacity: collapsed ? 0 : 1,
          width: collapsed ? 0 : 'auto',
          visibility: collapsed ? 'hidden' : 'visible',
        }}
      >
        {item.label}
      </span>

      {/* Tooltip when collapsed */}
      {collapsed && (
        <div className="absolute left-full ml-2 px-2.5 py-1 bg-surface-card border border-surface-border text-ink-primary text-xs font-semibold rounded-md shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
          {item.label}
        </div>
      )}
    </NavLink>
  )
}

// ── Sidebar content (shared between desktop + mobile Sheet) ───────────────
function SidebarContent({ collapsed, onClose, user, filteredNav, onLogout }) {
  const [avatarPopoverOpen, setAvatarPopoverOpen] = useState(false)
  const popoverRef = useRef(null)

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setAvatarPopoverOpen(false)
      }
    }
    if (avatarPopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [avatarPopoverOpen])

  // Reset popover when sidebar expands
  useEffect(() => {
    if (!collapsed) {
      setAvatarPopoverOpen(false)
    }
  }, [collapsed])

  return (
    <aside
      className="sidebar-transition flex flex-col h-full bg-surface-card border-r border-surface-border text-ink-primary"
      style={{ width: collapsed ? 64 : 240 }}
    >
      {/* Header — logo + close button */}
      <div className="flex items-center justify-between shrink-0">
        <HelixLogo collapsed={collapsed} />
        {!collapsed && (
          <button
            onClick={onClose}
            aria-label="Collapse sidebar"
            className="mr-3 p-1.5 rounded-md text-ink-secondary hover:text-ink-primary hover:bg-surface-hover transition-colors duration-fast"
          >
            <RiCloseLine size={18} />
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="mx-4 h-px bg-surface-border shrink-0" />

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden space-y-0.5">
        {filteredNav.map((item) => (
          <NavItem key={item.to} item={item} collapsed={collapsed} />
        ))}
      </nav>

      {/* Divider */}
      <div className="mx-4 h-px bg-surface-border shrink-0" />

      {/* User footer */}
      <div className="p-3 shrink-0 relative" ref={popoverRef}>
        {collapsed ? (
          /* Collapsed Mode: Only Avatar picture displayed, clicking opens popover */
          <div className="flex justify-center items-center">
            <button
              type="button"
              onClick={() => setAvatarPopoverOpen((prev) => !prev)}
              className="relative shrink-0 w-9 h-9 rounded-full bg-brand-blue border border-surface-border overflow-hidden flex items-center justify-center text-ink-inverse text-xs font-bold uppercase hover:ring-2 hover:ring-brand-blue/50 focus:outline-none transition-all cursor-pointer"
              title={user?.full_name || 'User Profile'}
              aria-label="User profile options"
            >
              {user?.photo_url ? (
                <img src={user.photo_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                user?.full_name?.charAt(0) || 'U'
              )}
            </button>

            {/* Redesigned Popover Dropdown with Red Logout action */}
            {avatarPopoverOpen && (
              <div className="absolute left-full bottom-3 ml-3 z-50 w-48 bg-surface-card border border-surface-border rounded-xl shadow-2xl p-2 animate-in fade-in-50 zoom-in-95 backdrop-blur-xl">
                {/* User Info Header Snippet */}
                <div className="px-2 py-1.5 border-b border-surface-border mb-1">
                  <p className="text-xs font-semibold text-ink-primary truncate">
                    {user?.full_name || 'User'}
                  </p>
                  <p className="text-[10px] text-ink-secondary truncate">
                    {user?.email || user?.role?.replace('_', ' ')}
                  </p>
                </div>

                {/* Single Red Logout Action */}
                <button
                  type="button"
                  onClick={() => {
                    setAvatarPopoverOpen(false)
                    onLogout()
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-semibold text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                >
                  <RiLogoutBoxLine size={16} className="shrink-0 text-red-500" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Expanded Mode: Avatar + Name/Role + Logout Button */
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-surface-hover/30 border border-surface-border/50">
            {/* Avatar */}
            <div className="shrink-0 w-8 h-8 rounded-full bg-brand-blue border border-surface-border overflow-hidden flex items-center justify-center text-ink-inverse text-xs font-bold uppercase">
              {user?.photo_url ? (
                <img src={user.photo_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                user?.full_name?.charAt(0) || 'U'
              )}
            </div>

            {/* Name + role */}
            <div className="label-transition overflow-hidden flex-1 min-w-0">
              <p className="text-ink-primary text-xs font-bold truncate">
                {user?.full_name || 'User'}
              </p>
              <p className="text-ink-secondary text-[10px] font-medium truncate">
                {user?.role?.replace('_', ' ')}
              </p>
            </div>

            {/* Logout */}
            <button
              onClick={onLogout}
              aria-label="Log out"
              title="Log out"
              className="shrink-0 p-1.5 rounded-md text-ink-secondary hover:text-red-500 hover:bg-red-500/10 transition-colors duration-fast"
            >
              <RiLogoutBoxLine size={16} />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}

// ── App Layout ────────────────────────────────────────────────────────────
export default function AppLayout() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const sidebarOpen = useSelector(selectSidebarOpen)
  const user = useSelector(selectUser)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    dispatch(getMeThunk())
  }, [dispatch])

  const filteredNav = NAV_ITEMS.filter(
    (item) => item.roles.includes(user?.role)
  )

  const handleLogout = async () => {
    await dispatch(logoutThunk())
    navigate('/login')
  }

  const closeSidebar = () => dispatch(setSidebarOpen(false))
  const openSidebar = () => dispatch(setSidebarOpen(true))

  return (
    <div className="flex h-screen bg-surface-base overflow-hidden">
      {/* ── Desktop Sidebar ──────────────────────────────────────────── */}
      <div className="hidden lg:flex shrink-0 h-full">
        <SidebarContent
          collapsed={!sidebarOpen}
          onClose={closeSidebar}
          user={user}
          filteredNav={filteredNav}
          onLogout={handleLogout}
        />
      </div>

      {/* ── Mobile Sidebar (Sheet) ───────────────────────────────────── */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-60 border-0">
          <SidebarContent
            collapsed={false}
            onClose={() => setMobileOpen(false)}
            user={user}
            filteredNav={filteredNav}
            onLogout={handleLogout}
          />
        </SheetContent>
      </Sheet>

      {/* ── Main content area ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="h-[60px] bg-surface-card border-b border-surface-border flex items-center justify-between gap-3 px-4 shrink-0">
          {/* Left: Hamburger + Platform Title */}
          <div className="flex items-center gap-3 min-w-0">
            {!sidebarOpen ? (
              <button
                onClick={openSidebar}
                aria-label="Expand sidebar"
                className="hidden lg:flex p-2 rounded-md text-ink-secondary hover:text-ink-primary hover:bg-surface-hover transition-colors duration-fast shrink-0"
              >
                <RiMenuLine size={20} />
              </button>
            ) : null}

            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="lg:hidden p-2 rounded-md text-ink-secondary hover:text-ink-primary hover:bg-surface-hover transition-colors duration-fast shrink-0"
            >
              <RiMenuLine size={20} />
            </button>

            {/* Platform Title */}
            <div className="flex items-center gap-2.5 truncate">
              <span className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2.5">
                <span className="text-ink-primary font-extrabold font-sans whitespace-nowrap">
                  Onco Sphere Oncology Intelligence Platform
                </span>
              </span>
            </div>
          </div>

          <div className="flex-1" />

          {/* Right: user badge */}
          <div className="flex items-center gap-2">
            <span className="hidden sm:block text-xs text-ink-secondary font-medium">
              {user?.full_name}
            </span>
            <div className="w-8 h-8 rounded-full bg-brand-navy border border-surface-border overflow-hidden flex items-center justify-center text-ink-inverse text-xs font-bold uppercase">
              {user?.photo_url ? (
                <img src={user.photo_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                user?.full_name?.charAt(0) || 'U'
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
