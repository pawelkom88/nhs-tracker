import type { MetadataRoute } from 'next';
import { siteConfig } from '../config/site';
import {
  getPublished as getEnglandPublished,
  getReference as getEnglandReference,
} from '../data/england';
import {
  getPublished as getWalesPublished,
  getReference as getWalesReference,
} from '../data/wales';
import {
  getPublished as getScotlandPublished,
  getReference as getScotlandReference,
} from '../data/scotland';

export const dynamic = 'force-static';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteConfig.baseUrl;

  const staticRoutes: MetadataRoute.Sitemap = [
    '',
    '/about',
    '/sources',
    '/privacy',
    '/accessibility',
    '/england',
    '/wales',
    '/scotland',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
  }));

  // England routes
  const [englandPublished, englandReference] = await Promise.all([
    getEnglandPublished(),
    getEnglandReference(),
  ]);
  const englandSpecialtyMap = new Map(
    englandReference.specialties.map((s) => [s.id as string, s.slug]),
  );
  const englandUnitMap = new Map(
    englandReference.reportingUnits.map((u) => [u.id as string, u.officialCode.toLowerCase()]),
  );

  const englandSpecialtyRoutes: MetadataRoute.Sitemap = englandReference.specialties.map((s) => ({
    url: `${baseUrl}/england/${s.slug}`,
  }));

  const englandUnitRoutes: MetadataRoute.Sitemap = [];
  for (const entry of englandPublished.entries) {
    const slug = englandSpecialtyMap.get(entry.specialty);
    const code = englandUnitMap.get(entry.reportingUnit);
    if (slug && code) {
      englandUnitRoutes.push({
        url: `${baseUrl}/england/${slug}/${code}`,
      });
    }
  }

  // Wales routes
  const [walesPublished, walesReference] = await Promise.all([
    getWalesPublished(),
    getWalesReference(),
  ]);
  const walesSpecialtyMap = new Map(
    walesReference.specialties.map((s) => [s.id as string, s.slug]),
  );
  const walesUnitMap = new Map(
    walesReference.reportingUnits.map((u) => [u.id as string, u.officialCode.toLowerCase()]),
  );

  const walesSpecialtyRoutes: MetadataRoute.Sitemap = walesReference.specialties.map((s) => ({
    url: `${baseUrl}/wales/${s.slug}`,
  }));

  const walesUnitRoutes: MetadataRoute.Sitemap = [];
  for (const entry of walesPublished.entries) {
    const slug = walesSpecialtyMap.get(entry.specialty);
    const code = walesUnitMap.get(entry.reportingUnit);
    if (slug && code) {
      walesUnitRoutes.push({
        url: `${baseUrl}/wales/${slug}/${code}`,
      });
    }
  }

  // Scotland routes
  const [scotlandPublished, scotlandReference] = await Promise.all([
    getScotlandPublished(),
    getScotlandReference(),
  ]);
  const scotlandSpecialtyMap = new Map(
    scotlandReference.specialties.map((s) => [s.id as string, s.slug]),
  );
  const scotlandUnitMap = new Map(
    scotlandReference.reportingUnits.map((u) => [u.id as string, u.officialCode.toLowerCase()]),
  );

  const scotlandSpecialtyRoutes: MetadataRoute.Sitemap = scotlandReference.specialties.map((s) => ({
    url: `${baseUrl}/scotland/${s.slug}`,
  }));

  const scotlandUnitRoutes: MetadataRoute.Sitemap = [];
  for (const entry of scotlandPublished.entries) {
    const slug = scotlandSpecialtyMap.get(entry.specialty);
    const code = scotlandUnitMap.get(entry.reportingUnit);
    if (slug && code) {
      scotlandUnitRoutes.push({
        url: `${baseUrl}/scotland/${slug}/${code}`,
      });
    }
  }

  return [
    ...staticRoutes,
    ...englandSpecialtyRoutes,
    ...englandUnitRoutes,
    ...walesSpecialtyRoutes,
    ...walesUnitRoutes,
    ...scotlandSpecialtyRoutes,
    ...scotlandUnitRoutes,
  ];
}
