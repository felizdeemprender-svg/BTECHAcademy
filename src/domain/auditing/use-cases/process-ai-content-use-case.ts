import { Result, ok, err } from '../../shared/result';
import { DomainError, validationError, unavailable } from '../../shared/errors';

export interface ProcessAiContentRequest {
  prompt: string;
  context?: any;
  options?: {
    temperature?: number;
    maxTokens?: number;
  };
}

export interface ProcessAiContentResponse {
  generatedText: string;
  wasFallbackUsed: boolean;
  model: string;
}

export class ProcessAiContentUseCase {
  constructor(
    private readonly primaryAiFn: (prompt: string, context?: any, options?: any) => Promise<string>,
    private readonly fallbackAiFn?: (prompt: string, context?: any, options?: any) => Promise<string>
  ) {}

  async execute(request: ProcessAiContentRequest): Promise<Result<ProcessAiContentResponse, DomainError>> {
    try {
      if (!request.prompt || request.prompt.trim() === '') {
        return err(validationError('INVALID_PROMPT: El prompt no puede estar vacío.'));
      }

      try {
        const text = await this.primaryAiFn(request.prompt, request.context, request.options);
        return ok({
          generatedText: text,
          wasFallbackUsed: false,
          model: 'primary'
        });
      } catch (primaryError: any) {
        console.warn(`[ProcessAiContentUseCase] Falló el modelo principal: ${primaryError.message}. Intentando fallback...`);
        
        if (!this.fallbackAiFn) {
          throw new Error(`PRIMARY_FAILED_NO_FALLBACK: ${primaryError.message}`);
        }

        const fallbackText = await this.fallbackAiFn(request.prompt, request.context, request.options);
        return ok({
          generatedText: fallbackText,
          wasFallbackUsed: true,
          model: 'fallback'
        });
      }
    } catch (e: any) {
      return err(unavailable(`AI_PROCESSING_ERROR: Todos los intentos de generación fallaron. Detalles: ${e.message}`));
    }
  }
}
