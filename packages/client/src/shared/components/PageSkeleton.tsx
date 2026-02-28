export function MapPageSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border/50 bg-background/80 px-5 py-2.5 backdrop-blur-sm">
        <div className="h-8 w-32 animate-pulse rounded-md bg-muted" />
        <div className="h-8 w-40 animate-pulse rounded-md bg-muted" />
        <div className="ml-auto h-5 w-24 animate-pulse rounded bg-muted" />
      </div>
      <div className="flex-1 animate-pulse bg-muted/40" />
    </div>
  );
}

export function SidebarPageSkeleton() {
  return (
    <div className="flex h-full">
      <div className="w-96 space-y-3 border-r p-4">
        <div className="h-10 w-full animate-pulse rounded-lg bg-muted" />
        <div className="h-10 w-full animate-pulse rounded-lg bg-muted" />
        <div className="space-y-2 pt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5 rounded-xl border p-3">
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
              <div className="h-2 w-full animate-pulse rounded-full bg-muted" />
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center text-muted-foreground/40">
        <div className="h-12 w-12 animate-pulse rounded-full bg-muted" />
      </div>
    </div>
  );
}

export function ContentPageSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
      <div className="h-4 w-72 animate-pulse rounded bg-muted" />
      <div className="mt-6 space-y-3">
        <div className="h-64 w-full animate-pulse rounded-xl bg-muted" />
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}
