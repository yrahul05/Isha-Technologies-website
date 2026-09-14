// Isha Technologies verified brand/contact details. Do not replace with
// OpsStation or any other company's information — see CLAUDE brief for
// this migration's credibility rules.
export const CONTACT_EMAIL_ADDRESS = 'hello.ishatechnologies@gmail.com';
export const CONTACT_PHONE_DISPLAY = '+91 9351267228';
export const CONTACT_PHONE_TEL = '+919351267228';
export const CONTACT_LOCATION = 'Jaipur, Rajasthan, India';
export const CONTACT_WEBSITE_DISPLAY = 'ishatechnologies.in';
export const CONTACT_WEBSITE_URL = 'https://ishatechnologies.in';

export const WHATSAPP_NUMBER = '919351267228';

/**
 * Public Calendly scheduling link for the "Schedule a Meeting" CTA, used
 * alongside WhatsApp, Signal, email and phone as an additional,
 * independent contact option. This is a public link, not a secret, so it
 * is a plain constant rather than an environment variable. Do not modify —
 * use exactly as provided.
 */
export const CALENDLY_URL = 'https://calendly.com/ishatechnologies';

/**
 * Pre-filled enquiry greeting — kept identical to the floating WhatsApp
 * button's message (src/components/layout/WhatsAppButton.tsx) so every
 * WhatsApp entry point on the site opens the same conversation starter.
 */
const WHATSAPP_MESSAGE = `Hello Isha Technologies 👋

I’d like to discuss my cloud, DevOps or infrastructure requirements with your team.

Please let me know how we can get started.

Thank you!`;

/** Hero / quick-contact CTA with the pre-filled enquiry message above. */
export const WHATSAPP_URL_PREFILLED = `https://wa.me/919351267228?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
/** Plain link used from the success/error form states and quick contact cards. */
export const WHATSAPP_URL_PLAIN = 'https://wa.me/919351267228';

export const GOOGLE_MAPS_URL = 'https://maps.app.goo.gl/5FKZubx7zrYGpSEt9';

/**
 * Public Signal contact link (a signal.me profile URL) for the "Contact
 * Us on Signal" option, shown alongside WhatsApp. This is a public link,
 * not a secret, so it is a plain constant rather than an environment
 * variable. Do not modify — use exactly as provided.
 */
export const SIGNAL_URL =
  'https://signal.me/#eu/O_kLyzGyVfdcVckYkPPz2aYtx9J0BdqsRnBEHrAL-QOMIWIA-bVO_on-THKcDamB';

/**
 * Public GitHub organization URL for the social icon row. This is a
 * public link, not a secret, so it is a plain constant rather than an
 * environment variable. Do not modify — use exactly as provided.
 */
export const GITHUB_URL = 'https://github.com/IshaTechnologies';

/**
 * Public Upwork profile URL for the social icon row. This is a public
 * link, not a secret, so it is a plain constant rather than an
 * environment variable. Do not modify — use exactly as provided.
 */
export const UPWORK_URL = 'https://www.upwork.com/freelancers/~0183ad8a41e8284283?mp_source=share';

/** Compact "what we help with" checklist shown next to the contact intro copy. */
export const contactIntroServices = [
  'Cloud Infrastructure',
  'DevOps & CI/CD',
  'Kubernetes',
  'Cloud Migration',
  'Managed Cloud Operations',
  'Cloud Cost Optimization',
  'DevSecOps',
  'Platform Engineering',
  'Site Reliability',
  'Observability',
] as const;

/** "Service Required" dropdown options on the enquiry form. */
export const contactServiceOptions = [
  'Cloud Infrastructure',
  'DevOps & CI/CD',
  'Kubernetes',
  'Cloud Migration',
  'Managed Cloud',
  'Cloud Cost Optimization',
  'DevSecOps',
  'Platform Solutions',
  'Site Reliability',
  'Observability',
  'Other',
] as const;

/** "Current Cloud Platform" dropdown options on the enquiry form. */
export const contactPlatformOptions = [
  'AWS',
  'Microsoft Azure',
  'Google Cloud',
  'On-Premises',
  'Multi-Cloud',
  'Not Sure Yet',
] as const;

/** "Project Timeline" dropdown options on the enquiry form. */
export const contactTimelineOptions = [
  'Immediate',
  'Within 1 Month',
  '1–3 Months',
  '3–6 Months',
  'Planning / Exploring',
] as const;

