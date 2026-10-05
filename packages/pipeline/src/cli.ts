#!/usr/bin/env node
import { parseArgs } from 'node:util';
import type { PublishingNation } from '@kyw/model/nation';
import { runPipeline, runReferenceBuild, runAssemble } from './run.js';
import { runBackfill } from './backfill.js';

const USAGE = `
Know Your Wait Pipeline CLI

Usage:
  pipeline run [--nation england|wales|scotland] [--dry-run] [--from-fixtures]
  pipeline backfill [--nation england|wales|scotland] [--months <n>] [--dry-run] [--from-fixtures]
  pipeline reference [--nation england|wales|scotland] [--from-fixtures]
  pipeline assemble [--nation england|wales|scotland]

Commands:
  run          Discover, ingest, validate and assemble releases for publishing nations
  backfill     Backfill historical releases for publishing nations
  reference    Rebuild reference data for publishing nations
  assemble     Assemble published.json from existing releases and reference data

Options:
  --nation         Specific publishing nation to target (england, wales, scotland)
  --months         Number of historical months to backfill (default: 13 for England, 25 for Scotland)
  --dry-run        Validate and simulate execution without writing files
  --from-fixtures  Run pipeline using committed fixture files instead of live network
  --help, -h       Display this help message
`;

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h' || command === 'help') {
    process.stdout.write(`${USAGE.trim()}\n`);
    process.exit(0);
  }

  const parsed = parseArgs({
    args: args.slice(1),
    options: {
      nation: { type: 'string' },
      months: { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
      'from-fixtures': { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: true,
  });

  if (parsed.values.help) {
    process.stdout.write(`${USAGE.trim()}\n`);
    process.exit(0);
  }

  const rawNation = parsed.values.nation;
  if (rawNation && rawNation !== 'england' && rawNation !== 'wales' && rawNation !== 'scotland') {
    process.stderr.write(
      `Error: Unknown nation "${rawNation}". Must be one of: england, wales, scotland.\n`,
    );
    process.exit(1);
  }
  const nation = rawNation as PublishingNation | undefined;
  const dryRun = parsed.values['dry-run'];
  const fromFixtures = parsed.values['from-fixtures'];
  const months = parsed.values.months !== undefined ? Number(parsed.values.months) : undefined;

  switch (command) {
    case 'run': {
      process.stdout.write(
        `Running pipeline${nation ? ` for ${nation}` : ''}${dryRun ? ' [DRY-RUN]' : ''}${fromFixtures ? ' [FROM-FIXTURES]' : ''}...\n`,
      );
      const report = await runPipeline({
        nation,
        dryRun,
        fromFixtures,
      });

      process.stdout.write('\n--- Pipeline Run Summary ---\n');
      for (const [nat, res] of Object.entries(report)) {
        const periodStr = res.reportingPeriod ? ` (${res.reportingPeriod})` : '';
        process.stdout.write(`- ${nat}: ${res.status.toUpperCase()}${periodStr}\n`);
        if (res.status === 'blocked' && res.reportMarkdown) {
          process.stdout.write(`\n${res.reportMarkdown}\n`);
        }
        if (res.status === 'error' && res.error) {
          process.stderr.write(`  Error: ${res.error}\n`);
        }
      }
      process.exit(0);
      break;
    }

    case 'backfill': {
      process.stdout.write(
        `Backfilling pipeline${nation ? ` for ${nation}` : ''}${months !== undefined ? ` (${String(months)} months)` : ''}${dryRun ? ' [DRY-RUN]' : ''}${fromFixtures ? ' [FROM-FIXTURES]' : ''}...\n`,
      );
      const report = await runBackfill({
        nation,
        months,
        dryRun,
        fromFixtures,
      });

      process.stdout.write('\n--- Pipeline Backfill Summary ---\n');
      for (const [nat, res] of Object.entries(report)) {
        const periodStr =
          res.earliestPeriod && res.latestPeriod
            ? ` (${res.earliestPeriod} .. ${res.latestPeriod}, ${String(res.releasesCount)} releases)`
            : ` (${String(res.releasesCount)} releases)`;
        process.stdout.write(`- ${nat}: ${res.status.toUpperCase()}${periodStr}\n`);
        if (res.status === 'blocked' && res.reportMarkdown) {
          process.stdout.write(`\n${res.reportMarkdown}\n`);
        }
        if (res.status === 'error' && res.error) {
          process.stderr.write(`  Error: ${res.error}\n`);
        }
      }
      process.exit(0);
      break;
    }

    case 'reference': {
      process.stdout.write(`Building reference data${nation ? ` for ${nation}` : ''}...\n`);
      await runReferenceBuild(nation, { fromFixtures });
      process.stdout.write('Reference data build complete.\n');
      process.exit(0);
      break;
    }

    case 'assemble': {
      process.stdout.write(`Assembling published.json${nation ? ` for ${nation}` : ''}...\n`);
      await runAssemble(nation);
      process.stdout.write('Assembly complete.\n');
      process.exit(0);
      break;
    }

    default: {
      process.stderr.write(`Unknown command: "${command}"\n\n`);
      process.stdout.write(`${USAGE.trim()}\n`);
      process.exit(1);
      break;
    }
  }
}

main().catch((err: unknown) => {
  const errMsg = err instanceof Error ? (err.stack ?? err.message) : String(err);
  process.stderr.write(`Fatal pipeline error: ${errMsg}\n`);
  process.exit(1);
});
