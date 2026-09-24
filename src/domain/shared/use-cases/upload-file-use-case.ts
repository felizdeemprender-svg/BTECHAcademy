import { Result, ok, err } from '../result';
import { DomainError, validationError, unavailable } from '../errors';

export interface UploadFileRequest {
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
  maxSizeBytes?: number;
}

export interface UploadFileResponse {
  url: string;
  sizeBytes: number;
}

export class UploadFileUseCase {
  constructor(
    private readonly uploaderFn: (buffer: Buffer, name: string, mimeType: string) => Promise<string>
  ) {}

  async execute(request: UploadFileRequest): Promise<Result<UploadFileResponse, DomainError>> {
    try {
      const { fileBuffer, fileName, mimeType, maxSizeBytes = 10 * 1024 * 1024 } = request;

      if (!fileBuffer || fileBuffer.length === 0) {
        return err(validationError('INVALID_FILE: El archivo está vacío.'));
      }

      if (fileBuffer.length > maxSizeBytes) {
        return err(validationError(`FILE_TOO_LARGE: El archivo excede el tamaño máximo permitido de ${Math.round(maxSizeBytes / (1024 * 1024))}MB.`));
      }

      const url = await this.uploaderFn(fileBuffer, fileName, mimeType);

      return ok({
        url,
        sizeBytes: fileBuffer.length
      });
    } catch (e: any) {
      return err(unavailable(`UPLOAD_FAILED: Fallo al subir el archivo. ${e.message}`));
    }
  }
}
