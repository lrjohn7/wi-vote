export function MapPageSkeleton() {
  return (
    <div className="flex h-full flex-col animate-in fade-in duration-300">
      <div className="glass-panel flex items-center gap-3 rounded-none border-x-0 border-t-0 px-5 py-2.5">
        <div className="h-8 w-32 animate-pulse rounded-lg bg-content2" />
        <div className="h-8 w-40 animate-pulse rounded-lg bg-content2" />
        <div className="ml-auto h-5 w-24 animate-pulse rounded bg-content2" />
      </div>
      <div className="flex-1 animate-pulse bg-content2/40" />
    </div>
  );
}

export function SidebarPageSkeleton() {
  return (
    <div className="flex h-full flex-col animate-in fade-in duration-300 md:flex-row">
      <div className="w-full space-y-3 border-b border-border/30 bg-content1 p-4 md:w-96 md:border-b-0 md:border-r">
        <div className="h-10 w-full animate-pulse rounded-lg bg-content2" />
        <div className="h-10 w-full animate-pulse rounded-lg bg-content2" />
        <div className="space-y-2 pt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5 rounded-xl border border-border/30 p-3">
              <div className="h-4 w-3/4 animate-pulse rounded bg-content2" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-content2" />
              <div className="h-2 w-full animate-pulse rounded-full bg-content2" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center bg-background text-muted-foreground/40">
        <div className="h-12 w-12 animate-pulse rounded-full bg-content2" />
      </div>
    </div>
  );
}

export function ContentPageSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6 animate-in fade-in duration-300">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-content2" />
      <div className="h-4 w-72 animate-pulse rounded bg-content2" />
      <div className="mt-6 space-y-3">
        <div className="h-64 w-full animate-pulse rounded-xl bg-content2" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-content2" />
          ))}
        </div>
      </div>
    </div>
  );
}
