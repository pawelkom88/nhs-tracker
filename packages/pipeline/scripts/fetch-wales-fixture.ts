import { fileURLToPath } from 'node:url';
import { trimWalesFixtures } from './trim-wales-fixture.js';

export * from './trim-wales-fixture.js';

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const forceLive = process.argv.includes('--live');
  trimWalesFixtures({ forceLive })
    .then((result) => {
      console.warn('Trim Wales fixtures completed successfully:');
      console.warn(`  Key Measures rows: ${String(result.keyMeasuresRows)}`);
      console.warn(`  Threshold Counts rows: ${String(result.thresholdCountsRows)}`);
      console.warn(`  Total fixtures size: ${(result.totalFixtureBytes / 1024).toFixed(1)} KB`);
      console.warn(`  Cardiff and Vale x 110 July 2026:`, result.cardiffVale110Metrics);
      console.warn(
        `  Powys x 320 July 2026 suppressed median: ${String(result.powysCardiology320HasSuppressedMedian)}`,
      );
    })
    .catch((err: unknown) => {
      console.error('Error trimming Wales fixtures:', err);
      process.exit(1);
    });
}
