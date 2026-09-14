import { Flag } from 'lucide-react';
import { BsEmojiSmile, BsInstagram, BsMedium } from 'react-icons/bs';
import {
  FaChartLine,
  FaCloud,
  FaCogs,
  FaEnvelope,
  FaGithub,
  FaLightbulb,
  FaLinkedin,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaProjectDiagram,
  FaRoad,
  FaShieldAlt,
} from 'react-icons/fa';
import { SiUpwork } from 'react-icons/si';
import { GITHUB_URL, UPWORK_URL } from '@/data/contact';

// process of steps
export const steps = [
  {
    title: 'Discovery & Assessment',
    description:
      'We review your current cloud setup, delivery workflow and reliability gaps, then map out where infrastructure, automation and observability can be improved.',
    icon: <FaProjectDiagram />,
  },
  {
    title: 'Architecture & Roadmap',
    description:
      'We design the target architecture and a phased roadmap — covering networking, IAM, environments, pipelines and security — aligned to how your team works.',
    icon: <FaCloud />,
  },
  {
    title: 'Implementation & Automation',
    description:
      'We build it out with Infrastructure as Code, CI/CD pipelines, Kubernetes platforms, monitoring and security controls — with clear visibility as work progresses.',
    icon: <FaCogs />,
  },
  {
    title: 'Operations & Improvement',
    description:
      'We support ongoing operations, incident response and continuous improvement — tuning cost, reliability and performance as your platform evolves.',
    icon: <FaShieldAlt />,
  },
];

// services
export const services = [
  {
    title: 'Cloud Solutions',
    image: '/services/infrastructure-management.svg',
    link: '/services/cloud-solutions',
    description:
      'Cloud architecture and infrastructure across AWS, Azure and Google Cloud — networking, IAM, high availability, disaster recovery and security.',
  },
  {
    title: 'DevOps Solutions',
    image: '/services/ci-cd-cloud-deploy.svg',
    link: '/services/devops-solutions',
    description:
      'CI/CD, GitOps and Infrastructure as Code with Terraform and Ansible — automating the path from code to production.',
  },
  {
    title: 'Kubernetes',
    image: '/services/kubernetes-management.svg',
    link: '/services/kubernetes',
    description:
      'Production-ready Kubernetes platforms — cluster architecture, autoscaling, networking, monitoring, logging, security and cost optimization.',
  },
  {
    title: 'Cloud Migration',
    image: '/services/cloud-migration.svg',
    link: '/services/cloud-migration',
    description:
      'A structured migration strategy — assess, plan, design, migrate, validate and optimize across servers, databases and containers.',
  },
  {
    title: 'Managed Cloud',
    image: '/services/devops-management.svg',
    link: '/services/managed-cloud',
    description:
      'Reliable infrastructure operations — monitoring, incident support, maintenance, patching, backups, capacity planning and cost visibility.',
  },
  {
    title: 'Cloud Cost Optimization',
    image: '/services/cost-optimization.svg',
    link: '/services/cloud-cost-optimization',
    description:
      'Improve cloud efficiency without compromising performance — rightsizing, idle resource cleanup, storage, compute and Kubernetes cost analysis.',
  },
  {
    title: 'DevSecOps',
    image: '/services/security-management.svg',
    link: '/services/devsecops',
    description:
      'Security integrated into the delivery lifecycle — SAST, DAST, dependency and container scanning, secret detection and security gates.',
  },
  {
    title: 'Platform Solutions',
    image: '/services/ai-powered-devops.svg',
    link: '/services/platform-solutions',
    description:
      'Internal developer platforms and self-service infrastructure — golden paths, deployment templates and reusable infrastructure modules.',
  },
  {
    title: 'Site Reliability',
    image: '/cloud-load-balancing-svgrepo-com.svg',
    link: '/services/site-reliability',
    description:
      'Reliability designed into production systems — SLIs, SLOs, error budgets, incident management, capacity planning and disaster recovery.',
  },
  {
    title: 'Observability',
    image: '/cloud-audit-logs-svgrepo-com.svg',
    link: '/services/observability',
    description:
      'Turn infrastructure signals into operational visibility — metrics, logs, traces, dashboards and alerts with Prometheus, Grafana and CloudWatch.',
  },
];

// mission & vision
export const missionAndVision = [
  {
    title: 'Our Mission',
    icon: <Flag />,
    statement: 'Make infrastructure simpler to build, secure, operate and scale.',
    description:
      'We help technology teams create reliable cloud foundations through practical engineering, automation and operational discipline.',
  },
  {
    title: 'Our Vision',
    icon: <BsEmojiSmile />,
    statement: 'To be a trusted technology partner for modern infrastructure.',
    description:
      'We aim to build lasting partnerships through technical excellence, transparency and infrastructure that teams can confidently depend on.',
  },
];

