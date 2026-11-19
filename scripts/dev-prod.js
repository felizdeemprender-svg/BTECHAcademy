const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// 1. Cargar .env.production explícitamente en process.env
const envProdPath = path.join(__dirname, '..', '.env.production');
if (fs.existsSync(envProdPath)) {
  const content = fs.readFileSync(envProdPath, 'utf8');
  content.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const idx = line.indexOf('=');
      if (idx !== -1) {
        const key = line.slice(0, idx).trim();
        const val = line.slice(idx + 1).trim();
        process.env[key] = val;
      }
    }
  });
  console.log('[Dev-Prod] Cargado entorno de Produccion (btechacademy-8b329)');
} else {
  console.warn('[Dev-Prod] Advertencia: No se encontro .env.production');
}

// 2. Levantar servidor dev de Next.js
const isWindows = process.platform === 'win32';
const nextCmd = isWindows ? 'npx.cmd' : 'npx';
const child = spawn(nextCmd, ['next', 'dev', '-p', '9002'], {
  stdio: 'inherit',
  env: process.env
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
