import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { loadEnvFile } from './load-env';

describe('loadEnvFile', () => {
  const originalValue = process.env.TEST_DATABASE_SEED_VALUE;
  let directory: string;

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'simco-seed-env-'));
  });

  afterEach(() => {
    if (originalValue === undefined) {
      Reflect.deleteProperty(process.env, 'TEST_DATABASE_SEED_VALUE');
    } else {
      process.env.TEST_DATABASE_SEED_VALUE = originalValue;
    }
    fs.rmSync(directory, { recursive: true, force: true });
  });

  it('loads missing values and preserves existing values', () => {
    const environmentFile = path.join(directory, '.env.test');
    fs.writeFileSync(environmentFile, 'TEST_DATABASE_SEED_VALUE=from-file\n');

    Reflect.deleteProperty(process.env, 'TEST_DATABASE_SEED_VALUE');
    loadEnvFile(environmentFile);
    expect(process.env.TEST_DATABASE_SEED_VALUE).toBe('from-file');

    process.env.TEST_DATABASE_SEED_VALUE = 'already-set';
    loadEnvFile(environmentFile);
    expect(process.env.TEST_DATABASE_SEED_VALUE).toBe('already-set');
  });
});
