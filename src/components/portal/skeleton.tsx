/**
 * Placeholder shown while a CRM page's queries run. Used by `loading.tsx` files, which Next streams the
 * moment a navigation starts. Only added to leaf pages that never answer 404/redirect themselves: a
 * `loading.tsx` makes the response start streaming (HTTP 200) before the page body runs, so pages whose
 * permission guard calls `notFound()` must NOT sit under one (they'd lose their real 404 status).
 */
export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="animate-pulse">
      <div className="mb-6 space-y-2">
        <div className="h-3 w-24 rounded bg-slate-200/80" />
        <div className="h-7 w-56 rounded bg-slate-200/80" />
        <div className="h-3 w-80 max-w-full rounded bg-slate-100" />
      </div>
      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="h-3 w-20 rounded bg-slate-100" />
            <div className="mt-4 h-6 w-28 rounded bg-slate-200/80" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 border-b border-gray-50 py-3 last:border-0">
            <div className="h-9 w-9 rounded-xl bg-slate-100" />
            <div className="h-3 flex-1 rounded bg-slate-100" />
            <div className="hidden h-3 w-24 rounded bg-slate-100 sm:block" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
