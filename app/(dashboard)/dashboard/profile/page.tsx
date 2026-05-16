import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ProfileForm from './ProfileForm'
import EmailForm from './EmailForm'
import PasswordForm from './PasswordForm'
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
        <Link
          href="/dashboard/experiments"
          className="inline-flex items-center gap-1 text-sm text-foreground/60 hover:text-foreground transition-colors mb-4"
        >
          <span aria-hidden>←</span> Back to dashboard
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Account settings</h1>
        <p className="text-sm text-foreground/60 mt-1">Manage your profile, email, and password.</p>
      </header>

      <section className="rounded-2xl border border-foreground/10 bg-background p-6 mb-6">
        <h2 className="text-base font-semibold mb-1">Profile</h2>
        <p className="text-sm text-foreground/60 mb-5">Your account details.</p>
        <dl className="grid grid-cols-3 gap-x-4 gap-y-2 text-sm mb-6">
          <dt className="text-foreground/60">Email</dt>
          <dd className="col-span-2 text-foreground">{session.user.email}</dd>
          {memberSince && (
            <>
              <dt className="text-foreground/60">Member since</dt>
              <dd className="col-span-2 text-foreground">{memberSince}</dd>
            </>
          )}
        </dl>
        <ProfileForm initialCompanyName={profile?.company_name ?? ''} />
      </section>

      <section className="rounded-2xl border border-foreground/10 bg-background p-6 mb-6">
        <h2 className="text-base font-semibold mb-1">Change email</h2>
        <p className="text-sm text-foreground/60 mb-5">
          You will receive confirmation links at both your current and new email. Both must be clicked.
        </p>
        <EmailForm currentEmail={session.user.email ?? ''} />
      </section>

      <section className="rounded-2xl border border-foreground/10 bg-background p-6 mb-6">
        <h2 className="text-base font-semibold mb-1">Change password</h2>
        <p className="text-sm text-foreground/60 mb-5">Enter your current password to set a new one.</p>
        <PasswordForm />
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