type Section = {
  heading: string;
  paragraphs?: string[];
  list?: string[];
  subHeading?: string;
  subList?: string[];
};

export type Post = {
  version: string;
  title: string;
  date: string;
  readTime: string;
  author: string;
  content?: string;
  sections?: Section[];
  slug: string;
};

// Define Job type
export type Job = {
  id: number;
  title: string;
  category: string;
  location: string;
  description: string;
};

export type PROFILE = {
  name: string;
  role: string;
  /**
   * Path to a genuine headshot photograph (e.g. '/team/rahul.jpg').
   * Leave unset until a real photo is available — the team card falls
   * back to a neutral initials placeholder rather than a fabricated photo.
   */
  image?: string;
  para?: string;
  linkedin: string;
  github: string;
  certificates?: { image: string; title: string }[];
};

/** Contact page enquiry form values. See `@/data/contact` for the option lists. */
export type ContactFormValues = {
  fullName: string;
  company?: string;
  email: string;
  phone?: string;
  service: string;
  platform?: string;
  timeline?: string;
  message: string;
  /** Honeypot — must stay empty. Hidden from real users via CSS, not `type="hidden"`, so bots that skip hidden inputs still fill it. */
  website?: string;
};

// ---------------------------------------------------------------------
// Service pages — shared, data-driven types. One `Service` record drives
// every section of a service page through the reusable components in
// `@/components/services`.
// ---------------------------------------------------------------------

import type { IconName } from '@/data/icon-map';

export type ServiceCapability = {
  title: string;
  description: string;
  icon: IconName;
};

export type ServiceProcessStep = {
  title: string;
  description: string;
};

export type ServiceValuePoint = {
  title: string;
  description: string;
};

export type ServiceTechGroup = {
  group: string;
  items: string[];
};

export type ServiceArchitectureNode = {
  label: string;
  icon: IconName;
};

/** A concrete client-facing problem this service addresses — not a
 * generic pain point copied across services. */
export type ServiceProblem = {
  title: string;
  description: string;
  icon: IconName;
};

export type ServiceFaq = {
  question: string;
  answer: string;
};

/** The four groupings used in the services navigation, the Explore All
 * Services page, and each service page's breadcrumb trail. */
export type ServiceCategory =
  | 'Cloud & Infrastructure'
  | 'DevOps & Platform'
  | 'Cloud-Native'
  | 'AI & Security';

export type Service = {
  /** Route segment, e.g. "cloud-solutions" */
  slug: string;
  /** Short display name used in nav, footer, related-services and prev/next */
  title: string;
  category: ServiceCategory;
  eyebrow: string;
  heading: string;
  description: string;
  overview: {
    heading: string;
    paragraphs: string[];
  };
  /** Specific problems/business challenges this service addresses. */
  problems: ServiceProblem[];
  capabilities: ServiceCapability[];
  technologies: ServiceTechGroup[];
  process: ServiceProcessStep[];
  architecture: ServiceArchitectureNode[];
  /** Where this service is genuinely useful — short, specific phrases,
   * not full sentences (rendered as a checklist). */
  useCases: string[];
  businessValue: ServiceValuePoint[];
  faqs: ServiceFaq[];
  cta: {
    heading: string;
  };
  relatedServices: string[];
  /**
   * Cloud/hosting platforms we have hands-on experience with for this
   * specific service — NOT formal partnerships. Only set where genuinely
   * relevant; omitted entirely for services where platform experience
   * isn't a natural fit (e.g. security-review-style engagements).
   */
  platforms?: string[];
  seo: {
    title: string;
    description: string;
  };
};
