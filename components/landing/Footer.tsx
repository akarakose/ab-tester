import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-foreground/8 px-6 py-8">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="text-brand font-bold text-base tracking-tight">AB Tester</span>
        <div className="flex items-center gap-6">
          <Link href="/login" className="text-sm text-foreground/40 hover:text-foreground transition-colors">
            Log in
          </Link>
          <Link href="/signup" className="text-sm text-foreground/40 hover:text-foreground transition-colors">
            Sign up
          </Link>
        </div>
        <p className="text-xs text-foreground/30">© {new Date().getFullYear()} AB Tester</p>
      </div>
    </footer>
  )
}
