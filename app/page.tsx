import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LandingNav from '@/components/landing/Navbar'

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) redirect('/dashboard')

  return (
    <div className="min-h-screen flex flex-col">
      <LandingNav />
      <main className="flex-1 pt-14">

        {/* ── Hero ── */}
        <section className="relative flex flex-col items-center text-center px-6 pt-24 pb-20 overflow-hidden">
          {/* Background glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[720px] h-[420px] rounded-full opacity-30 dark:opacity-20 blur-3xl -z-10"
            style={{ background: 'radial-gradient(ellipse at center, #6366f1 0%, transparent 70%)' }}
          />

          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-brand/10 text-brand text-xs font-semibold px-3.5 py-1.5 rounded-full mb-8 border border-brand/20">
            <span className="w-1.5 h-1.5 rounded-full bg-brand" />
            Free A/B test significance calculator
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-[1.08] max-w-2xl">
            Run A/B tests.{' '}
            <span className="text-brand">Know what wins.</span>
          </h1>

          {/* Sub-headline */}
          <p className="mt-6 text-lg text-foreground/55 max-w-lg leading-relaxed">
            Enter your experiment data, set your confidence level, and instantly see which variant is statistically significant.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex items-center gap-3 flex-wrap justify-center">
            <Link
              href="/signup"
              className="bg-brand text-brand-foreground rounded-xl px-6 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-brand/25"
            >
              Get started free
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-foreground/60 hover:text-foreground transition-colors px-4 py-2.5"
            >
              Log in →
            </Link>
          </div>
        </section>

        {/* ── Visualization ── */}
        <section className="relative px-6 pb-24">
          {/* Faint bottom glow from hero bleeds in */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[500px] h-[200px] blur-3xl opacity-10 dark:opacity-10 -z-10"
            style={{ background: 'radial-gradient(ellipse at center, #6366f1 0%, transparent 70%)' }}
          />

          <div className="max-w-2xl mx-auto">
            {/* Caption */}
            <p className="text-center text-[11px] font-semibold uppercase tracking-widest text-foreground/30 mb-5">
              What your results look like
            </p>

            {/* Mock experiment card */}
            <div className="border border-foreground/10 rounded-2xl overflow-hidden bg-background shadow-2xl shadow-foreground/8 ring-1 ring-foreground/5">

              {/* Card header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-foreground/8">
                <div>
                  <p className="text-[10px] text-foreground/35 uppercase tracking-wider font-medium mb-0.5">Experiment</p>
                  <h3 className="font-semibold text-sm">Homepage CTA Button Colour</h3>
                </div>
                <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 rounded-full border border-emerald-200/60 dark:border-emerald-700/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Running
                </span>
              </div>

              {/* Winner banner */}
              <div className="flex items-start gap-3 bg-green-50 dark:bg-green-900/15 px-5 py-3.5 border-b border-green-100 dark:border-green-900/30">
                <div className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-700 dark:text-green-400">Winner found</p>
                  <p className="text-xs text-foreground/50 mt-0.5">Variant A (Green) is statistically significant at 95% confidence.</p>
                </div>
              </div>

              {/* Results table */}
              <div className="p-5">
                {/* Column headers */}
                <div className="grid grid-cols-[1fr_56px_48px_64px] gap-3 text-[10px] font-semibold uppercase tracking-wider text-foreground/35 px-1 mb-2">
                  <span>Variant</span>
                  <span className="text-right">Visitors</span>
                  <span className="text-right">Rate</span>
                  <span className="text-right">Uplift</span>
                </div>

                {/* Control row */}
                <div className="grid grid-cols-[1fr_56px_48px_64px] gap-3 items-center px-1 py-2.5 rounded-xl bg-foreground/[0.03] mb-1.5">
                  <div>
                    <p className="text-xs font-medium mb-2 text-foreground/70">Control (Blue)</p>
                    <div className="h-1 rounded-full bg-foreground/8 overflow-hidden">
                      <div className="h-full rounded-full bg-foreground/20" style={{ width: '55%' }} />
                    </div>
                  </div>
                  <span className="text-xs text-right tabular-nums text-foreground/60">2,847</span>
                  <span className="text-xs text-right tabular-nums font-semibold">4.2%</span>
                  <span className="text-xs text-right text-foreground/35">—</span>
                </div>

                {/* Winner row — Variant A */}
                <div className="grid grid-cols-[1fr_56px_48px_64px] gap-3 items-center px-1 py-2.5 rounded-xl bg-green-50/70 dark:bg-green-900/10 ring-1 ring-green-200 dark:ring-green-800/50 mb-1.5">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-xs font-medium">Variant A (Green)</p>
                      <span className="text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40 px-1.5 py-0.5 rounded-full leading-none">
                        winner
                      </span>
                    </div>
                    <div className="h-1 rounded-full bg-foreground/8 overflow-hidden">
                      <div className="h-full rounded-full bg-brand" style={{ width: '80%' }} />
                    </div>
                  </div>
                  <span className="text-xs text-right tabular-nums text-foreground/60">3,102</span>
                  <span className="text-xs text-right tabular-nums font-bold text-green-700 dark:text-green-400">6.1%</span>
                  <span className="text-xs text-right tabular-nums font-bold text-green-600 dark:text-green-400">+45.2%</span>
                </div>

                {/* Variant B row */}
                <div className="grid grid-cols-[1fr_56px_48px_64px] gap-3 items-center px-1 py-2.5 rounded-xl">
                  <div>
                    <p className="text-xs font-medium mb-2 text-foreground/70">Variant B (Orange)</p>
                    <div className="h-1 rounded-full bg-foreground/8 overflow-hidden">
                      <div className="h-full rounded-full bg-foreground/25" style={{ width: '65%' }} />
                    </div>
                  </div>
                  <span className="text-xs text-right tabular-nums text-foreground/60">2,991</span>
                  <span className="text-xs text-right tabular-nums font-semibold">5.0%</span>
                  <span className="text-xs text-right tabular-nums text-foreground/50">+19.0%</span>
                </div>
              </div>

              {/* Card footer */}
              <div className="px-5 py-3 border-t border-foreground/8 bg-foreground/[0.015]">
                <p className="text-[10px] text-foreground/35">95% confidence level · Z-test · Bonferroni correction applied for multiple variants</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section className="px-6 py-24 border-t border-foreground/8">
          <div className="max-w-4xl mx-auto">
            <p className="text-center text-[11px] font-semibold uppercase tracking-widest text-foreground/30 mb-3">
              How it works
            </p>
            <h2 className="text-center text-3xl sm:text-4xl font-bold tracking-tight mb-16">
              Simple as one, two, three
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-4 relative">
              {/* Connecting dashes — two segments, each stopping at the adjacent icon edges */}
              <div aria-hidden className="hidden sm:block absolute top-8 left-[calc(16.67%+32px)] right-[calc(50.5%+32px)] h-px border-t-2 border-dashed border-foreground/10" />
              <div aria-hidden className="hidden sm:block absolute top-8 left-[calc(50.5%+32px)] right-[calc(16.67%+32px)] h-px border-t-2 border-dashed border-foreground/10" />

              {/* Step 1 */}
              <div className="flex flex-col items-center text-center px-4">
                <div className="relative mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-brand/10 flex items-center justify-center">
                    <svg className="w-7 h-7 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                    </svg>
                  </div>
                  <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-brand text-brand-foreground text-[10px] font-bold flex items-center justify-center leading-none">
                    1
                  </span>
                </div>
                <h3 className="font-semibold text-base mb-2">Enter your data</h3>
                <p className="text-sm text-foreground/50 leading-relaxed">
                  Name your variants and enter visitor and conversion counts. Support for up to 6 variants at once.
                </p>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center text-center px-4">
                <div className="relative mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-brand/10 flex items-center justify-center">
                    <svg className="w-7 h-7 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21a48.309 48.309 0 01-8.135-.687c-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                    </svg>
                  </div>
                  <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-brand text-brand-foreground text-[10px] font-bold flex items-center justify-center leading-none">
                    2
                  </span>
                </div>
                <h3 className="font-semibold text-base mb-2">We run the math</h3>
                <p className="text-sm text-foreground/50 leading-relaxed">
                  Z-tests for multiple comparisons. Set your own confidence level.
                </p>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center text-center px-4">
                <div className="relative mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-brand/10 flex items-center justify-center">
                    <svg className="w-7 h-7 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
                    </svg>
                  </div>
                  <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-brand text-brand-foreground text-[10px] font-bold flex items-center justify-center leading-none">
                    3
                  </span>
                </div>
                <h3 className="font-semibold text-base mb-2">Know your winner</h3>
                <p className="text-sm text-foreground/50 leading-relaxed">
                  See exactly which variant wins, the uplift percentage, and the p-value — all in one view.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="px-6 py-24 border-t border-foreground/8">
          <div className="max-w-2xl mx-auto text-center">
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 -translate-x-1/2 w-[500px] h-[200px] blur-3xl opacity-20 dark:opacity-15 -z-10"
              style={{ background: 'radial-gradient(ellipse at center, #6366f1 0%, transparent 70%)' }}
            />
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Ready to find your winner?
            </h2>
            <p className="text-foreground/50 mb-10 text-lg leading-relaxed">
              Create your first experiment in seconds. Free, no credit card required.
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 bg-brand text-brand-foreground rounded-xl px-8 py-3 text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-brand/25"
            >
              Get started free
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        </section>

      </main>

      {/* ── Footer ── */}
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
    </div>
  )
}