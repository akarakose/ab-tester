export default function ExperimentsLoading() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="h-7 w-32 bg-foreground/10 rounded-md animate-pulse" />
        <div className="h-9 w-36 bg-foreground/10 rounded-lg animate-pulse" />
      </div>
      <div className="flex flex-col gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="border border-foreground/10 rounded-xl p-5">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex flex-col gap-1.5">
                <div className="h-5 w-48 bg-foreground/10 rounded animate-pulse" />
                <div className="h-3 w-24 bg-foreground/10 rounded animate-pulse" />
              </div>
              <div className="h-5 w-16 bg-foreground/10 rounded-full animate-pulse shrink-0" />
            </div>
            <div className="grid grid-cols-4 gap-2 mb-1.5">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="h-3 bg-foreground/8 rounded animate-pulse" />
              ))}
            </div>
            <div className="flex flex-col gap-1">
              {[...Array(2)].map((_, j) => (
                <div key={j} className="grid grid-cols-4 gap-2 px-1 py-1">
                  {[...Array(4)].map((_, k) => (
                    <div key={k} className="h-4 bg-foreground/10 rounded animate-pulse" />
                  ))}
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-foreground/10 shrink-0" />
              <div className="h-3 w-40 bg-foreground/10 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
