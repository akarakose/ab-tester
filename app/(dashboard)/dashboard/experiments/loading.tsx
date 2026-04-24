export default function ExperimentsLoading() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="h-7 w-32 bg-foreground/10 rounded-md animate-pulse" />
        <div className="h-9 w-36 bg-foreground/10 rounded-lg animate-pulse" />
      </div>
      <div className="flex flex-col gap-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="border border-foreground/10 rounded-xl p-5 flex flex-col gap-4">
            <div className="flex justify-between">
              <div className="h-5 w-48 bg-foreground/10 rounded animate-pulse" />
              <div className="h-5 w-16 bg-foreground/10 rounded-full animate-pulse" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="h-8 bg-foreground/10 rounded animate-pulse" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