// team members
// `image` is left unset until a genuine headshot is available for that
// person — the team card falls back to a neutral initials placeholder
// rather than a fabricated or stock photo. Drop a real photo into
// `public/team/` and set e.g. image: '/team/rahul.jpg' to switch it on.
/** @type {import('@/types/types').PROFILE[]} */
export const teamMembers = [
  {
    name: 'Mr. Rahul',
    role: 'Founder / CTO',
    image: '',
    para: '',
    linkedin: 'https://www.linkedin.com/in/rahulyadavdevops/',
    github: '#',
    certificates: [],
  },
  {
    name: 'Mrs. Anita',
    role: 'Co-Founder & CEO',
    image: '',
    para: '',
    linkedin: '#',
    github: '#',
    certificates: [],
  },
  {
    name: 'Mr. Mahesh',
    role: 'Project Lead / Technical Head',
    image: '',
    para: '',
    linkedin: 'https://www.linkedin.com/in/yadavmahesh/',
    github: '#',
    certificates: [],
  },
  {
    name: 'Mr. Banti',
    role: 'COO',
    image: '',
    para: '',
    linkedin: '#',
    github: '#',
    certificates: [],
  },
  {
    name: 'Mr. Chetan',
    role: 'DevOps Lead',
    image: '',
    para: '',
    linkedin: '#',
    github: '#',
    certificates: [],
  },
  {
    name: 'Mr. Manoj',
    role: 'Senior DevOps Professional',
    image: '',
    para: '',
    linkedin: 'https://www.linkedin.com/in/manoj-kumawat-393079230/',
    github: '#',
    certificates: [],
  },
  {
    name: 'Mr. Suresh',
    role: 'Senior DevOps Professional',
    image: '',
    para: '',
    linkedin: 'https://www.linkedin.com/in/sureshyadav76/',
    github: '#',
    certificates: [],
  },
  {
    name: 'Mr. Krishan',
    role: 'DevOps Professional',
    image: '',
    para: '',
    linkedin: '#',
    github: '#',
    certificates: [],
  },
  {
    name: 'Mr. Abhay Sharma',
    role: 'DevOps Professional',
    image: '',
    para: '',
    linkedin: 'https://linkedin.com/in/abhi-sharma-888a93207/',
    github: '#',
    certificates: [],
  },
  {
    name: 'Mr. Prashant',
    role: 'Senior DevOps Professional',
    image: '',
    para: '',
    linkedin: 'https://www.linkedin.com/in/theprashantyadav/',
    github: '#',
    certificates: [],
  },
];

// footer — company links
export const companyLinks = [
  { label: 'About', href: '/about' },
  { label: 'Case Studies', href: '/case-studies' },
  { label: 'Contact', href: '/contact' },
];

// footer — solutions links (derived from services)
export const solutionLinks = services.map((service) => ({
  label: service.title,
  href: service.link,
}));

// footer — resources links
export const resourceLinks = [
  { label: 'Blogs', href: '/resources/blogs' },
  { label: 'Our Journey', href: '/our-journey' },
];

// social links — verified Isha Technologies profile URLs. GitHub and
// Upwork read from src/data/contact.ts.
export const socialLinks = [
  {
    title: 'LinkedIn',
    href: 'https://www.linkedin.com/company/isha-technologies-official',
    icon: <FaLinkedin className="text-xl" />,
  },
  {
    title: 'Instagram',
    href: 'https://www.instagram.com/isha_technologies_official/',
    icon: <BsInstagram className="text-xl" />,
  },
  {
    title: 'Medium',
    href: 'https://medium.com/@ishatechnologies',
    icon: <BsMedium className="text-xl" />,
  },
  {
    title: 'GitHub',
    href: GITHUB_URL,
    icon: <FaGithub className="text-xl" />,
  },
  {
    title: 'Upwork',
    href: UPWORK_URL,
    icon: <SiUpwork className="text-xl" />,
  },
];

// contact page data: contact data
export const contactData = [
  {
    type: 'phone',
    href: 'tel:+919783959837',
    label: '+91 9783959837',
    icon: <FaPhoneAlt className="text-brand" />,
  },
  {
    type: 'email',
    href: 'mailto:hello.ishatechnologies@gmail.com',
    label: 'hello.ishatechnologies@gmail.com',
    icon: <FaEnvelope className="text-brand" />,
  },
];

// journey stages — the human, origin-story cards on the "Our Focus" section
// of the Our Journey page. Content only; no invented history, funding,
// offices or achievements beyond what's verified (founded 2026, Jaipur).
export const ourStoryStages = [
  {
    icon: <FaLightbulb />,
    title: 'The Beginning',
    desc: 'Every technology journey starts with a vision. Ours began with the ambition to build something meaningful through engineering, learning and consistent effort.',
  },
  {
    icon: <FaRoad />,
    title: 'From Village to Technology',
    desc: 'Coming from a humble background, we believe strong technology is built through skills, discipline and the willingness to keep learning and improving.',
  },
  {
    icon: <FaMapMarkerAlt />,
    title: 'Built in Jaipur',
    desc: 'Founded in 2026, Isha Technologies is based in Jaipur, Rajasthan, building a technology company focused on cloud infrastructure, DevOps and modern engineering.',
  },
  {
    icon: <FaChartLine />,
    title: 'Building What Comes Next',
    desc: 'Our journey is now focused on building reliable cloud platforms, automation and infrastructure solutions that help technology teams operate and scale with confidence.',
  },
];

// testimonials
// Client-supplied attribution and review copy, published with permission.
// Only add entries with the client's real name + company; do not add ratings,
// logos, photos, locations or measurable results that were not provided.
export const testimonials = [
  {
    quote:
      'Professional team with a practical approach to cloud and infrastructure.',
    name: 'Subhash Swarnkar',
    designation: 'CEO & Founder',
    company: 'Thetrifusion',
  },
  {
    quote:
      'Technically strong team with a clear and reliable approach to infrastructure.',
    name: 'Sohan Lal',
    designation: 'CEO & Founder',
    company: 'OpsStation',
  },
  {
    quote:
      'Strong expertise in cloud, automation and modern DevOps solutions.',
    name: 'Navneet Bishnoi',
    designation: 'Director',
    company: 'PlugOne',
  },
  {
    quote:
      'A reliable technical team with a strong focus on automation and security.',
    name: 'Shashi Rani',
    designation: 'Co-Founder',
    company: 'Shanav Technologies',
  },
];
