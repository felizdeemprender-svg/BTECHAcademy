import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';

const mockProc: any = new EventEmitter();
mockProc.stderr = new EventEmitter();
mockProc.stdout = new EventEmitter();
mockProc.kill = vi.fn();

vi.mock('child_process', () => ({
  spawn: vi.fn(() => mockProc)
}));

import { runFfmpeg } from '../engine';

describe('FFmpeg Process Runner con Timeout y Recuperación (src/lib/video/engine.ts)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockProc.removeAllListeners();
    mockProc.stderr.removeAllListeners();
    mockProc.stdout.removeAllListeners();
    mockProc.kill.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debe abortar con SIGKILL y rechazar la promesa si el proceso excede timeoutMs', async () => {
    const promise = runFfmpeg(['-i', 'dummy.mp4'], {}, 5000);

    // Avanzamos el tiempo simulado más allá del timeout (5000ms)
    vi.advanceTimersByTime(5100);

    await expect(promise).rejects.toThrow('FFmpeg proceso abortado por timeout (5000ms)');
    expect(mockProc.kill).toHaveBeenCalledWith('SIGKILL');
  });

  it('debe resolver exitosamente cuando el proceso termina con código 0 antes del timeout', async () => {
    const promise = runFfmpeg(['-i', 'dummy.mp4'], {}, 10000);

    // Emitir cierre exitoso antes de que expire el timer
    mockProc.emit('close', 0);

    await expect(promise).resolves.toBeUndefined();
    expect(mockProc.kill).not.toHaveBeenCalled();
  });

  it('debe rechazar la promesa si el proceso termina con código de error distinto de 0', async () => {
    const promise = runFfmpeg(['-i', 'corrupted.mp4'], {}, 10000);

    mockProc.emit('close', 1);

    await expect(promise).rejects.toThrow('FFmpeg failed with code 1');
    expect(mockProc.kill).not.toHaveBeenCalled();
  });

  it('debe manejar errores de inicio de proceso (evento error) y cancelar el timer', async () => {
    const promise = runFfmpeg(['-i', 'notfound.mp4'], {}, 10000);

    mockProc.emit('error', new Error('spawn ENOENT'));

    await expect(promise).rejects.toThrow('spawn ENOENT');
    expect(mockProc.kill).not.toHaveBeenCalled();
  });
});
