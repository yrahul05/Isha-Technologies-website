/**
 * Server-rendered JSON-LD `<script>` tag. `<` is escaped so no string value
 * inside the data (an FAQ answer, an article headline) can ever close the
 * script element early.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  );
}
