'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { logout } from '@/lib/actions/auth'

type NavItem = {
  href: string
  label: string
  icon: React.ReactNode
  // Match prefixes so nested routes like /dashboard/experiments/[id] still
  // highlight the Experiments item.
  matchPrefix?: string
}

const iconClass = 'size-5 shrink-0'

const primaryNav: NavItem[] = [
  {
    href: '/dashboard/overview',
    label: 'Overview',
    matchPrefix: '/dashboard/overview',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass} aria-hidden="true">
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </svg>
    ),
  },
  {
    href: '/dashboard/experiments',
    label: 'Experiments',
    matchPrefix: '/dashboard/experiments',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass} aria-hidden="true">
        <path d="M9 3v6L3.5 18a1.5 1.5 0 0 0 1.3 2.3h14.4A1.5 1.5 0 0 0 20.5 18L15 9V3" />
        <path d="M8 3h8" />
        <path d="M7.5 14h9" />
      </svg>
    ),
  },
]

const secondaryNav: NavItem[] = [
  {
    href: '/dashboard/profile',
    label: 'Account',
    matchPrefix: '/dashboard/profile',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass} aria-hidden="true">
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
]

function isActive(pathname: string, item: NavItem): boolean {
  const prefix = item.matchPrefix ?? item.href
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

export default function Sidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const sidebarWidth = collapsed ? 'lg:w-16' : 'lg:w-56'

  const renderNavLink = (item: NavItem) => {
    const active = isActive(pathname, item)
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setMobileOpen(false)}
        title={collapsed ? item.label : undefined}
        aria-current={active ? 'page' : undefined}
        className={`flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors ${
          active
            ? 'bg-brand/10 text-brand'
            : 'text-foreground/70 hover:bg-foreground/5 hover:text-foreground'
        } ${collapsed ? 'lg:justify-center lg:px-0' : ''}`}
      >
        {item.icon}
        <span className={collapsed ? 'lg:hidden' : ''}>{item.label}</span>
      </Link>
    )
  }

  return (
    <div className="flex min-h-screen">
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm transition-opacity"
        />
      )}

      <aside
        className={`
          fixed lg:sticky inset-y-0 left-0 top-0 z-50
          flex flex-col bg-background border-r border-foreground/10
          w-56 ${sidebarWidth}
          transition-[width,transform] duration-200 ease-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
          h-screen
        `}
      >
        <div className={`flex items-center gap-2 px-3 h-14 border-b border-foreground/10 ${collapsed ? 'lg:justify-center lg:px-0' : 'justify-between'}`}>
          <Link
            href="/dashboard/overview"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2 text-brand font-bold text-lg truncate"
            title={collapsed ? 'AB Tester' : undefined}
          >
            <span className="inline-flex items-center justify-center size-8 rounded-lg bg-brand/10 text-brand font-bold text-sm">
              AB
            </span>
            <span className={collapsed ? 'lg:hidden' : ''}>AB Tester</span>
          </Link>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 text-foreground/50 hover:text-foreground rounded transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-2 flex flex-col gap-0.5">
          {primaryNav.map(renderNavLink)}
        </nav>

        <div className="border-t border-foreground/10 p-2 flex flex-col gap-0.5">
          {secondaryNav.map(renderNavLink)}
          <form action={logout}>
            <button
              type="submit"
              title={collapsed ? 'Log out' : undefined}
              className={`w-full flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-foreground/70 hover:bg-foreground/5 hover:text-foreground transition-colors ${
                collapsed ? 'lg:justify-center lg:px-0' : ''
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass} aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span className={collapsed ? 'lg:hidden' : ''}>Log out</span>
            </button>
          </form>
        </div>

        <button
          type="button"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={() => setCollapsed(v => !v)}
          className="hidden lg:flex items-center justify-center h-9 border-t border-foreground/10 text-foreground/50 hover:text-foreground hover:bg-foreground/5 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`size-4 transition-transform ${collapsed ? 'rotate-180' : ''}`}
            aria-hidden="true"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="lg:hidden sticky top-0 z-30 flex items-center h-12 px-3 border-b border-foreground/10 bg-background">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
            className="p-1.5 text-foreground/70 hover:text-foreground rounded transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden="true">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <Link href="/dashboard/overview" className="ml-2 text-brand font-bold">
            AB Tester
          </Link>
        </div>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  )
}