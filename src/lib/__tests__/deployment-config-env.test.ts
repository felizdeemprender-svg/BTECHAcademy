import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Verificación de Configuración de Despliegue (App Hosting)', () => {
  const rootDir = process.cwd();

  it('apphosting.testing.yaml debe declarar la variable WORKER_SECRET', () => {
    const filePath = path.join(rootDir, 'apphosting.testing.yaml');
    expect(fs.existsSync(filePath)).toBe(true);

    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/variable:\s*WORKER_SECRET/);
  });

  it('apphosting.yaml debe declarar la variable WORKER_SECRET', () => {
    const filePath = path.join(rootDir, 'apphosting.yaml');
    expect(fs.existsSync(filePath)).toBe(true);

    const content = fs.readFileSync(filePath, 'utf-8');
    expect(content).toMatch(/variable:\s*WORKER_SECRET/);
  });
});
