import { fileURLToPath } from 'node:url';
import { trimScotlandFixtures } from './trim-scotland-fixture.js';

export * from './trim-scotland-fixture.js';

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const forceLive = process.argv.includes('--live');
  trimScotlandFixtures({ forceLive })
    .then((result) => {
      console.warn('Trim Scotland fixtures completed successfully:');
      console.warn(`  Package ID: ${result.packageId}`);
      console.warn(`  Ongoing and Completed rows: ${String(result.ongoingCompletedRows)}`);
      console.warn(`  Distribution rows: ${String(result.distributionRows)}`);
      console.warn(`  Total fixtures size: ${(result.totalFixtureBytes / 1024).toFixed(1)} KB`);
    })
    .catch((err: unknown) => {
      console.error('Error trimming Scotland fixtures:', err);
      process.exit(1);
    });
}
