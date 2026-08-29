import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// @claim:production-topology
// This is intentionally a release integration test, not a source inspection.
// deployment/deploy.sh refuses a dirty or unpushed candidate, deploys that
// exact SHA, verifies one PostgreSQL-backed ready replica, creates a record,
// restarts the active revision, and reads that same record from the replacement
// process. Its non-zero exit status is the claim-test failure signal.
const deploymentDirectory = dirname(fileURLToPath(import.meta.url));
const deployScript = resolve(deploymentDirectory, 'deploy.sh');
const result = spawnSync('bash', [deployScript], {
  cwd: resolve(deploymentDirectory, '..'),
  stdio: 'inherit',
  env: process.env
});

if (result.error) throw result.error;
if (result.status !== 0) {
  throw new Error(`production topology deployment gate failed with exit status ${result.status ?? 'unknown'}`);
}
