import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EmailEditor from './EmailEditor'
import CompanyNameEditor from './CompanyNameEditor'
import PasswordEditor from './PasswordEditor'
import DeleteAccountSection from './DeleteAccountSection'

export const metadata = { title: 'Account Settings' }

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_name, created_at')
    .eq('id', session.user.id)
    .maybeSingle()

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : null

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Account settings</h1>
        <p className="text-sm text-foreground/60 mt-1">Manage your profile and password.</p>
      </header>

      <section className="rounded-2xl border border-foreground/10 bg-background p-6 mb-6">
        <h2 className="text-base font-semibold mb-1">Profile</h2>
        <p className="text-sm text-foreground/60 mb-5">Your account details.</p>
        <dl className="grid grid-cols-[max-content_1fr] gap-x-8 gap-y-4 items-baseline text-sm">
          <dt className="text-foreground/60">Email</dt>
          <dd><EmailEditor currentEmail={session.user.email ?? ''} /></dd>

          <dt className="text-foreground/60">Company name</dt>
          <dd><CompanyNameEditor initialCompanyName={profile?.company_name ?? ''} /></dd>

          <dt className="text-foreground/60">Password</dt>
          <dd><PasswordEditor /></dd>

          {memberSince && (
            <>
              <dt className="text-foreground/60">Member since</dt>
              <dd className="text-foreground">{memberSince}</dd>
            </>
          )}
        </dl>
      </section>

      <section className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
        <h2 className="text-base font-semibold mb-1 text-red-500">Danger zone</h2>
        <p className="text-sm text-foreground/60 mb-5">
          Delete your account and all associated experiments. This cannot be undone.
        </p>
        <DeleteAccountSection />
      </section>
    </div>
  )
}