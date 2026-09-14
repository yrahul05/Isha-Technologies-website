import type { Metadata } from 'next';
import { LegalHero } from '@/components/legal/LegalHero';
import { LegalLayout, type LegalSection } from '@/components/legal/LegalLayout';
import { LegalContent } from '@/components/legal/LegalContent';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = {
  ...buildMetadata({
    title: 'Terms & Conditions | Isha Technologies',
    description:
      'Review the Terms & Conditions governing use of the Isha Technologies website and its publicly available information and resources.',
    path: '/terms-and-conditions',
  }),
  robots: 'index, follow',
};

const sections: LegalSection[] = [
  { id: 'section-1', number: '1', title: 'About These Terms' },
  { id: 'section-2', number: '2', title: 'Website Use' },
  { id: 'section-3', number: '3', title: 'Services Information' },
  { id: 'section-4', number: '4', title: 'No Automatic Client Agreement' },
  { id: 'section-5', number: '5', title: 'Proposals & Estimates' },
  { id: 'section-6', number: '6', title: 'Third-Party Services' },
  { id: 'section-7', number: '7', title: 'Technical Content & Resources' },
  { id: 'section-8', number: '8', title: 'Case Studies & Demonstrations' },
  { id: 'section-9', number: '9', title: 'Intellectual Property' },
  { id: 'section-10', number: '10', title: 'User-Submitted Content' },
  { id: 'section-11', number: '11', title: 'Website Availability' },
  { id: 'section-12', number: '12', title: 'Warranties & Disclaimers' },
  { id: 'section-13', number: '13', title: 'Limitation of Liability' },
  { id: 'section-14', number: '14', title: 'Indemnification' },
  { id: 'section-15', number: '15', title: 'Links to Third-Party Websites' },
  { id: 'section-16', number: '16', title: 'Privacy' },
  { id: 'section-17', number: '17', title: 'Changes to These Terms' },
  { id: 'section-18', number: '18', title: 'Governing Law' },
  { id: 'section-19', number: '19', title: 'Severability' },
  { id: 'section-20', number: '20', title: 'Entire Agreement' },
  { id: 'section-21', number: '21', title: 'Contact' },
];

