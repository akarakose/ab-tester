import Link from 'next/link'

export default function AuthNav() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-foreground/8 bg-background/80 backdrop-blur-md">
      <nav className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="text-brand font-bold text-lg tracking-tight">
          AB Tester
        </Link>
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm font-medium text-foreground/60 hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-foreground/5"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to home
        </Link>
      </nav>
    </header>
  )
}