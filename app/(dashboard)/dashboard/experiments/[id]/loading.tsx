export default function ExperimentLoading() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex flex-col gap-2">
          <div className="h-4 w-36 bg-foreground/10 rounded animate-pulse" />
          <div className="h-7 w-64 bg-foreground/10 rounded-md animate-pulse mt-1" />
          <div className="h-3 w-28 bg-foreground/10 rounded animate-pulse" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-5 w-16 bg-foreground/10 rounded-full animate-pulse" />
          <div className="h-4 w-10 bg-foreground/10 rounded animate-pulse" />
        </div>
      </div>

      <div className="border border-foreground/10 rounded-xl p-5 mb-8">
        <div className="h-5 w-20 bg-foreground/10 rounded animate-pulse mb-4" />
        <div className="h-16 bg-foreground/10 rounded-lg animate-pulse mb-5" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex justify-between py-2 border-b border-foreground/5 last:border-0">
            <div className="h-4 w-40 bg-foreground/10 rounded animate-pulse" />
            <div className="h-4 w-16 bg-foreground/10 rounded animate-pulse" />
          </div>
        ))}
      </div>

      <div className="border border-foreground/10 rounded-xl p-5">
        <div className="h-5 w-32 bg-foreground/10 rounded animate-pulse mb-5" />
        <div className="flex flex-col gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-foreground/10 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}
