import Image from 'next/image';

/** Strips honorifics (Mr./Mrs./Ms./Dr.) and returns up to two initials. */
function getInitials(name: string): string {
  const words = name.replace(/^(Mr|Mrs|Ms|Dr)\.?\s+/i, '').split(/\s+/).filter(Boolean);
  const initials = words.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '');
  return initials.join('') || name[0]?.toUpperCase() || '';
}

/**
 * Renders a genuine headshot when `image` is provided. Otherwise falls back
 * to a neutral initials placeholder — deliberately not a face — so it never
 * pretends to depict a real photograph of the person.
 */
export function TeamPortrait({ name, image }: { name: string; image?: string }) {
  if (image) {
    return (
      <div className="relative h-full w-full">
        <Image
          src={image}
          alt={name}
          fill
          sizes="128px"
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className="flex h-full w-full items-center justify-center bg-gradient-to-b from-gray-100 to-gray-50"
      aria-label={`${name} — photo not yet available`}
      role="img"
    >
      <span className="text-2xl font-semibold tracking-wide text-brand/60">
        {getInitials(name)}
      </span>
    </div>
  );
}
