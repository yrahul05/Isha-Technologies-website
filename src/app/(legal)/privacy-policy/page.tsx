import type { Metadata } from 'next';
import { LegalHero } from '@/components/legal/LegalHero';
import { LegalLayout, type LegalSection } from '@/components/legal/LegalLayout';
import { LegalContent } from '@/components/legal/LegalContent';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = {
  ...buildMetadata({
    title: 'Privacy Policy | Isha Technologies',
    description:
      "Read the Isha Technologies Privacy Policy to understand how information submitted through our website is collected, used, protected and handled.",
    path: '/privacy-policy',
  }),
  robots: 'index, follow',
};

const sections: LegalSection[] = [
  { id: 'section-1', number: '1', title: 'Information We Collect' },
  { id: 'section-2', number: '2', title: 'How We Use Information' },
  { id: 'section-3', number: '3', title: 'Contact Form Information' },
  { id: 'section-4', number: '4', title: 'Email Communication' },
  { id: 'section-5', number: '5', title: 'WhatsApp' },
  { id: 'section-6', number: '6', title: 'Cookies & Similar Technologies' },
  { id: 'section-7', number: '7', title: 'Google Analytics' },
  { id: 'section-8', number: '8', title: 'How We Share Information' },
  { id: 'section-9', number: '9', title: 'Data Retention' },
  { id: 'section-10', number: '10', title: 'Data Security' },
  { id: 'section-11', number: '11', title: 'Your Privacy Rights' },
  { id: 'section-12', number: '12', title: "Children's Privacy" },
  { id: 'section-13', number: '13', title: 'Third-Party Websites' },
  { id: 'section-14', number: '14', title: 'International Data Processing' },
  { id: 'section-15', number: '15', title: 'Changes to This Privacy Policy' },
  { id: 'section-16', number: '16', title: 'Contact Us' },
];

