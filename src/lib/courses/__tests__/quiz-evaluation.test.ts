import { describe, expect, it } from 'vitest';

import {
  computeObjectiveQuizScore,
  normalizeQuizQuestionForEval,
} from '../quiz-evaluation';

describe('quiz-evaluation', () => {
  it('resolves numeric correctAnswer index against options for multiple_choice', () => {
    const q = {
      text: '¿Qué te ha parecido este material?',
      type: 'multiple_choice',
      options: ['Muy bueno', 'Bueno', 'Regular', 'No me sirvio'],
      correctAnswer: 0,
    };

    const item = normalizeQuizQuestionForEval(q, 'Muy bueno', 0);
    expect(item.question).toBe('¿Qué te ha parecido este material?');
    expect(item.correctAnswer).toBe('Muy bueno');
    expect(item.studentAnswer).toBe('Muy bueno');
    expect(item.isObjectiveGradable).toBe(true);
    expect(item.isObjectiveCorrect).toBe(true);
    expect(computeObjectiveQuizScore([item])).toBe(100);
  });

  it('supports numeric index studentAnswer and scores mismatch as 0', () => {
    const q = {
      question: 'Selecciona la correcta',
      type: 'multiple_choice',
      options: ['Opción A', 'Opción B'],
      correctAnswer: 1,
    };

    const wrong = normalizeQuizQuestionForEval(q, 0, 0);
    expect(wrong.studentAnswer).toBe('Opción A');
    expect(wrong.correctAnswer).toBe('Opción B');
    expect(wrong.isObjectiveCorrect).toBe(false);
    expect(computeObjectiveQuizScore([wrong])).toBe(0);
  });

  it('normalizes true_false questions with boolean or Spanish string values', () => {
    const q = {
      question: 'El sol sale por el este',
      type: 'true_false',
      correctAnswer: true,
    };

    const right = normalizeQuizQuestionForEval(q, 'Verdadero', 0);
    expect(right.isObjectiveGradable).toBe(true);
    expect(right.isObjectiveCorrect).toBe(true);
    expect(computeObjectiveQuizScore([right])).toBe(100);
  });

  it('returns null objective score when any question is free_response', () => {
    const items = [
      normalizeQuizQuestionForEval(
        { question: 'Q1', type: 'multiple_choice', options: ['A', 'B'], correctAnswer: 0 },
        'A',
        0
      ),
      normalizeQuizQuestionForEval(
        { question: 'Q2', type: 'free_response', correctAnswer: 'Explicación libre' },
        'Mi análisis',
        1
      ),
    ];

    expect(computeObjectiveQuizScore(items)).toBeNull();
  });
});