const content = `
<p>These Terms &amp; Conditions govern your use of the Isha Technologies website and provide the general terms applicable to enquiries, information, content and interactions made through the website.</p>

<div class="not-prose rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 mb-8">
  <p class="font-semibold text-gray-900 mb-1">Isha Technologies</p>
  <p>Jaipur, Rajasthan, India</p>
  <p>Email: <a href="mailto:hello.ishatechnologies@gmail.com" class="text-brand font-medium">hello.ishatechnologies@gmail.com</a></p>
  <p>Website: <a href="https://ishatechnologies.in" target="_blank" rel="noopener noreferrer" class="text-brand font-medium">https://ishatechnologies.in</a></p>
</div>

<h2 id="section-1" class="scroll-mt-28">1. About These Terms</h2>
<p>This website is operated by Isha Technologies, Jaipur, Rajasthan, India (<a href="mailto:hello.ishatechnologies@gmail.com">hello.ishatechnologies@gmail.com</a>, <a href="https://ishatechnologies.in" target="_blank" rel="noopener noreferrer">https://ishatechnologies.in</a>). By using this website, you agree to these Terms &amp; Conditions to the extent permitted by applicable law. If you do not agree, please discontinue use of the website.</p>

<h2 id="section-2" class="scroll-mt-28">2. Website Use</h2>
<p>Visitors may:</p>
<ul>
  <li>Browse the website</li>
  <li>Read the information made available</li>
  <li>Contact Isha Technologies</li>
  <li>Submit legitimate project enquiries</li>
  <li>Access publicly available resources</li>
</ul>
<p>Visitors must not:</p>
<ul>
  <li>Use the website for unlawful purposes</li>
  <li>Attempt unauthorized access to the website or its systems</li>
  <li>Introduce malware or malicious code</li>
  <li>Interfere with the operation of the website</li>
  <li>Scrape or systematically copy content without permission</li>
  <li>Misrepresent their identity</li>
  <li>Submit fraudulent or abusive enquiries</li>
  <li>Attempt to bypass security controls</li>
</ul>

<h2 id="section-3" class="scroll-mt-28">3. Services Information</h2>
<p>Website content describes Isha Technologies' areas of expertise and services, including Cloud Solutions, DevOps Solutions, Kubernetes, Cloud Migration, Managed Cloud, Cloud Cost Optimization, DevSecOps, Platform Solutions, Site Reliability and Observability. These descriptions are general information about our capabilities. Specific services, scope, timelines, deliverables, responsibilities and technical requirements are determined separately through an agreed proposal, statement of work, contract or other written agreement.</p>

<h2 id="section-4" class="scroll-mt-28">4. No Automatic Client Agreement</h2>
<p>Submitting a contact form, proposal request, WhatsApp message or email does not automatically create a client relationship, service agreement, employment relationship, partnership or other contractual commitment. A formal engagement begins only after the applicable commercial and contractual terms have been agreed in writing.</p>

<h2 id="section-5" class="scroll-mt-28">5. Proposals &amp; Estimates</h2>
<p>Any preliminary information we share is subject to review, and estimates provided at an early stage are not automatically binding. Final scope and pricing require confirmation once requirements are clear, and specific requirements may affect delivery timelines and costs. We do not promise fixed pricing or timelines unless formally agreed in a signed proposal or contract.</p>

<h2 id="section-6" class="scroll-mt-28">6. Third-Party Services</h2>
<p>Isha Technologies may work with, or recommend, technology platforms such as cloud providers, CI/CD tools, monitoring platforms, container technologies and other third-party services, including but not limited to AWS, Microsoft Azure, Google Cloud, Kubernetes, Docker, Terraform, GitHub, GitLab, Jenkins, Prometheus and Grafana. These products and services are governed by their own respective terms. Reference to a third-party technology does not imply an official partnership, certification or endorsement unless separately and explicitly confirmed.</p>

<h2 id="section-7" class="scroll-mt-28">7. Technical Content &amp; Resources</h2>
<p>Blogs, guides, architecture discussions, technical demonstrations and other resources on this website are provided for informational purposes. Technical recommendations should be evaluated against your own environment and requirements before being applied. General website content should not be treated as a guarantee of production suitability for any specific use case.</p>

<h2 id="section-8" class="scroll-mt-28">8. Case Studies &amp; Demonstrations</h2>
<p>Any technical demonstrations referenced on this website are illustrative unless explicitly identified as verified client engagements. We do not present internal demonstrations as client projects, and we do not fabricate outcomes or performance improvements.</p>

<h2 id="section-9" class="scroll-mt-28">9. Intellectual Property</h2>
<p>The website design, website content, original written materials, graphics, brand assets, logos and original technical materials are the property of Isha Technologies unless otherwise stated. Visitors may not reproduce, redistribute, modify or commercially exploit protected content without permission, except where permitted by applicable law. Third-party trademarks referenced on this website remain the property of their respective owners.</p>

<h2 id="section-10" class="scroll-mt-28">10. User-Submitted Content</h2>
<p>If you submit information through our forms or in communications with us, you confirm that you have the right to provide that information.</p>
<p class="not-prose rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900 mb-4">Never submit passwords, API keys, cloud credentials, private keys or other security secrets through public website forms.</p>
<p>You should not submit confidential information you are not authorized to disclose, credentials, passwords, API keys, private encryption keys, or sensitive production secrets through the website.</p>

<h2 id="section-11" class="scroll-mt-28">11. Website Availability</h2>
<p>Isha Technologies aims to keep the website available and functional but does not guarantee uninterrupted availability. Website functionality may be affected by maintenance, hosting issues, network failures, third-party services, security incidents, or circumstances beyond our reasonable control.</p>

<h2 id="section-12" class="scroll-mt-28">12. Warranties &amp; Disclaimers</h2>
<p>Website content is provided on an "as available" and informational basis, to the extent permitted by applicable law. We do not make guarantees regarding uptime, security, cost savings, performance, deployment speed, business outcomes, zero downtime, or any other specific technical result.</p>

<h2 id="section-13" class="scroll-mt-28">13. Limitation of Liability</h2>
<p>To the extent permitted by applicable law, Isha Technologies will not be responsible for indirect, incidental, consequential or special losses arising from use of this website. Nothing in these Terms is intended to exclude or limit liability that cannot lawfully be excluded or limited.</p>

<h2 id="section-14" class="scroll-mt-28">14. Indemnification</h2>
<p>To the extent permitted by applicable law, you agree to be responsible for losses reasonably arising from your unlawful use of the website or violation of these Terms.</p>

<h2 id="section-15" class="scroll-mt-28">15. Links to Third-Party Websites</h2>
<p>This website may contain links to third-party websites, provided for convenience. Isha Technologies does not control, and is not responsible for, the content or privacy practices of third-party websites.</p>

<h2 id="section-16" class="scroll-mt-28">16. Privacy</h2>
<p>Use of your personal information is governed by our Privacy Policy, which explains what we collect, how we use it, and the choices available to you.</p>
<p><a href="/privacy-policy" class="not-prose inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white no-underline hover:bg-brand/90">Read Privacy Policy →</a></p>

<h2 id="section-17" class="scroll-mt-28">17. Changes to These Terms</h2>
<p>We may update these Terms &amp; Conditions from time to time. The latest version will be published on this page, and continued use of the website after an update constitutes acceptance of the revised Terms.</p>

<h2 id="section-18" class="scroll-mt-28">18. Governing Law</h2>
<p>These Terms &amp; Conditions are governed by the laws applicable in India, subject to any mandatory legal provisions that apply. Where a dispute may be brought before courts of a specific location and applicable law permits the parties to agree on venue, the courts of Jaipur, Rajasthan, India are intended as the venue. This is not intended to override any mandatory jurisdiction requirement under applicable law.</p>

<h2 id="section-19" class="scroll-mt-28">19. Severability</h2>
<p>If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions will continue in full force and effect to the extent permitted by law.</p>

<h2 id="section-20" class="scroll-mt-28">20. Entire Agreement</h2>
<p>These website Terms govern general use of the Isha Technologies website. Specific client engagements are governed by their own separately agreed contractual documents, such as a proposal, statement of work or services agreement, which take precedence over these website Terms for that engagement.</p>

<h2 id="section-21" class="scroll-mt-28">21. Contact</h2>
<div class="not-prose rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 mb-6">
  <p class="font-semibold text-gray-900 mb-1">Isha Technologies</p>
  <p>Jaipur, Rajasthan, India</p>
  <p>Email: <a href="mailto:hello.ishatechnologies@gmail.com" class="text-brand font-medium">hello.ishatechnologies@gmail.com</a></p>
  <p>Phone / WhatsApp: <a href="tel:+919351267228" class="text-brand font-medium">+91 9351267228</a></p>
  <p>Website: <a href="https://ishatechnologies.in" target="_blank" rel="noopener noreferrer" class="text-brand font-medium">https://ishatechnologies.in</a></p>
</div>
`;

export default function Page() {
  return (
    <>
      <LegalHero
        eyebrow="Legal Information"
        title="Terms & Conditions"
        description="Terms governing access to and use of the Isha Technologies website."
        effectiveDate="14 September 2026"
        lastUpdated="14 September 2026"
      />
      <LegalLayout sections={sections}>
        <LegalContent content={content} />
      </LegalLayout>
    </>
  );
}
