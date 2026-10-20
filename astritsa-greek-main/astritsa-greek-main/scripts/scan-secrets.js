'use strict';
// Secret scanner: scans the files passed as argv (or the whole tracked tree
// when run with --all) for known credential patterns. Exit 1 if a likely
// secret is found. Used by the pre-push hook (.githooks/pre-push) and safe
// to run manually: `node scripts/scan-secrets.js --all`
//
// Note: patterns intentionally match *candidate* secrets (placeholders like
// sk_live_replace_me also match). Lines flagged as placeholders/examples are
// suppressed by the ALLOW list below.

const fs = require('fs');
const { execSync } = require('child_process');

const PATTERNS = [
  [/sk-ant-(admin|api)?-[A-Za-z0-9_-]{16,}/, 'Anthropic API key'],
  [/sk-or-v1-[A-Za-z0-9]{20,}/, 'OpenRouter API key'],
  [/sk-proj-[A-Za-z0-9_-]{20,}/, 'OpenAI project API key'],
  [/\bsk-[A-Za-z0-9]{20,}\b/, 'OpenAI-style API key'],
  [/\b(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9]{10,}/, 'Stripe key'],
  [/\bwhsec_[A-Za-z0-9]{10,}/, 'Stripe webhook secret'],
  [/\bAIza[0-9A-Za-z_-]{35}/, 'Google API key'],
  [/\bAKIA[0-9A-Z]{16}\b/, 'AWS access key id'],
  [/aws_secret_access_key\s*=\s*[A-Za-z0-9/+=]{30,}/i, 'AWS secret access key'],
  [/\bghp_[A-Za-z0-9]{30,}\b/, 'GitHub personal access token'],
  [/\bgho_[A-Za-z0-9]{30,}\b/, 'GitHub OAuth token'],
  [/\bgithub_pat_[A-Za-z0-9_]{20,}\b/, 'GitHub fine-grained token'],
  [/\bxox[baprs]-[A-Za-z0-9-]{10,}\b/, 'Slack token'],
  [/BEGIN (RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY/, 'Private key block'],
  [/\beyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{5,}/, 'JWT'],
  [/hooks\.slack\.com\/services\/[A-Za-z0-9/]+/, 'Slack webhook URL'],
  [/\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis):\/\/[^/\s:]+:[^@\s/]+@/, 'Credentialed database URL'],
  [/\bGLpat-[A-Za-z0-9_-]{15,}\b/, 'GitLab personal access token'],
];

// Lines that are documentation/examples, not real credentials.
const ALLOW = [
  /replace[_-]?me/i,
  /your[-_]?domain\.example/,
  /example\.com/,
  /^\s*#/,           // comment lines (env templates)
  /hooks\.zapier\.com\//, // doc placeholder
  /<[^>]*>/,         // obvious markup placeholders
];

const isAllowed = (line) => ALLOW.some((re) => re.test(line));

function scanFile(file) {
  let content;
  try { content = fs.readFileSync(file, 'utf8'); } catch { return []; }
  const hits = [];
  const lines = content.split('\n');
  lines.forEach((line, i) => {
    if (isAllowed(line)) return;
    for (const [re, label] of PATTERNS) {
      if (re.test(line)) hits.push(`${file}:${i + 1}  ${label}  ->  ${line.trim().slice(0, 100)}`);
    }
  });
  return hits;
}

function filesToScan() {
  if (process.argv.includes('--all')) {
    return execSync('git ls-files', { encoding: 'utf8' }).split('\n').filter(Boolean);
  }
  return process.argv.slice(2).filter((f) => fs.existsSync(f));
}

const files = filesToScan();
const findings = files.flatMap(scanFile);

if (findings.length) {
  console.error('POSSIBLE SECRETS DETECTED — push aborted.\n');
  for (const f of findings) console.error('  ' + f);
  console.error('\nIf any of these is a false positive, move the value into an env var');
  console.error('(.env, gitignored) or refine scripts/scan-secrets.js ALLOW rules.');
  process.exit(1);
}
console.log(`Secret scan clean (${files.length} files).`);
