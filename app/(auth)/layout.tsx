import AuthNav from '@/components/landing/AuthNav'
import Footer from '@/components/landing/Footer'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <AuthNav />
      {children}
      <Footer />
    </div>
  )
}