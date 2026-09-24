import { vi, describe, it, expect, afterEach } from 'vitest';
import { uploadPendingImagesInObject } from '../upload-base64';

vi.mock('firebase/storage', () => ({
  ref: vi.fn(() => ({})),
  uploadBytes: vi.fn().mockResolvedValue({ ref: {} }),
  getDownloadURL: vi.fn().mockResolvedValue('https://fake-firebase.url/image.jpg')
}));

describe('uploadPendingImagesInObject', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should skip primitive values', async () => {
    expect(await uploadPendingImagesInObject(null, {} as any, 'path')).toBeNull();
    expect(await uploadPendingImagesInObject('string', {} as any, 'path')).toBe('string');
    expect(await uploadPendingImagesInObject(123, {} as any, 'path')).toBe(123);
  });

  it('should replace base64 strings with public URLs', async () => {
    const obj = {
      name: 'test',
      image: 'data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      nested: {
        avatar: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
      }
    };
    const result = await uploadPendingImagesInObject(obj, {} as any, 'test-path');
    expect(result.name).toBe('test');
    expect(result.image).toBe('https://fake-firebase.url/image.jpg');
    expect(result.nested.avatar).toBe('https://fake-firebase.url/image.jpg');
  });

  it('should skip React Elements and Firebase internal objects', async () => {
    const obj = {
      reactNode: { '$$typeof': Symbol.for('react.element'), data: 'data:image/png;base64,...' },
      firebaseTimestamp: { toDate: () => new Date(), data: 'data:image/png;base64,...' },
      firebaseFieldValue: { _methodName: 'serverTimestamp', data: 'data:image/png;base64,...' },
      validImage: 'data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
    };
    const result = await uploadPendingImagesInObject(obj, {} as any, 'test-path');
    expect(result.reactNode.data).toContain('data:image');
    expect(result.validImage).toBe('https://fake-firebase.url/image.jpg');
  });
});
