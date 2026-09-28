import type { ReactNode } from 'react';

/** Styled wrapper for any table in a post's content (horizontal scroll on
 * mobile instead of page overflow) — used by BlogContent's `table` element
 * override, so any post whose content includes a real HTML table picks
 * this up automatically. */
export function ComparisonTable({ children }: { children: ReactNode }) {
  return (
    <div className="not-prose my-6 overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  );
}
