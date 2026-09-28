import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

const SITE_URL = 'https://www.ishatechnologies.in';

export type Crumb = { label: string; href: string };

/**
 * Renders a crawlable breadcrumb trail plus matching BreadcrumbList
 * JSON-LD. `items` should include every level down to (and including) the
 * current page — the current page's own entry gets no link, just text.
 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      item: `${SITE_URL}${item.href}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