const content = `
<p>At <strong>Isha Technologies</strong>, we respect your privacy and are committed to handling personal information responsibly. This Privacy Policy explains what information we collect through our website, why we collect it, how we use it, how it may be shared, and the choices available to you.</p>

<div class="not-prose rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 mb-8">
  <p class="font-semibold text-gray-900 mb-1">Isha Technologies</p>
  <p>Jaipur, Rajasthan, India</p>
  <p>Email: <a href="mailto:hello.ishatechnologies@gmail.com" class="text-brand font-medium">hello.ishatechnologies@gmail.com</a></p>
  <p>Website: <a href="https://ishatechnologies.in" target="_blank" rel="noopener noreferrer" class="text-brand font-medium">https://ishatechnologies.in</a></p>
</div>

<h2 id="section-1" class="scroll-mt-28">1. Information We Collect</h2>
<p>We collect information in a few limited ways, depending on how you interact with our website.</p>

<h3>A. Contact and enquiry information</h3>
<p>When you submit a form or otherwise reach out to us, you may voluntarily provide:</p>
<ul>
  <li>Full name</li>
  <li>Company name</li>
  <li>Work email address</li>
  <li>Phone number</li>
  <li>Service requested</li>
  <li>Project requirements and timeline</li>
  <li>Cloud or platform information relevant to your enquiry</li>
  <li>Any message or other information you choose to include in a form</li>
</ul>

<h3>B. Technical information</h3>
<p>Like most websites, our hosting and security infrastructure may automatically process limited technical information when you visit, such as:</p>
<ul>
  <li>IP address</li>
  <li>Browser type</li>
  <li>Device type</li>
  <li>Operating system</li>
  <li>Pages visited</li>
  <li>Referring page</li>
  <li>Approximate usage and activity information</li>
  <li>Date and time of access</li>
</ul>
<p>We do not claim to collect any information beyond what is described in this Policy.</p>

<h3>C. Analytics</h3>
<p>Our website uses Google Analytics 4 to help us understand website usage, traffic and performance. Analytics may involve cookies or similar technologies placed in your browser. See <a href="#section-7">Section 7 — Google Analytics</a> for details.</p>

<h2 id="section-2" class="scroll-mt-28">2. How We Use Information</h2>
<p>Information submitted or collected through the website may be used to:</p>
<ul>
  <li>Respond to enquiries</li>
  <li>Understand project requirements</li>
  <li>Communicate about requested services</li>
  <li>Prepare proposals or discuss potential engagements</li>
  <li>Schedule technical conversations</li>
  <li>Provide information you have requested</li>
  <li>Improve website content and user experience</li>
  <li>Understand website traffic and performance</li>
  <li>Prevent spam, abuse or fraudulent activity</li>
  <li>Maintain website security</li>
  <li>Meet applicable legal or contractual requirements</li>
</ul>

<h2 id="section-3" class="scroll-mt-28">3. Contact Form Information</h2>
<p>When a visitor submits a contact or enquiry form, the information provided is used to respond to the enquiry and understand the requested requirements. Contact information may be accessible to authorized members of Isha Technologies who need it for business communication and enquiry handling. We do not claim that form submissions are automatically stored forever — information is kept only as described in <a href="#section-9">Section 9 — Data Retention</a>.</p>

<h2 id="section-4" class="scroll-mt-28">4. Email Communication</h2>
<p>You may contact Isha Technologies directly at <a href="mailto:hello.ishatechnologies@gmail.com">hello.ishatechnologies@gmail.com</a>. Information you send by email may be retained as reasonably necessary to respond to your enquiry, maintain business communication, document a potential or active engagement, or comply with applicable obligations.</p>

<h2 id="section-5" class="scroll-mt-28">5. WhatsApp</h2>
<p>Our website provides a WhatsApp contact option for convenience. When you choose to contact us through WhatsApp, that conversation takes place on WhatsApp's platform and is subject to WhatsApp's own privacy practices and terms. Isha Technologies does not control how WhatsApp processes data on its platform.</p>

<h2 id="section-6" class="scroll-mt-28">6. Cookies &amp; Similar Technologies</h2>
<p>Cookies are small text files placed in your browser by a website you visit. Websites use them to remember preferences, support essential functionality, and understand how visitors use a site. On our website, cookies or similar technologies may be used for:</p>
<ul>
  <li>Essential website functionality</li>
  <li>Analytics, as described in <a href="#section-7">Section 7</a></li>
</ul>
<p>You can control or disable cookies through your browser settings at any time. Disabling cookies may affect certain website features. We do not operate a separate cookie-consent system beyond your browser's own controls.</p>

<h2 id="section-7" class="scroll-mt-28">7. Google Analytics</h2>
<p>We use Google Analytics 4 to help us understand:</p>
<ul>
  <li>Website traffic</li>
  <li>Popular pages</li>
  <li>General user interaction</li>
  <li>Website performance</li>
  <li>Aggregate usage trends</li>
</ul>
<p>Google Analytics may use cookies or similar technologies to generate this information. We do not use Google Analytics to sell your data, and we do not claim it collects specific personal information beyond what Google's platform is configured to process. For more information on how Google handles data, see <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google's Privacy &amp; Terms</a>.</p>

<h2 id="section-8" class="scroll-mt-28">8. How We Share Information</h2>
<p>Isha Technologies does not sell personal information as a business practice. Information may be shared only when reasonably necessary, with:</p>
<ul>
  <li>Service providers supporting website hosting, analytics, email, communications or security</li>
  <li>Professional advisers, where appropriate</li>
  <li>Authorities or other parties when required by applicable law</li>
  <li>Relevant parties in connection with a business transaction, where legally appropriate</li>
</ul>

<h2 id="section-9" class="scroll-mt-28">9. Data Retention</h2>
<p>Information is retained only for as long as reasonably necessary for the purpose it was collected — including responding to enquiries, business communication, contractual or legal requirements, and legitimate security or operational purposes. We do not commit to a fixed retention period, as this depends on the nature of the information and the purpose it serves.</p>

<h2 id="section-10" class="scroll-mt-28">10. Data Security</h2>
<p>We use reasonable technical and organizational measures to help protect information, including access control, secure application practices, protection against unauthorized access, and secure handling of credentials and system access. However, <strong>no method of transmission or storage can be guaranteed to be completely secure</strong>, and we cannot promise absolute security.</p>

<h2 id="section-11" class="scroll-mt-28">11. Your Privacy Rights</h2>
<p>Depending on applicable law, you may have rights relating to your personal information, including the right to:</p>
<ul>
  <li>Access the personal information we hold about you</li>
  <li>Correct inaccurate information</li>
  <li>Withdraw consent, where applicable</li>
  <li>Request deletion, where applicable</li>
  <li>Raise a privacy-related concern or complaint</li>
</ul>
<p>To exercise any of these rights, contact us at <a href="mailto:hello.ishatechnologies@gmail.com">hello.ishatechnologies@gmail.com</a>. We will respond consistent with applicable law — we do not promise rights beyond what the relevant law provides.</p>

<h2 id="section-12" class="scroll-mt-28">12. Children's Privacy</h2>
<p>Our website is intended for business and professional audiences and is not directed toward children. We do not knowingly solicit personal information from children through the website.</p>

<h2 id="section-13" class="scroll-mt-28">13. Third-Party Websites</h2>
<p>Our website may link to third-party services, including WhatsApp, LinkedIn, Instagram, X, Google Maps and Google Analytics. Isha Technologies does not control the privacy practices of these third parties. We encourage you to review the privacy policy of any third-party service before using it.</p>

<h2 id="section-14" class="scroll-mt-28">14. International Data Processing</h2>
<p>Some of the technology and service providers used to operate our website — such as hosting, analytics or communication tools — may process information on servers located outside India. We do not claim specific storage locations beyond what our providers publicly disclose in their own documentation.</p>

<h2 id="section-15" class="scroll-mt-28">15. Changes to This Privacy Policy</h2>
<p>We may update this Privacy Policy from time to time to reflect changes in our practices or for legal or operational reasons. Any update will be published on this page with a revised "Last Updated" date. This Privacy Policy should be read together with our <a href="/terms-and-conditions">Terms &amp; Conditions</a>.</p>

<h2 id="section-16" class="scroll-mt-28">16. Contact Us</h2>
<p>If you have questions about this Privacy Policy or how your information is handled, please reach out:</p>
<div class="not-prose rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 mb-6">
  <p class="font-semibold text-gray-900 mb-1">Isha Technologies</p>
  <p>Jaipur, Rajasthan, India</p>
  <p>Email: <a href="mailto:hello.ishatechnologies@gmail.com" class="text-brand font-medium">hello.ishatechnologies@gmail.com</a></p>
  <p>Phone / WhatsApp: <a href="tel:+919783959837" class="text-brand font-medium">+91 9783959837</a></p>
  <p>Website: <a href="https://ishatechnologies.in" target="_blank" rel="noopener noreferrer" class="text-brand font-medium">https://ishatechnologies.in</a></p>
</div>
<p><a href="mailto:hello.ishatechnologies@gmail.com" class="not-prose inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white no-underline hover:bg-brand/90">Contact Privacy Team</a></p>
`;

export default function Page() {
  return (
    <>
      <LegalHero
        eyebrow="Legal & Privacy"
        title="Privacy Policy"
        description="At Isha Technologies, we respect your privacy and are committed to handling personal information responsibly."
        effectiveDate="14 September 2026"
        lastUpdated="14 September 2026"
      />
      <LegalLayout sections={sections}>
        <LegalContent content={content} />
      </LegalLayout>
    </>
  );
}
