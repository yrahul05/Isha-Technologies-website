'use client';

import AOS from 'aos';
import 'aos/dist/aos.css';

import { Button } from './ui/button';
import Image from 'next/image';
import Link from 'next/link';
import SectionHeader from './layout/SectionHeader';
import { ServicesSlider } from './card/services-slider';
import { HeroEcosystemVisual } from './visuals/HeroEcosystemVisual';
import { useEffect } from 'react';
import { ProcessOfSteps } from './card/process-of-steps';
import { TechMarquee } from './card/tech-marquee';
import { PartnerNetwork } from './card/partner-network';
import { Testimonials } from './card/testimonials';
import { CTABanner } from './cta-banner';
import {
  CheckCircle,
  ArrowRight,
  Brain,
  Zap,
  TrendingUp,
  Bot,
} from 'lucide-react';

export function HomePage() {
  useEffect(() => {
    AOS.init({
      duration: 1000,
      once: true,
    });
  }, []);

  return (
    <>
      {/* hero */}
      <section className="bg-white py-12 md:py-20">
        <div className="px-4 max-w-[1280px] mx-auto grid lg:grid-cols-2 grid-cols-1 gap-8">
          {/* Left Side Content — rendered visible immediately (no AOS
              fade-in): the H1 is the page's LCP element, and AOS keeps
              elements at opacity:0 until its script has loaded and run.
              A CSS entrance starts at first paint instead. */}
          <div className="flex flex-col items-start gap-5 motion-safe:animate-hero-rise">
            <div>
              <span className="inline-block text-xs font-semibold uppercase tracking-widest text-brand border border-brand/30 bg-brand/5 px-3 py-1 rounded-full mb-3">
                Cloud Infrastructure &amp; DevOps Solutions
              </span>
              <h1 className="font-bold text-3xl lg:text-5xl tracking-tighter text-black leading-tight">
                Cloud &amp; DevOps Infrastructure Engineering —{' '}
                <span className="text-brand">Without Building It All In-House</span>
              </h1>
            </div>

            <p className="text-base text-gray-600 leading-relaxed">
              Isha Technologies is a cloud and DevOps engineering team based in
              Jaipur, India. We build and manage the cloud foundations behind
              modern applications — from infrastructure and automation to
              Kubernetes, security and reliable operations.
            </p>

            {/* Static capabilities */}
            <div className="grid grid-cols-2 gap-2 w-full">
              {[
                'Cloud architecture & migration',
                'CI/CD & infrastructure automation',
                'Kubernetes & platform engineering',
                'Security, reliability & observability',
              ].map((benefit, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle
                    className="text-brand flex-shrink-0 mt-0.5"
                    size={16}
                  />
                  <span className="text-sm text-gray-700">{benefit}</span>
                </div>
              ))}
            </div>

            {/* Dual CTAs */}
            <div className="flex flex-wrap gap-3">
              <Button
                asChild
                variant="primary"
                className="h-11 rounded-lg px-6 font-semibold"
              >
                <Link href="/contact">Talk to an Expert</Link>
              </Button>
              <Button
                asChild
                variant="secondary"
                className="h-11 rounded-lg px-6 font-semibold"
              >
                <Link href="/services">
                  Explore Services <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>

            {/* Cloud platforms — hands-on platform experience, not a claim of
                any formal partner-program status (none is verified). */}
            <div className="w-full pt-3 border-t border-gray-100">
              <p className="text-xs font-semibold uppercase tracking-widest text-brand mb-3">
                Cloud Platforms We Work With
              </p>
              <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
                <Image
                  src="/brand-partners/aws-partner-logo.webp"
                  alt="Amazon Web Services (AWS)"
                  width={160}
                  height={72}
                  sizes="(min-width: 768px) 98px, 80px"
                  className="h-9 w-auto object-contain sm:h-10 md:h-11"
                />
                <Image
                  src="/brand-partners/azure-logo.svg"
                  alt="Microsoft Azure"
                  width={160}
                  height={46}
                  sizes="(min-width: 768px) 153px, 125px"
                  className="h-9 w-auto object-contain sm:h-10 md:h-11"
                />
                <Image
                  src="/brand-partners/Google-cloud-logo.jpg"
                  alt="Google Cloud"
                  width={160}
                  height={72}
                  sizes="(min-width: 768px) 98px, 80px"
                  className="h-9 w-auto object-contain sm:h-10 md:h-11"
                />
              </div>
              <p className="text-xs text-gray-500 font-medium mt-3">
                Cloud infrastructure engineered for reliable, scalable and secure
                platforms.
              </p>
            </div>
          </div>

          {/* Right Side Image */}
          <div
            data-aos="zoom-in"
            data-aos-delay="400"
            className="relative rounded-4xl flex items-center justify-center overflow-hidden md:p-0 p-4"
          >
            <div className="absolute top-0 rotate-12 left-12 bg-brand/10 h-48 w-48 rounded-full" />
            <div className="absolute bottom-0 rotate-12 right-12 bg-brand/5 h-48 w-48 rounded-full" />
            <HeroEcosystemVisual />
          </div>
        </div>
      </section>

      {/* challenges */}
      <section className="py-14 bg-gray-50">
        <div className="max-w-[1280px] mx-auto px-4">
          <SectionHeader
            badge="The Infrastructure Reality"
            title="Complexity Grows. Your Infrastructure Shouldn't."
            description="Modern platforms demand more from infrastructure — faster delivery, stronger security, predictable costs and reliable production operations."
            alignment="center"
          />
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: 'Deployment Friction',
                desc: 'Manual steps, inconsistent pipelines and unclear rollback paths make every release slow and risky.',
              },
              {
                title: 'Infrastructure Complexity',
                desc: 'Environments drift, ownership blurs and infrastructure grows faster than the standards around it.',
              },
              {
                title: 'Cloud Cost Control',
                desc: 'Over-provisioned resources and idle environments inflate the bill with little visibility into why.',
              },
              {
                title: 'Kubernetes Operations',
                desc: 'Clusters are easy to start and hard to run well — upgrades, scaling and reliability need real ownership.',
              },
              {
                title: 'Infrastructure Security',
                desc: 'Misconfigurations, broad access and gaps in visibility quietly leave production exposed.',
              },
              {
                title: 'Production Reliability',
                desc: 'Without clear SLOs, observability and incident practice, small issues turn into outages.',
              },
            ].map((pain, i) => (
              <div
                key={i}
                data-aos="fade-up"
                data-aos-delay={i * 100}
                className="card-hover bg-white rounded-2xl border border-gray-200 p-6 flex flex-col gap-3"
              >
                <span className="card-accent text-2xl font-bold text-brand/40 tabular-nums">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="font-semibold text-gray-900 text-base">
                  {pain.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {pain.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* why isha technologies */}
      <section className="py-14 bg-gradient-to-br from-white via-indigo-50 to-blue-50">
        <div className="max-w-[1280px] mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div data-aos="fade-right">
              <span className="inline-block text-xs font-semibold uppercase tracking-widest text-indigo-600 border border-indigo-200 bg-indigo-50 px-3 py-1 rounded-full mb-4">
                Why Isha Technologies
              </span>
              <h2 className="text-3xl lg:text-4xl font-bold tracking-tighter text-black leading-tight mb-4">
                Infrastructure Expertise Built for Real-World Operations
              </h2>
              <p className="text-gray-600 text-base leading-relaxed mb-6">
                We combine cloud architecture, automation and platform
                engineering to build infrastructure that is easier to deploy,
                secure, operate and scale.
              </p>
              <Button
                asChild
                variant="primary"
                className="h-11 rounded-lg px-6 font-semibold"
              >
                <Link href="/services">
                  Explore Our Solutions <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4" data-aos="fade-left">
              {[
                {
                  icon: <Brain size={22} className="card-accent text-indigo-600" />,
                  bg: 'bg-indigo-50',
                  title: 'Technical Expertise',
                  desc: 'Deep hands-on capability across cloud infrastructure, Kubernetes, networking, Infrastructure as Code and modern delivery platforms.',
                },
                {
                  icon: <Zap size={22} className="card-accent text-yellow-500" />,
                  bg: 'bg-yellow-50',
                  title: 'Automation by Design',
                  desc: 'We eliminate repetitive work through Infrastructure as Code, CI/CD and standardized automation across environments.',
                },
                {
                  icon: (
                    <TrendingUp size={22} className="card-accent text-green-500" />
                  ),
                  bg: 'bg-green-50',
                  title: 'Built for Production',
                  desc: 'Reliability, security and observability are considered from the architecture stage—not added after systems go live.',
                },
                {
                  icon: <Bot size={22} className="card-accent text-blue-500" />,
                  bg: 'bg-blue-50',
                  title: 'Clear, Accountable Delivery',
                  desc: 'Defined scope, transparent communication and practical engineering decisions keep every engagement focused and predictable.',
                },
              ].map((item, i) => (
                <div
                  key={i}
                  data-aos="fade-up"
                  data-aos-delay={i * 100}
                  className="card-hover bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col gap-3"
                >
                  <div
                    className={`card-accent-bg w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center`}
                  >
                    {item.icon}
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm">
                    {item.title}
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* services */}
      <section className="bg-gradient-to-r from-white via-blue-50 to-blue-100 py-12 md:py-20">
        <SectionHeader
          title="Infrastructure, automation and reliability services"
          badge="What We Do"
        />
        <div className="max-w-[1280px] mx-auto px-6 overflow-hidden">
          <ServicesSlider />
        </div>
        {/* inline CTA */}
        <div className="text-center mt-10">
          <p className="text-gray-500 text-sm mb-3">
            Not sure which services you need?
          </p>
          <Button
            asChild
            variant="primary"
            className="h-11 rounded-lg px-6"
          >
            <Link href="/contact">Talk to an Expert</Link>
          </Button>
        </div>
      </section>

      {/* process */}
      <section className="py-16">
        <div className="max-w-[1280px] mx-auto px-4">
          <SectionHeader
            badge="Our Process"
            title="How we work with your team"
            alignment="center"
          />
          <p className="max-w-2xl mx-auto text-center text-sm md:text-base text-gray-500 -mt-4 mb-12">
            Every engagement starts with understanding your current setup and
            where it needs to go — then a clear roadmap and hands-on delivery.
          </p>
          <ProcessOfSteps />
        </div>
      </section>

      {/* at a glance — factual, verifiable statements only. The previous
          "40%+ cost reduction / 3× faster deployments / 99.9% uptime / 24/7"
          figures had no supporting source and were removed. */}
      <section className="py-14 bg-brand text-white">
        <div className="max-w-[1280px] mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { stat: '14', label: 'Cloud, DevOps & AI infrastructure services' },
              { stat: '10', label: 'Team members across engineering & delivery' },
              { stat: '3', label: 'Major clouds: AWS, Azure & Google Cloud' },
              { stat: 'IaC', label: 'Terraform, Kubernetes & CI/CD automation' },
            ].map((item, i) => (
              <div key={i} data-aos="fade-up" data-aos-delay={i * 100}>
                <div className="text-3xl font-bold tracking-tight">
                  {item.stat}
                </div>
                <div className="text-sm text-white/70 mt-1">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* tools */}
      <section className="py-12 bg-gradient-to-tr from-white to-brand/5">
        <div className="max-w-[1280px] mx-auto px-4">
          <SectionHeader
            badge="Our Technology Stack"
            title="Tools & Technologies We Use"
            description="We work across a modern infrastructure ecosystem to build, automate, secure and operate reliable cloud platforms."
            alignment="center"
          />
          <TechMarquee />
        </div>
      </section>

      {/* client feedback / testimonials */}
      <section className="py-14 bg-white">
        <div className="max-w-[1280px] mx-auto px-4">
          <SectionHeader
            badge="Client Feedback"
            title="What Our Clients Say"
            description="Practical experiences from teams we've worked with across cloud infrastructure, automation and platform engineering."
            alignment="center"
          />
          <Testimonials />
        </div>
      </section>

      {/* companies we've worked with — neutral wording only: no "partner"
          designation is claimed for any company without documentation */}
      <section className="py-14 bg-gray-50">
        <div className="max-w-[1280px] mx-auto px-4">
          <SectionHeader
            badge="Our Network"
            title="Companies We've Worked With"
            description="Teams we've collaborated with on cloud infrastructure, automation and platform engineering."
            alignment="center"
          />
          <PartnerNetwork />
        </div>
      </section>

      {/* let's talk infrastructure — CTA */}
      <CTABanner
        eyebrow="Let's Talk Infrastructure"
        title="Build Better Infrastructure."
        description="Tell us what you're building. We'll help you build, automate and scale it reliably."
        ctaText="Talk to an Expert"
        ctaHref="/contact"
        note="Start with a focused technical conversation."
        showScheduleMeeting
      />
    </>
  );
}
