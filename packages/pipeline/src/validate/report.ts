import type { ValidationReport } from './gate.js';

function formatNationName(nation: string): string {
  switch (nation) {
    case 'england':
      return 'England';
    case 'wales':
      return 'Wales';
    case 'scotland':
      return 'Scotland';
    default:
      return nation;
  }
}

/**
 * Renders a ValidationReport into Markdown suitable for GitHub issues and pipeline logs.
 * Failed checks are listed first with failure details.
 */
export function renderValidationReport(report: ValidationReport): string {
  const failedChecks = report.checks.filter((c) => !c.ok);
  const passedChecks = report.checks.filter((c) => c.ok);
  const nationName = formatNationName(report.nation);
  const statusEmoji = report.ok ? '✅' : '❌';
  const statusText = report.ok ? 'PASSED' : 'BLOCKED';

  const lines: string[] = [
    `# Pipeline Validation Report: ${nationName} (${report.reportingPeriod})`,
    '',
    `**Status:** ${statusEmoji} ${statusText}`,
    `**Nation:** ${nationName}`,
    `**Reporting Period:** ${report.reportingPeriod}`,
    `**Result:** ${String(passedChecks.length)} / ${String(report.checks.length)} checks passed`,
    '',
  ];

  if (failedChecks.length > 0) {
    lines.push('## ❌ Failed Checks', '');
    for (const check of failedChecks) {
      lines.push(`- **\`${check.id}\`**: ${check.detail}`);
    }
    lines.push('');
  }

  if (passedChecks.length > 0) {
    lines.push('## ✅ Passed Checks', '');
    for (const check of passedChecks) {
      lines.push(`- **\`${check.id}\`**: ${check.detail}`);
    }
    lines.push('');
  }

  return lines.join('\n').trimEnd() + '\n';
}
