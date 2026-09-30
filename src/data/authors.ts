import { ORGANIZATION_ID, SITE_NAME, SITE_URL } from '@/lib/seo';

/**
 * Blog author registry.
 *
 * AUTHORSHIP RULE — read before editing: only attribute a post to a named
 * person when that person genuinely wrote or technically reviewed it. None
 * of the current posts has documented individual authorship, so every post
 * is attributed to the engineering team as an organization-level author —
 * not assigned to a team member after the fact.
 *
 * To add a real named author: add an entry with `kind: 'person'`, their
 * actual role, a short factual bio and their real LinkedIn URL (never an
 * invented certification or credential), then set that post's `authorId`.
 * The blog byline and the BlogPosting `author` (a schema.org Person) pick
 * it up automatically.
 */
export type Author = {
  id: string;
  kind: 'team' | 'person';
  name: string;
  /** Job title, for person authors. */
  role?: string;
  bio: string;
  /** Real public profile (LinkedIn) — person authors only. */
  linkedin?: string;
};

export const AUTHORS = {
  'isha-engineering-team': {
    id: 'isha-engineering-team',
    kind: 'team',
    name: 'Isha Technologies Engineering Team',
    bio: 'The cloud and DevOps engineering team at Isha Technologies in Jaipur, India, working across cloud infrastructure, Kubernetes, CI/CD, infrastructure as code, security and reliability.',
  },
} satisfies Record<string, Author>;

export type AuthorId = keyof typeof AUTHORS;

export const DEFAULT_AUTHOR_ID: AuthorId = 'isha-engineering-team';

export function getAuthor(id: AuthorId): Author {
  return AUTHORS[id];
}

/** schema.org representation of an author for BlogPosting.author — a
 * Person only for a real, identified individual; otherwise the team as an
 * Organization that is part of Isha Technologies. */
export function authorJsonLd(author: Author): Record<string, unknown> {
  if (author.kind === 'person') {
    return {
      '@type': 'Person',
      name: author.name,
      ...(author.role ? { jobTitle: author.role } : {}),
      description: author.bio,
      ...(author.linkedin ? { sameAs: [author.linkedin] } : {}),
      worksFor: { '@id': ORGANIZATION_ID },
    };
  }
  return {
    '@type': 'Organization',
    name: author.name,
    description: author.bio,
    url: `${SITE_URL}/about`,
    parentOrganization: {
      '@type': 'Organization',
      '@id': ORGANIZATION_ID,
      name: SITE_NAME,
    },
  };
}
