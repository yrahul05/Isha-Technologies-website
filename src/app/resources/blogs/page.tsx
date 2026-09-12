import { BlogGrid } from '@/components/card/blog-cards';
import { FeaturedBlog } from '@/components/card/featured-blog';
import { HeroBanner } from '@/components/layout/HeroBanner';
import { blogPosts } from '@/data/blog-posts';
import { buildMetadata } from '@/lib/seo';
import { Metadata } from 'next';

export const metadata: Metadata = {
  ...buildMetadata({
    title: 'Technical Resources | Isha Technologies',
    description:
      'Engineering insights on cloud infrastructure, DevOps automation, Kubernetes, Terraform, security, cost optimization, observability and site reliability from Isha Technologies.',
    path: '/resources/blogs',
  }),
  keywords:
    'Cloud Infrastructure, DevOps, Kubernetes, Terraform, CI/CD, DevSecOps, Cloud Security, Cloud Cost Optimization, Observability, Site Reliability, Platform Engineering',
};

export default function Page() {
  const [featured, ...rest] = blogPosts;

  return (
    <>
      <HeroBanner title="TECHNICAL RESOURCES" />
      <section className="py-12">
        <div className="max-w-[1280px] mx-auto px-4">
          <div className="mx-auto mb-10 max-w-3xl text-center">
            <h1 className="text-3xl font-semibold tracking-tighter text-black md:text-4xl">
              Engineering Insights for Modern Infrastructure
            </h1>
            <p className="mt-4 text-gray-600">
              Practical insights on cloud infrastructure, DevOps automation,
              Kubernetes, security, reliability and modern platform
              engineering.
            </p>
          </div>

          {featured && <FeaturedBlog post={featured} />}
          <BlogGrid posts={rest} />
        </div>
      </section>
    </>
  );
}
