import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { JsonLd } from '@/components/JsonLd';
import { absoluteUrl } from '@/lib/seo';

export type Crumb = { label: string; href: string };

/**
 * Renders a crawlable breadcrumb trail plus matching BreadcrumbList
 * JSON-LD from the same `items`, so the visible trail and the schema can
 * never disagree. `items` should include every level down to (and
 * including) the current page — the current page's own entry gets no link,
 * just text. Every href must be a real, indexable page (no #fragments).
 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      item: absoluteUrl(item.href),
    })),
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <span key={item.href} className="flex items-center gap-1.5">
              {index > 0 && <ChevronRight className="h-3 w-3 shrink-0" aria-hidden="true" />}
              {isLast ? (
                <span className="font-medium text-gray-700" aria-current="page">
                  {item.label}
                </span>
              ) : (
                <Link href={item.href} className="transition-colors hover:text-brand">
                  {item.label}
                </Link>
              )}
            </span>
          );
        })}
      </nav>
    </>
  );
}
