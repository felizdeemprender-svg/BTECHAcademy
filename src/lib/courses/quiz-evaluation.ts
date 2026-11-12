export interface EvaluatableQuestion {
  question?: string;
  text?: string;
  type?: string;
  options?: string[];
  correctAnswer?: unknown;
}

export interface NormalizedEvaluationItem {
  index: number;
  question: string;
  type: string;
  options: string[];
  correctAnswer: string;
  studentAnswer: string;
  isObjectiveGradable: boolean;
  isObjectiveCorrect: boolean;
}

function normalizeBooleanAnswer(value: unknown): string | null {
  if (typeof value === 'boolean') return value ? 'Verdadero' : 'Falso';
  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase();
    if (trimmed === 'true' || trimmed === 'verdadero') return 'Verdadero';
    if (trimmed === 'false' || trimmed === 'falso') return 'Falso';
  }
  return null;
}

function resolveChoiceText(value: unknown, options: string[]): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number' && Number.isInteger(value) && options[value] !== undefined) {
    return options[value];
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\d+$/.test(trimmed)) {
      const idx = Number(trimmed);
      if (options[idx] !== undefined) return options[idx];
    }
    return trimmed;
  }
  return String(value);
}

/**
 * Normaliza una pregunta y la respuesta del alumno a texto legible para el evaluador IA
 * y determina si puede calificarse de forma objetiva y determinista.
 */
export function normalizeQuizQuestionForEval(
  q: EvaluatableQuestion,
  studentAnswerRaw: unknown,
  index: number
): NormalizedEvaluationItem {
  const type = q.type || 'free_response';
  const question = (q.question || q.text || '').trim();
  const options = Array.isArray(q.options)
    ? q.options.filter((o): o is string => typeof o === 'string' && o.trim() !== '')
    : [];

  let studentAnswer = 'No respondida';
  let correctAnswer = 'No definida';
  let isObjectiveGradable = false;
  let isObjectiveCorrect = false;

  if (type === 'multiple_choice' && options.length > 0) {
    const resolvedCorrect = resolveChoiceText(q.correctAnswer, options);
    const resolvedStudent = resolveChoiceText(studentAnswerRaw, options);
    if (resolvedCorrect !== null && resolvedCorrect !== '') {
      correctAnswer = resolvedCorrect;
      isObjectiveGradable = true;
    }
    if (resolvedStudent !== null && resolvedStudent !== '') {
      studentAnswer = resolvedStudent;
    }
    if (isObjectiveGradable && resolvedStudent !== null) {
      isObjectiveCorrect =
        resolvedStudent.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
    }
  } else if (type === 'true_false') {
    const resolvedCorrect = normalizeBooleanAnswer(q.correctAnswer);
    const resolvedStudent = normalizeBooleanAnswer(studentAnswerRaw);
    if (resolvedCorrect !== null) {
      correctAnswer = resolvedCorrect;
      isObjectiveGradable = true;
    } else if (q.correctAnswer !== undefined && q.correctAnswer !== null) {
      correctAnswer = String(q.correctAnswer);
    }
    if (resolvedStudent !== null) {
      studentAnswer = resolvedStudent;
    } else if (studentAnswerRaw !== undefined && studentAnswerRaw !== null) {
      studentAnswer = String(studentAnswerRaw);
    }
    if (isObjectiveGradable && resolvedStudent !== null) {
      isObjectiveCorrect = resolvedStudent === correctAnswer;
    }
  } else {
    if (studentAnswerRaw !== undefined && studentAnswerRaw !== null && String(studentAnswerRaw).trim() !== '') {
      studentAnswer =
        typeof studentAnswerRaw === 'boolean'
          ? studentAnswerRaw
            ? 'Verdadero'
            : 'Falso'
          : String(studentAnswerRaw);
    }
    if (q.correctAnswer !== undefined && q.correctAnswer !== null && String(q.correctAnswer).trim() !== '') {
      correctAnswer =
        typeof q.correctAnswer === 'boolean'
          ? q.correctAnswer
            ? 'Verdadero'
            : 'Falso'
          : String(q.correctAnswer);
    }
  }

  return {
    index: index + 1,
    question,
    type,
    options,
    correctAnswer,
    studentAnswer,
    isObjectiveGradable,
    isObjectiveCorrect,
  };
}

/**
 * Si todas las preguntas son objetivas (multiple_choice con opciones o true_false),
 * devuelve el puntaje exacto de 0 a 100. Si hay preguntas abiertas, devuelve null.
 */
export function computeObjectiveQuizScore(
  items: NormalizedEvaluationItem[]
): number | null {
  if (items.length === 0) return null;
  if (!items.every((item) => item.isObjectiveGradable)) return null;
  const correctCount = items.filter((item) => item.isObjectiveCorrect).length;
  return Math.round((correctCount / items.length) * 100);
}

