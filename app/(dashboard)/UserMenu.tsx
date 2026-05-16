'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { logout } from '@/lib/actions/auth'

export default function UserMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-label="Profile menu"
        aria-haspopup="menu"
        aria-expanded={open}
        className="size-9 rounded-full bg-brand/10 text-brand ring-1 ring-brand/20 hover:bg-brand/15 hover:ring-brand/30 inline-flex items-center justify-center transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4"
          aria-hidden="true"
        >
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-44 rounded-xl border border-foreground/10 bg-background shadow-lg shadow-foreground/[0.06] ring-1 ring-foreground/5 py-1 z-50 animate-fade-in-up"
        >
          <Link
            href="/dashboard/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-sm text-foreground/80 hover:bg-foreground/5 hover:text-foreground transition-colors"
          >
            Account
          </Link>
          <div className="h-px bg-foreground/5 my-1" />
          <form action={logout}>
            <button
              type="submit"
              role="menuitem"
              className="w-full text-left px-3 py-2 text-sm text-foreground/80 hover:bg-foreground/5 hover:text-foreground transition-colors"
            >
              Log out
            </button>
          </form>
        </div>
      )}
    </div>
  )
}