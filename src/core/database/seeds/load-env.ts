import * as fs from 'fs';
import * as path from 'path';
import { envOrDefault } from '@core/common/utils/environment.util';

// Carga manual de env files (mismo orden que ConfigModule en app.module.ts:
// .env.${NODE_ENV} y luego .env) sin depender del paquete `dotenv`, que no
// está declarado como dependencia directa (pnpm no lo resuelve top-level).
// Efecto secundario: se ejecuta al importarse, antes que cualquier import
// que lea process.env (ej. data-source.ts).
export function loadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] ??= value;
  }
}

const nodeEnv = envOrDefault(process.env.NODE_ENV, 'dev');
loadEnvFile(path.resolve(process.cwd(), `.env.${nodeEnv}`));
loadEnvFile(path.resolve(process.cwd(), '.env'));
