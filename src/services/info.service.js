import { readFileSync } from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

// Read once at startup; package.json does not change while the process runs
const PACKAGE_JSON = path.resolve(import.meta.dirname, '../../package.json');
const pkg = JSON.parse(readFileSync(PACKAGE_JSON, 'utf8'));

// Public application metadata. Dependencies are injectable to keep the function easy to unit test.
export function getAppInfo({ packageJson = pkg, environment = config.env } = {}) {
  return {
    name: packageJson.name,
    version: packageJson.version,
    environment,
    status: 'ok',
  };
}
