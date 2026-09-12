import { HeroBanner } from '@/components/layout/HeroBanner';
import SectionHeader from '@/components/layout/SectionHeader';
import { Button } from '@/components/ui/button';
import { services, steps } from '@/data/data';
import { buildMetadata } from '@/lib/seo';
import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import React from 'react';

export const metadata: Metadata = {
  ...buildMetadata({
    title: 'Services | Isha Technologies',
    description:
      'Isha Technologies services across cloud infrastructure, DevOps automation, Kubernetes, cloud migration, managed cloud, cost optimization, DevSecOps, platform solutions, site reliability and observability.',
    path: '/services',
  }),
  keywords:
    'Cloud Infrastructure, DevOps Solutions, Kubernetes, Cloud Migration, Managed Cloud, Cloud Cost Optimization, DevSecOps, Platform Solutions, Site Reliability, Observability, Infrastructure Automation',
};

const Page = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-brand/5 to-white">
      {/* Hero Section */}
      <HeroBanner title="Services" />

      {/* Services Section */}
      <div className="max-w-[1280px] mx-auto px-4 py-20">
        <SectionHeader
          title="Tailored Services, Trusted Results"
          description="Explore our range of services designed to empower your business with innovation, security, and scalability. From strategy to execution, we provide solutions that drive measurable results."
          badge="SERVICES"
        />

        <div className="flex flex-col gap-16 mt-16">
          {services.map((service, idx) => (
            <div
              key={idx}
              className={`grid md:grid-cols-2 gap-8 items-center ${idx % 2 !== 0 ? 'md:grid-flow-col-dense' : ''
                }`}
            >
              {/* Image */}
              <div
                className={`${idx % 2 !== 0 ? 'md:order-last' : 'md:order-first'} flex justify-center w-full`}
              >
                <div className="w-64 h-64 p-12 bg-gradient-to-br from-white to-brand/10 rounded-full">
                  <Image
                    src={service?.image}
                    width={400}
                    height={400}
                    alt={service.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Content */}
              <div
                className={`${idx % 2 !== 0 ? 'md:order-first' : 'md:order-last'} flex flex-col justify-center`}
              >
                <div className="card-hover p-8 rounded-2xl border-dashed border-brand/50 border">
                  <h3 className="md:text-4xl tracking-tighter text-2xl font-normal text-black mb-4 border-l-2 border-brand pl-4">
                    {service.title}
                  </h3>
                  <p className="text-gray-600 mb-4">{service.description}</p>

                  {/* Call-to-action */}
                  <Link href={service.link}>
                    <Button className="h-12" variant="primary">
                      Learn More
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative py-20 px-6 bg-gradient-to-b from-white via-brand/5 to-white overflow-hidden">
        {/* Background Rounded Shapes */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-brand/25/30 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute -bottom-40 -right-24 w-72 h-72 bg-blue-300/20 rounded-full blur-2xl animate-pulse-slow"></div>

        {/* Section Heading */}
        <SectionHeader
          title="How We Work"
          description="Our proven approach ensures efficiency, quality, and transparency at every step of the project."
          badge="WORK PROCESS"
        />

        {/* Steps Cards */}
        <div className="max-w-6xl mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="card-hover p-8 bg-gradient-to-br from-white via-brand/5 to-white rounded-3xl border border-r-2 border-brand/25 shadow-lg relative overflow-hidden"
            >
              <div className="card-accent flex justify-center">{step.icon}</div>
              <h3 className="text-xl tracking-tight font-bold text-gray-800 mt-4 mb-2 text-center">
                {step.title}
              </h3>
              <p className="text-gray-600 text-sm text-center">
                {step.description}
              </p>

              <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-100/20 rounded-full blur-2xl pointer-events-none"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Page;
