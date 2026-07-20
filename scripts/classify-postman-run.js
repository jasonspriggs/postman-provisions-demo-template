'use strict';

const fs = require('node:fs');

const summaryPath = process.env.GITHUB_STEP_SUMMARY || '';

function readIfExists(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return '';
  return fs.readFileSync(filePath, 'utf8');
}

function classify(logText, exitCode) {
  const combined = logText.toLowerCase();
  const normalizedExitCode = String(exitCode || '');

  if (!normalizedExitCode && !logText.trim()) {
    return {
      category: 'skipped',
      reason: 'No generated collection ID was available for this suite.'
    };
  }

  if (normalizedExitCode === '0' && logText.trim()) {
    return {
      category: 'passed',
      reason: 'The Postman collection completed successfully.'
    };
  }

  if (!logText.trim()) {
    return {
      category: 'ci_setup_or_invocation',
      reason: 'No Postman CLI output was captured.'
    };
  }

  if (/\b(econnrefused|enotfound|etimedout|eai_again|econnreset)\b/.test(combined) ||
    combined.includes('socket hang up') ||
    combined.includes('connection refused') ||
    combined.includes('getaddrinfo') ||
    combined.includes('could not resolve') ||
    combined.includes("couldn't connect") ||
    combined.includes('network') ||
    combined.includes('tls') ||
    combined.includes('ssl') ||
    combined.includes('timeout')) {
    return {
      category: 'runner_or_network',
      reason: 'The runner could not reach the target service.'
    };
  }

  if (combined.includes('schema') ||
    combined.includes('required') ||
    combined.includes('property') ||
    combined.includes('enum') ||
    combined.includes('expected') ||
    combined.includes('assertionerror') ||
    combined.includes('keywordlocation') ||
    combined.includes('instancelocation') ||
    combined.includes('status code') ||
    combined.includes('validation')) {
    return {
      category: 'request_or_contract',
      reason: 'The service responded, but the response did not satisfy generated assertions.'
    };
  }

  return {
    category: 'ci_setup_or_invocation',
    reason: 'The Postman CLI failed before a more specific runner or contract signal was detected.'
  };
}

function evidenceLines(text) {
  const patterns = [
    /econnrefused/i,
    /enotfound/i,
    /etimedout/i,
    /schema/i,
    /required/i,
    /property/i,
    /enum/i,
    /expected/i,
    /assertionerror/i,
    /keywordLocation/i,
    /instanceLocation/i,
    /status code/i,
    /error/i,
    /failed/i
  ];

  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && patterns.some((pattern) => pattern.test(line)))
    .slice(0, 8);
}

function section(label, logPath, exitCode) {
  const logText = readIfExists(logPath);
  const result = classify(logText, exitCode);
  const evidence = evidenceLines(logText);

  return [
    `### ${label}`,
    '',
    `Status: **${result.category === 'passed' ? 'passed' : result.category === 'skipped' ? 'skipped' : 'failed'}**`,
    `Failure category: \`${result.category}\``,
    `Reason: ${result.reason}`,
    '',
    evidence.length ? evidence.map((line) => `- ${line}`).join('\n') : '- No focused error evidence was detected.',
    ''
  ].join('\n');
}

const markdown = [
  '## Postman Smoke And Contract Visibility',
  '',
  section('Smoke', process.env.POSTMAN_SMOKE_LOG_FILE, process.env.SMOKE_EXIT_CODE),
  section('Contract', process.env.POSTMAN_CONTRACT_LOG_FILE, process.env.CONTRACT_EXIT_CODE)
].join('\n');

if (summaryPath) {
  fs.appendFileSync(summaryPath, markdown);
}

console.log(markdown);
