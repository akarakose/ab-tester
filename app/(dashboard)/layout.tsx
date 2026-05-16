import Link from 'next/link'
import UserMenu from './UserMenu'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <nav className="border-b border-foreground/10 px-6 py-3 flex items-center justify-between">
        <Link href="/dashboard/experiments" className="text-brand font-bold text-lg">
          AB Tester
        </Link>
        <UserMenu />
      </nav>
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}