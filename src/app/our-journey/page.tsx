import { HeroBanner } from '@/components/layout/HeroBanner';
import SectionHeader from '@/components/layout/SectionHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ourStoryStages } from '@/data/data';
import { buildMetadata } from '@/lib/seo';
import { MapPin } from 'lucide-react';
import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

export const metadata: Metadata = {
  ...buildMetadata({
    title: 'Our Journey | Isha Technologies',
    description:
      'Isha Technologies was founded in 2026 to focus on the infrastructure layer behind modern digital products — cloud platforms, deployment automation, containers, security, observability and reliable operations.',
    path: '/our-journey',
  }),
  keywords:
    'Isha Technologies, Our Journey, Cloud Infrastructure, Automation, Reliability, Founded 2026',
};

export default function Page() {
  return (
    <>
      <HeroBanner title="Our Journey" />
      {/* Hero Banner */}
      <section className="relative overflow-hidden px-4 py-24 max-w-[1280px] mx-auto grid lg:grid-cols-2 grid-cols-1 gap-4">
        <div className="flex flex-col items-start gap-4">
          <Badge>OUR JOURNEY</Badge>
          <h1 className="font-semibold text-3xl lg:text-3xl tracking-tighter text-black">
            Where Isha Technologies Started
            <span className="text-brand">.</span>
          </h1>
          <p className="text-gray-600 text-[.8em] md:text-[1em]">
            Isha Technologies was founded in 2026 in Jaipur, Rajasthan, with a
            clear focus on building reliable foundations for modern
            technology teams.
            <br />
            <br />
            From cloud infrastructure and DevOps automation to security,
            Kubernetes and reliable operations, we bring practical
            engineering expertise to the systems businesses depend on.
          </p>
          <p className="text-[17px] font-semibold text-brand">
            2026 · Founded in Jaipur, Rajasthan
          </p>
          <Button
            asChild
            variant="primary"
            className="h-10 rounded-lg px-5"
          >
            <Link href="/contact">Talk to an Expert</Link>
          </Button>
        </div>
        <div>
          <div className="z-10 w-full mx-auto p-2 rounded-xl border border-dashed border-brand/25">
            {/* Photo: Hawa Mahal front view, Jaipur — Shubh77901, CC BY-SA 4.0, via Wikimedia Commons */}
            <div className="relative aspect-[3/2] w-full overflow-hidden rounded-lg">
              <Image
                src="/hawa-mahal.jpg"
                alt="Hawa Mahal in Jaipur, Rajasthan"
                fill
                className="object-cover object-top"
                sizes="(min-width: 1024px) 600px, 100vw"
              />
            </div>
          </div>
        </div>
      </section>
      <section className="bg-gradient-to-tr from-white to-brand/5 py-16">
        <div className="max-w-[1280px] mx-auto px-4 grid md:grid-cols-2 gap-12 items-start">
          <div>
            <SectionHeader
              title="From Village to IT Company"
              badge="OUR JOURNEY"
              alignment="start"
            />
            <div className="flex flex-col items-start gap-4">
              <Badge className="gap-1.5">
                <MapPin className="size-3" />
                Jaipur, Rajasthan
              </Badge>
              <p className="text-gray-600 max-w-3xl">
                Isha Technologies started with a simple ambition — to build a
                technology company grounded in practical engineering,
                continuous learning and long-term thinking.
              </p>
              <p className="text-gray-600 max-w-3xl">
                We began our journey from a humble background and grew with a
                clear focus on technology, infrastructure and solving real
                engineering challenges. Today, that journey continues from
                Jaipur, Rajasthan, with Isha Technologies focused on helping
                businesses build, automate and operate reliable digital
                infrastructure.
              </p>
              <div className="flex items-center gap-3 pt-2">
                <span className="text-3xl font-bold tracking-tighter text-brand">
                  2026
                </span>
                <span className="text-sm leading-snug text-gray-600">
                  Founded in
                  <br />
                  Jaipur, Rajasthan
                </span>
              </div>
              <p className="text-sm text-gray-500">
                A new company with a long-term vision for technology and
                engineering.
              </p>
            </div>
          </div>

          {/* Right Side - Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {ourStoryStages.map((val, idx) => (
              <div
                key={idx}
                className="card-hover p-6 bg-white border-l-2 border-brand shadow-lg rounded-md"
              >
                <div className="flex items-center justify-between">
                  <span className="card-accent text-xl text-gray-400">
                    {val.icon}
                  </span>
                  <span className="text-xs font-bold tracking-widest text-brand">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-black my-2 tracking-tighter">
                  {val.title}
                </h3>
                <p className="text-black opacity/60 text-sm">{val.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-gradient-to-br from-black to-brand">
        <div className="max-w-4xl mx-auto px-6">
          <div className="border-dashed border-brand rounded-3xl shadow-lg p-10 flex flex-col items-center justify-center text-center space-y-4 border">
            <h2 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-brand/80 tracking-tighter">
              Let&rsquo;s build reliable infrastructure together.
            </h2>

            <p className="text-white/90 max-w-2xl">
              Tell us about your platform and where it needs to go. We will
              review your current setup and outline a clear path for
              architecture, automation and reliability.
            </p>

            <Button asChild variant="secondary" className="mt-4 px-6 py-2 rounded-lg">
              <Link href="/contact">Get in Touch</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
