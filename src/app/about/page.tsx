import { EngineeringPrinciples } from '@/components/card/engineering-principles';
import { MissionAndVision } from '@/components/card/missonAndVision';
import { TeamMembers } from '@/components/card/team-members';
import { HeroBanner } from '@/components/layout/HeroBanner';
import SectionHeader from '@/components/layout/SectionHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TeamCollaborationVisual } from '@/components/visuals/TeamCollaborationVisual';
import { CertifiedBadge } from '@/components/about/CertifiedBadge';
import { OurFocusFlow } from '@/components/about/OurFocusFlow';
import { WhoWeAreVisual } from '@/components/about/WhoWeAreVisual';
import { WhyIshaTechnologies } from '@/components/about/WhyIshaTechnologies';
import { teamMembers } from '@/data/data';
import { buildMetadata } from '@/lib/seo';
import { Metadata } from 'next';
import Link from 'next/link';
import React from 'react';

export const metadata: Metadata = {
  ...buildMetadata({
    title: 'About | Isha Technologies',
    description:
      'Isha Technologies focuses on the infrastructure layer behind modern digital products — cloud platforms, deployment automation, containers, security, observability and reliable operations.',
    path: '/about',
  }),
  keywords:
    'About Isha Technologies, Cloud Infrastructure, DevOps, Automation, Reliability, Observability, Infrastructure Architecture, AWS, Google Cloud, Microsoft Azure, Hetzner, DigitalOcean, BigRock',
};

export default function Page() {
  return (
    <>
      <HeroBanner title="ABOUT ISHA TECHNOLOGIES" />
      <section className="max-w-3xl mx-auto px-4 mt-4">
        <CertifiedBadge />
      </section>
      <section>
        <div className="max-w-[1280px] mx-auto px-4 relative py-16 grid md:grid-cols-2 gap-6 items-center overflow-hidden">
          <div className="space-y-4">
            <h1 className="md:text-4xl text-3xl font-semibold text-black tracking-tighter">
              Building Reliable Infrastructure for Modern Technology
            </h1>
            {/* Text */}
            <div className="relative z-10 border-l border-blue-600 px-4 py-0">
              <p className="opacity-80 leading-relaxed mb-4">
                Isha Technologies delivers cloud and DevOps solutions designed
                around reliability, security and operational efficiency.
                <br />
                <br />
                We help organizations build, automate and modernize their
                infrastructure across cloud platforms, with engineering
                practices that support dependable delivery and sustainable
                growth.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Button
                asChild
                variant="primary"
                className="h-10 rounded-lg px-5"
              >
                <Link href="/services">Explore Our Services</Link>
              </Button>
              <Button
                asChild
                variant="primary"
                className="h-10 rounded-lg px-5"
              >
                <Link href="/contact">Talk to an Expert</Link>
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 place-items-center md:p-0 p-8">
            <TeamCollaborationVisual />
          </div>
        </div>
      </section>

      {/* Who We Are */}
      <section className="bg-gray-50 py-16 md:py-20">
        <div className="max-w-[1280px] mx-auto px-4 grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-4">
            <Badge variant="default">WHO WE ARE</Badge>
            <h2 className="text-balance text-[clamp(30px,3vw,44px)] font-bold tracking-tighter text-black leading-tight">
              Engineering the Foundations Behind Modern Technology
            </h2>
            <p className="max-w-[620px] text-[15px] leading-[1.6] text-gray-600 md:text-base">
              Isha Technologies focuses on the engineering foundations behind
              modern digital products. We help organizations build dependable
              cloud infrastructure across architecture, automation, security
              and operations — with hands-on experience across AWS, Google
              Cloud, Microsoft Azure, Hetzner, DigitalOcean and BigRock.
            </p>
            <p className="max-w-[620px] text-[15px] leading-[1.6] text-gray-600 md:text-base">
              Our expertise spans cloud architecture, DevOps, Kubernetes,
              infrastructure security, migration, observability and
              reliability engineering — helping teams create platforms that
              are structured, maintainable and ready to scale.
            </p>
            <p className="max-w-[620px] text-[15px] leading-[1.6] text-gray-600 md:text-base">
              We take a practical approach: understand the environment,
              design the right foundation, automate repeatable work and
              continuously improve how infrastructure is built and operated.
            </p>
          </div>
          <div className="grid grid-cols-1 place-items-center md:p-0 p-8">
            <WhoWeAreVisual />
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-r from-white to-brand/5 py-16">
        <div className="max-w-[1280px] mx-auto px-4 grid lg:grid-cols-2 gap-12 items-start">
          {/* Left Side: Heading + Paragraphs + Highlighted statement */}
          <div className="flex flex-col justify-center space-y-4">
            <Badge variant="default">HOW WE WORK</Badge>
            <h2 className="text-4xl font-bold text-black tracking-tighter">
              Engineering Principles That Guide Our Work
            </h2>
            <p className="max-w-md text-lg leading-relaxed text-gray-600">
              We approach infrastructure with a production mindset —
              designing systems that are reliable, secure and built to
              perform as technology evolves.
            </p>
            <p className="max-w-md text-lg leading-relaxed text-gray-600">
              From cloud architecture and automation to security and
              operations, we focus on practical engineering decisions that
              make infrastructure easier to build, manage and scale.
            </p>
            <p className="max-w-md text-[17px] font-semibold text-brand">
              Built for reliability. Designed for change.
            </p>
          </div>

          {/* Right Side: Principle cards */}
          <EngineeringPrinciples />
        </div>
      </section>

      <section className="bg-white py-12">
        <div className="max-w-[1280px] mx-auto px-4">
          <SectionHeader title="Our Mission & Vision" badge="MISSION & VISION" />
          <MissionAndVision />
        </div>
      </section>

      {/* Our Focus */}
      <section className="bg-white py-16 md:py-20">
        <div className="max-w-[1280px] mx-auto px-4">
          <div className="max-w-2xl mb-12">
            <Badge variant="default">WHAT WE FOCUS ON</Badge>
            <h2 className="mt-4 text-[clamp(30px,3vw,44px)] font-bold tracking-tighter text-black leading-tight">
              Focused on the Foundations That Keep Technology Moving
            </h2>
            <p className="mt-4 text-base md:text-lg leading-relaxed text-gray-600">
              Our work centers on the infrastructure, automation and
              operational systems that help modern technology teams build,
              deploy and operate with confidence.
            </p>
          </div>
          <OurFocusFlow />
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-[1280px] mx-auto px-4">
          <SectionHeader badge="TEAM" title="Meet Our Team" />
          <TeamMembers data={teamMembers} />
        </div>
      </section>

      {/* Why Isha Technologies */}
      <section className="bg-white py-16 md:py-20">
        <div className="max-w-[1280px] mx-auto px-4 grid lg:grid-cols-2 gap-12 items-start">
          <div className="lg:sticky lg:top-24 space-y-4">
            <Badge variant="default">WHY ISHA TECHNOLOGIES</Badge>
            <h2 className="text-[clamp(30px,3vw,44px)] font-bold tracking-tighter text-black leading-tight">
              Engineering That Goes Beyond Infrastructure
            </h2>
            <p className="text-base md:text-lg leading-relaxed text-gray-600">
              We bring together cloud, automation, security and reliability
              engineering to create platforms that teams can confidently
              build and operate on.
            </p>
          </div>
          <WhyIshaTechnologies />
        </div>
      </section>
    </>
  );
}
