import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, it, expect } from 'vitest';
import type { PublishingNation } from '@kyw/model/nation';
import {
  generateSpecialtyStubs,
  formatSpecialtyStubMarkdown,
  resolveContentDir,
  SPECIALTY_REGISTRIES,
  type AnySpecialty,
} from '../../src/content/stubs.js';
import { ENGLAND_SPECIALTIES } from '../../src/reference/england/specialties.js';
import { WALES_SPECIALTIES } from '../../src/reference/wales/specialties.js';
import { SCOTLAND_SPECIALTIES } from '../../src/reference/scotland/specialties.js';

describe('Specialty Content Stubs Generator (T-9.2)', () => {
  it('generates placeholder markdown with expected YAML front matter', () => {
    const englandTandO = ENGLAND_SPECIALTIES.find((s) => s.slug === 'trauma-and-orthopaedics');
    expect(englandTandO).toBeDefined();
    if (!englandTandO) {
      throw new Error('England T&O specialty not found in reference data');
    }

    const md = formatSpecialtyStubMarkdown('england', englandTandO);
    expect(md).toContain('kind: specialty');
    expect(md).toContain('nation: england');
    expect(md).toContain(`specialtyId: ${englandTandO.id}`);
    expect(md).toContain("summary: ''");
    expect(md).toContain('keywords: []');
    expect(md).toContain('status: placeholder');
  });

  it('generates all stubs in a clean temporary directory', async () => {
    const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'kyw-stubs-test-'));

    try {
      const result = await generateSpecialtyStubs({ contentDir: tempDir });

      expect(result.england.created).toBe(ENGLAND_SPECIALTIES.length);
      expect(result.england.existing).toBe(0);
      expect(result.wales.created).toBe(WALES_SPECIALTIES.length);
      expect(result.wales.existing).toBe(0);
      expect(result.scotland.created).toBe(SCOTLAND_SPECIALTIES.length);
      expect(result.scotland.existing).toBe(0);
      expect(result.totalCreated).toBe(
        ENGLAND_SPECIALTIES.length + WALES_SPECIALTIES.length + SCOTLAND_SPECIALTIES.length,
      );

      // Verify files were actually written
      const englandFiles = await fsp.readdir(path.join(tempDir, 'england', 'specialties'));
      expect(englandFiles.length).toBe(ENGLAND_SPECIALTIES.length);
      expect(englandFiles).toContain('trauma-and-orthopaedics.md');

      const walesFiles = await fsp.readdir(path.join(tempDir, 'wales', 'specialties'));
      expect(walesFiles.length).toBe(WALES_SPECIALTIES.length);
      expect(walesFiles).toContain('all-specialties.md');

      const scotlandFiles = await fsp.readdir(path.join(tempDir, 'scotland', 'specialties'));
      expect(scotlandFiles.length).toBe(SCOTLAND_SPECIALTIES.length);
      expect(scotlandFiles).toContain('all-specialties.md');
    } finally {
      await fsp.rm(tempDir, { recursive: true, force: true });
    }
  });

  it('is idempotent and never overwrites existing content files', async () => {
    const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'kyw-stubs-idempotence-'));

    try {
      // First run creates everything
      const res1 = await generateSpecialtyStubs({ contentDir: tempDir });
      expect(res1.totalCreated).toBe(
        ENGLAND_SPECIALTIES.length + WALES_SPECIALTIES.length + SCOTLAND_SPECIALTIES.length,
      );

      // Customise an existing file (e.g. PO reviewed copy)
      const tAndOPath = path.join(tempDir, 'england', 'specialties', 'trauma-and-orthopaedics.md');
      const customContent = `---
kind: specialty
nation: england
specialtyId: england:C_110
summary: 'Specialist surgery for bones and joints.'
keywords: [hip, knee, fracture]
status: reviewed
lastReviewed: '2026-10-01'
reviewedBy: 'product-owner'
sources: []
---

# Trauma & Orthopaedics Custom Copy
`;
      await fsp.writeFile(tAndOPath, customContent, 'utf-8');

      // Second run must not overwrite the customised file
      const res2 = await generateSpecialtyStubs({ contentDir: tempDir });
      expect(res2.totalCreated).toBe(0);
      expect(res2.totalExisting).toBe(
        ENGLAND_SPECIALTIES.length + WALES_SPECIALTIES.length + SCOTLAND_SPECIALTIES.length,
      );

      const readBack = await fsp.readFile(tAndOPath, 'utf-8');
      expect(readBack).toBe(customContent);
    } finally {
      await fsp.rm(tempDir, { recursive: true, force: true });
    }
  });

  it('dry-run mode reports planned actions without writing any files', async () => {
    const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'kyw-stubs-dry-'));

    try {
      const res = await generateSpecialtyStubs({ contentDir: tempDir, dryRun: true });
      expect(res.totalCreated).toBe(
        ENGLAND_SPECIALTIES.length + WALES_SPECIALTIES.length + SCOTLAND_SPECIALTIES.length,
      );
      expect(res.totalExisting).toBe(0);

      // Verify no directories or files were created
      const exists = fs.existsSync(path.join(tempDir, 'england'));
      expect(exists).toBe(false);
    } finally {
      await fsp.rm(tempDir, { recursive: true, force: true });
    }
  });

  describe('Repository Content Consistency (live content directory)', () => {
    const repoContentDir = resolveContentDir();

    it('every specialty in reference data has a matching file in content/<nation>/specialties/', () => {
      const nations: readonly PublishingNation[] = ['england', 'wales', 'scotland'];

      for (const nation of nations) {
        const specialties: readonly AnySpecialty[] = SPECIALTY_REGISTRIES[nation];
        const dir = path.join(repoContentDir, nation, 'specialties');
        expect(fs.existsSync(dir)).toBe(true);

        for (const specialty of specialties) {
          const filePath = path.join(dir, `${specialty.slug}.md`);
          expect(
            fs.existsSync(filePath),
            `Missing specialty file for ${nation} slug "${specialty.slug}" (${specialty.id}) at ${filePath}`,
          ).toBe(true);

          const raw = fs.readFileSync(filePath, 'utf-8');
          expect(raw).toContain(`nation: ${nation}`);
          expect(raw).toContain(`specialtyId: ${specialty.id}`);
          expect(raw).toContain('kind: specialty');
        }
      }
    });

    it('no orphan specialty files exist in content/<nation>/specialties/', () => {
      const nations: readonly PublishingNation[] = ['england', 'wales', 'scotland'];

      for (const nation of nations) {
        const specialties: readonly AnySpecialty[] = SPECIALTY_REGISTRIES[nation];
        const knownSlugs = new Set(specialties.map((s) => s.slug));
        const dir = path.join(repoContentDir, nation, 'specialties');

        const files = fs.readdirSync(dir);
        for (const file of files) {
          if (file.endsWith('.md')) {
            const slug = file.replace(/\.md$/, '');
            expect(
              knownSlugs.has(slug),
              `Found orphan file "${file}" in ${nation}/specialties/ not matching any known reference specialty slug`,
            ).toBe(true);
          }
        }
      }
    });
  });
});
