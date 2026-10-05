#!/usr/bin/env node
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

/**
 * Creates a minimal Octokit-compatible REST client using Node native fetch.
 *
 * @param {string} token
 * @param {string} [baseUrl]
 * @returns {object}
 */
export function createOctokitClient(token, baseUrl = 'https://api.github.com') {
  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'know-your-wait-pipeline-bot',
  };

  return {
    issues: {
      async listForRepo({ owner, repo, state = 'open', labels }) {
        const url = new globalThis.URL(`${baseUrl}/repos/${owner}/${repo}/issues`);
        if (state) url.searchParams.set('state', state);
        if (labels) url.searchParams.set('labels', labels);

        const res = await globalThis.fetch(url.toString(), { headers });
        if (!res.ok) {
          throw new Error(`GitHub API listForRepo failed: ${res.status} ${res.statusText}`);
        }
        const data = await res.json();
        return { data };
      },

      async create({ owner, repo, title, body, labels }) {
        const url = `${baseUrl}/repos/${owner}/${repo}/issues`;
        const res = await globalThis.fetch(url, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, body, labels }),
        });
        if (!res.ok) {
          throw new Error(`GitHub API create issue failed: ${res.status} ${res.statusText}`);
        }
        const data = await res.json();
        return { data };
      },

      async update({ owner, repo, issue_number, title, body }) {
        const url = `${baseUrl}/repos/${owner}/${repo}/issues/${issue_number}`;
        const payload = {};
        if (title !== undefined) payload.title = title;
        if (body !== undefined) payload.body = body;

        const res = await globalThis.fetch(url, {
          method: 'PATCH',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          throw new Error(`GitHub API update issue failed: ${res.status} ${res.statusText}`);
        }
        const data = await res.json();
        return { data };
      },
    },
  };
}

/**
 * Processes pipeline run report and opens or updates blocked pipeline issues.
 *
 * @param {object} report
 * @param {object} octokit
 * @param {{ owner: string, repo: string }} repoContext
 * @returns {Promise<Array<{ nation: string, action: 'created' | 'updated' | 'skipped', issueNumber?: number }>>}
 */
export async function processPipelineReport(report, octokit, { owner, repo }) {
  const results = [];
  const blockedEntries = Object.entries(report || {}).filter(
    ([, res]) => res && (res.status === 'blocked' || res.status === 'error'),
  );

  if (blockedEntries.length === 0) {
    return results;
  }

  // Fetch all open issues with pipeline-blocked label
  const { data: openIssues } = await octokit.issues.listForRepo({
    owner,
    repo,
    state: 'open',
    labels: 'pipeline-blocked',
  });

  for (const [nation, res] of blockedEntries) {
    const period = res.reportingPeriod || 'latest';
    const title = `Pipeline blocked: ${nation} ${period}`;
    const timestamp = new Date().toISOString();

    let body = `## Pipeline Validation ${res.status.toUpperCase()}\n\n`;
    body += `- **Nation**: ${nation}\n`;
    body += `- **Reporting Period**: ${period}\n`;
    body += `- **Status**: ${res.status}\n`;
    body += `- **Last Attempt**: ${timestamp}\n\n`;

    if (res.reportMarkdown) {
      body += `### Validation Report\n\n${res.reportMarkdown}\n`;
    } else if (res.error) {
      body += `### Error Details\n\n\`\`\`\n${res.error}\n\`\`\`\n`;
    }

    const existingIssue = openIssues.find((issue) => issue.title === title);

    if (existingIssue) {
      await octokit.issues.update({
        owner,
        repo,
        issue_number: existingIssue.number,
        body,
      });
      results.push({ nation, action: 'updated', issueNumber: existingIssue.number });
    } else {
      const { data: created } = await octokit.issues.create({
        owner,
        repo,
        title,
        body,
        labels: ['pipeline-blocked'],
      });
      results.push({ nation, action: 'created', issueNumber: created.number });
    }
  }

  return results;
}

/**
 * Opens or updates content freshness review issue.
 *
 * @param {object} octokit
 * @param {{ owner: string, repo: string, detail?: string }} options
 * @returns {Promise<{ action: 'created' | 'updated', issueNumber: number }>}
 */
export async function processContentFreshness(octokit, { owner, repo, detail }) {
  const title = 'Content review due: explainers older than 6 months';
  const timestamp = new Date().toISOString();

  let body = '## Editorial Content Freshness Review Due\n\n';
  body += `Weekly content freshness check triggered on ${timestamp}.\n\n`;
  body +=
    'One or more explainers or content documents have not been reviewed within 183 days (6 months).\n\n';
  if (detail) {
    body += `### Details\n\n${detail}\n\n`;
  }
  body +=
    'Please review content files in `content/` and update `lastReviewed` and `reviewedBy` front matter.';

  const { data: openIssues } = await octokit.issues.listForRepo({
    owner,
    repo,
    state: 'open',
    labels: 'content-review-due',
  });

  const existingIssue = openIssues.find((issue) => issue.title === title);

  if (existingIssue) {
    await octokit.issues.update({
      owner,
      repo,
      issue_number: existingIssue.number,
      body,
    });
    return { action: 'updated', issueNumber: existingIssue.number };
  }

  const { data: created } = await octokit.issues.create({
    owner,
    repo,
    title,
    body,
    labels: ['content-review-due'],
  });
  return { action: 'created', issueNumber: created.number };
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const repoSlug = process.env.GITHUB_REPOSITORY;

  if (!token || !repoSlug) {
    process.stdout.write(
      'Notice: GITHUB_TOKEN or GITHUB_REPOSITORY not set. Skipping GitHub issue processing.\n',
    );
    process.exit(0);
  }

  const [owner, repo] = repoSlug.split('/');
  if (!owner || !repo) {
    process.stderr.write(
      `Error: Invalid GITHUB_REPOSITORY format "${repoSlug}". Expected owner/repo.\n`,
    );
    process.exit(1);
  }

  const octokit = createOctokitClient(token);
  const args = process.argv.slice(2);

  if (args.includes('--content-freshness')) {
    process.stdout.write('Checking and creating content freshness review issue...\n');
    const res = await processContentFreshness(octokit, { owner, repo });
    process.stdout.write(`Content freshness issue ${res.action} (#${res.issueNumber}).\n`);
    return;
  }

  const reportPath = path.resolve(process.cwd(), 'packages/pipeline/.cache/run-report.json');
  let report = null;
  try {
    const raw = await fs.readFile(reportPath, 'utf8');
    report = JSON.parse(raw);
  } catch (err) {
    process.stdout.write(
      `No run report found at ${reportPath} (${err.message}). Nothing to process.\n`,
    );
    return;
  }

  process.stdout.write('Processing pipeline run report for blocked releases...\n');
  const results = await processPipelineReport(report, octokit, { owner, repo });

  if (results.length === 0) {
    process.stdout.write('All nations healthy or no changes. No issues required.\n');
  } else {
    for (const res of results) {
      process.stdout.write(`- ${res.nation}: issue ${res.action} (#${res.issueNumber})\n`);
    }
  }
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : '';

if (invokedFile === currentFile) {
  main().catch((err) => {
    process.stderr.write(`Fatal error processing pipeline issues: ${err.stack ?? err.message}\n`);
    process.exit(1);
  });
}
