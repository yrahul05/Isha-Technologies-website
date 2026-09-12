import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// Both API routes (src/app/api/contact, src/app/api/analytics/visitors)
// already declare `runtime = 'edge'` and use only fetch/Web Crypto, so the
// default Cloudflare Workers config below needs no extra overrides.
export default defineCloudflareConfig();
