export interface SiteConfig {
  siteName: string;
  siteDescription: string;
  baseUrl: string;
  repoUrl: string;
  contactEmail: string;
  analyticsToken?: string | undefined;
}

export const siteConfig: SiteConfig = {
  siteName: 'Know Your Wait',
  siteDescription:
    'Patient-facing explanations of official NHS waiting-time statistics for England, Wales and Scotland.',
  baseUrl: 'https://knowyourwait.org',
  repoUrl: 'https://github.com/knowyourwait/know-your-wait',
  contactEmail: 'hello@knowyourwait.org',
  analyticsToken: process.env.NEXT_PUBLIC_CF_ANALYTICS_TOKEN,
};
