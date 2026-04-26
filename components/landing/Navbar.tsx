import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function LandingNav() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-foreground/8 bg-background/80 backdrop-blur-md">
      <nav className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="text-brand font-bold text-lg tracking-tight">
          AB Tester
        </Link>

        <div className="flex items-center gap-2">
          {user ? (
            <Link
              href="/dashboard"
              className="bg-brand text-brand-foreground rounded-lg px-4 py-1.5 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Go to dashboard →
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-foreground/5"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="bg-brand text-brand-foreground rounded-lg px-4 py-1.5 text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Sign up free
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}