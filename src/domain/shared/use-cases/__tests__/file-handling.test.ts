import { vi, describe, it, expect } from 'vitest';
import { UploadFileUseCase } from '../upload-file-use-case';
import { DownloadFileUseCase } from '../download-file-use-case';

describe('File Handling Use Cases', () => {
  describe('UploadFileUseCase', () => {
    it('should successfully upload a valid file', async () => {
      const mockUploader = vi.fn().mockResolvedValue('https://storage.example.com/test.jpg');
      const useCase = new UploadFileUseCase(mockUploader);
      const buffer = Buffer.from('fake image content');
      const result = await useCase.execute({
        fileBuffer: buffer,
        fileName: 'test.jpg',
        mimeType: 'image/jpeg'
      });
      expect(result.ok).toBe(true);
    });
    it('should fail if file exceeds size limit', async () => {
      const mockUploader = vi.fn();
      const useCase = new UploadFileUseCase(mockUploader);
      const buffer = Buffer.alloc(2 * 1024 * 1024);
      const result = await useCase.execute({
        fileBuffer: buffer,
        fileName: 'huge.pdf',
        mimeType: 'application/pdf',
        maxSizeBytes: 1 * 1024 * 1024
      });
      expect(result.ok).toBe(false);
    });
  });

  describe('DownloadFileUseCase', () => {
    it('should successfully download a valid file', async () => {
      const mockResponse = {
        ok: true,
        headers: new Headers({ 'content-type': 'application/pdf' }),
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(100))
      } as unknown as Response;
      const mockFetcher = vi.fn().mockResolvedValue(mockResponse);
      const useCase = new DownloadFileUseCase(mockFetcher);
      const result = await useCase.execute({ fileUrl: 'https://example.com/file.pdf' });
      expect(result.ok).toBe(true);
    });
  });
});
