import test from 'node:test';
import assert from 'node:assert/strict';
import { processPipelineReport, processContentFreshness } from './open-pipeline-issue.mjs';

function createMockOctokit(initialIssues = []) {
  const issues = [...initialIssues];
  let nextId = 100;

  const calls = {
    listForRepo: [],
    create: [],
    update: [],
  };

  return {
    calls,
    issues: {
      async listForRepo(params) {
        calls.listForRepo.push(params);
        let filtered = [...issues];
        if (params.state) {
          filtered = filtered.filter((i) => (i.state || 'open') === params.state);
        }
        if (params.labels) {
          const labelList = Array.isArray(params.labels) ? params.labels : params.labels.split(',');
          filtered = filtered.filter((i) =>
            (i.labels || []).some((l) => labelList.includes(typeof l === 'string' ? l : l.name)),
          );
        }
        return { data: filtered };
      },

      async create(params) {
        calls.create.push(params);
        const newIssue = {
          number: nextId++,
          title: params.title,
          body: params.body,
          labels: params.labels || [],
          state: 'open',
        };
        issues.push(newIssue);
        return { data: newIssue };
      },

      async update(params) {
        calls.update.push(params);
        const issue = issues.find((i) => i.number === params.issue_number);
        if (!issue) throw new Error(`Issue #${params.issue_number} not found`);
        if (params.title !== undefined) issue.title = params.title;
        if (params.body !== undefined) issue.body = params.body;
        return { data: issue };
      },
    },
  };
}

test('processPipelineReport: creates new issue when nation is blocked and no issue exists', async () => {
  const octokit = createMockOctokit();
  const report = {
    england: {
      status: 'blocked',
      reportingPeriod: '2026-07',
      reportMarkdown: '### Validation Failed\n- unit-count: candidate units < 95%',
    },
    wales: { status: 'no-change' },
    scotland: { status: 'published', reportingPeriod: '2026-06' },
  };

  const results = await processPipelineReport(report, octokit, { owner: 'org', repo: 'kyw' });

  assert.equal(results.length, 1);
  assert.equal(results[0].nation, 'england');
  assert.equal(results[0].action, 'created');
  assert.equal(octokit.calls.create.length, 1);
  assert.equal(octokit.calls.create[0].title, 'Pipeline blocked: england 2026-07');
  assert.deepEqual(octokit.calls.create[0].labels, ['pipeline-blocked']);
  assert.match(octokit.calls.create[0].body, /unit-count: candidate units < 95%/);
});

test('processPipelineReport: dedupes and updates existing open issue when title matches', async () => {
  const octokit = createMockOctokit([
    {
      number: 42,
      title: 'Pipeline blocked: england 2026-07',
      body: 'Old report',
      labels: ['pipeline-blocked'],
      state: 'open',
    },
  ]);

  const report = {
    england: {
      status: 'blocked',
      reportingPeriod: '2026-07',
      reportMarkdown: '### Updated Validation Report\n- figure-count: drop detected',
    },
    wales: { status: 'no-change' },
    scotland: { status: 'no-change' },
  };

  const results = await processPipelineReport(report, octokit, { owner: 'org', repo: 'kyw' });

  assert.equal(results.length, 1);
  assert.equal(results[0].nation, 'england');
  assert.equal(results[0].action, 'updated');
  assert.equal(results[0].issueNumber, 42);
  assert.equal(octokit.calls.create.length, 0);
  assert.equal(octokit.calls.update.length, 1);
  assert.equal(octokit.calls.update[0].issue_number, 42);
  assert.match(octokit.calls.update[0].body, /Updated Validation Report/);
});

test('processPipelineReport: does nothing when all nations are healthy', async () => {
  const octokit = createMockOctokit();
  const report = {
    england: { status: 'published', reportingPeriod: '2026-07' },
    wales: { status: 'no-change' },
    scotland: { status: 'published', reportingPeriod: '2026-06' },
  };

  const results = await processPipelineReport(report, octokit, { owner: 'org', repo: 'kyw' });

  assert.equal(results.length, 0);
  assert.equal(octokit.calls.listForRepo.length, 0);
  assert.equal(octokit.calls.create.length, 0);
  assert.equal(octokit.calls.update.length, 0);
});

test('processPipelineReport: creates multiple issues for multiple failed nations', async () => {
  const octokit = createMockOctokit();
  const report = {
    england: { status: 'blocked', reportingPeriod: '2026-07', reportMarkdown: 'England error' },
    wales: { status: 'error', error: 'Network timeout connecting to StatsWales' },
    scotland: { status: 'no-change' },
  };

  const results = await processPipelineReport(report, octokit, { owner: 'org', repo: 'kyw' });

  assert.equal(results.length, 2);
  assert.equal(results[0].nation, 'england');
  assert.equal(results[0].action, 'created');
  assert.equal(results[1].nation, 'wales');
  assert.equal(results[1].action, 'created');
  assert.equal(octokit.calls.create.length, 2);
  assert.equal(octokit.calls.create[0].title, 'Pipeline blocked: england 2026-07');
  assert.equal(octokit.calls.create[1].title, 'Pipeline blocked: wales latest');
});

test('processContentFreshness: creates issue when review is due', async () => {
  const octokit = createMockOctokit();
  const res = await processContentFreshness(octokit, {
    owner: 'org',
    repo: 'kyw',
    detail: 'content/england/about-the-figures.md is 190 days old',
  });

  assert.equal(res.action, 'created');
  assert.equal(octokit.calls.create.length, 1);
  assert.equal(octokit.calls.create[0].title, 'Content review due: explainers older than 6 months');
  assert.deepEqual(octokit.calls.create[0].labels, ['content-review-due']);
  assert.match(octokit.calls.create[0].body, /190 days old/);
});

test('processContentFreshness: updates existing issue on subsequent run', async () => {
  const octokit = createMockOctokit([
    {
      number: 88,
      title: 'Content review due: explainers older than 6 months',
      body: 'Initial notice',
      labels: ['content-review-due'],
      state: 'open',
    },
  ]);

  const res = await processContentFreshness(octokit, {
    owner: 'org',
    repo: 'kyw',
    detail: 'Updated warning detail',
  });

  assert.equal(res.action, 'updated');
  assert.equal(res.issueNumber, 88);
  assert.equal(octokit.calls.create.length, 0);
  assert.equal(octokit.calls.update.length, 1);
  assert.equal(octokit.calls.update[0].issue_number, 88);
});
