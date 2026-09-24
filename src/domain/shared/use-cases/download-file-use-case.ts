import { Result, ok, err } from '../result';
import { DomainError, validationError, notFound, unavailable } from '../errors';

export interface DownloadFileRequest {
  fileUrl: string;
}

export interface DownloadFileResponse {
  fileBuffer: Buffer;
  contentType: string;
  sizeBytes: number;
}

export class DownloadFileUseCase {
  constructor(
    private readonly fetcherFn: (url: string) => Promise<Response>
  ) {}

  async execute(request: DownloadFileRequest): Promise<Result<DownloadFileResponse, DomainError>> {
    try {
      if (!request.fileUrl) {
        return err(validationError('INVALID_URL: La URL del archivo no puede estar vacía.'));
      }

      const response = await this.fetcherFn(request.fileUrl);

      if (!response.ok) {
        if (response.status === 404) {
          return err(notFound(`FILE_NOT_FOUND: El archivo no existe o fue eliminado (404).`));
        }
        return err(unavailable(`DOWNLOAD_FAILED: Error del servidor de archivos (Status: ${response.status}).`));
      }

      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      const arrayBuffer = await response.arrayBuffer();
      const fileBuffer = Buffer.from(arrayBuffer);

      if (fileBuffer.length === 0) {
        return err(validationError('EMPTY_FILE: El archivo descargado está vacío.'));
      }

      return ok({
        fileBuffer,
        contentType,
        sizeBytes: fileBuffer.length
      });
    } catch (e: any) {
      return err(unavailable(`NETWORK_ERROR: Fallo al descargar el archivo. ${e.message}`));
    }
  }
}
