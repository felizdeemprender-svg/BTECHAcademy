/**
 * text-splitter.ts
 * Funciones puras de segmentación cinética y subtitulado dinámico.
 * Libres de dependencias de Node.js (child_process, fs) para uso seguro
 * tanto en Node/FFmpeg como en componentes React Client (Previsualizador).
 */

export interface TextBlockPhase {
  text: string;
  start: number;
  end: number;
  isSecondBlock?: boolean;
  blockIndex?: number;
}

/**
 * Divide una frase principal en 1, 2 o 3 rondas cinéticas según la duración en segundos.
 */
export function splitKineticPhrase(text: string, duration: number): TextBlockPhase[] {
  const clean = (text || '').trim();
  if (!clean) return [];

  // 1. Escenas cortas (< 2.8s): 1 ronda única para evitar ráfagas ilegibles
  if (duration < 2.8) {
    return [{ text: clean, start: 0, end: duration, blockIndex: 0 }];
  }

  // 2. Escenas moderadas a largas (> 6.0s): Particionar en hasta 3 bloques si el texto lo amerita
  if (duration > 6.0) {
    const rawParts = clean.split(/\r?\n|\\n/).map(p => p.trim()).filter(Boolean);
    if (rawParts.length >= 3) {
      const totalChars = rawParts.reduce((acc, p) => acc + p.length, 0);
      let accTime = 0;
      const result: TextBlockPhase[] = [];
      for (let i = 0; i < rawParts.length; i++) {
        const segRatio = rawParts[i].length / totalChars;
        const segDur = Math.max(1.2, duration * segRatio);
        const startTime = accTime;
        const endTime = i === rawParts.length - 1 ? duration : Math.min(duration - 1.0, Math.round((accTime + segDur) * 100) / 100);
        accTime = endTime;
        result.push({ text: rawParts[i], start: startTime, end: endTime, isSecondBlock: i > 0, blockIndex: i });
      }
      return result;
    }
  }

  // 3. Regla estándar de 2 bloques (2.8s a 6.0s o fallback de >6.0s):
  // 3a. Separación explícita por salto de línea (\n o \\n)
  if (clean.includes('\n') || clean.includes('\\n')) {
    const parts = clean.split(/\r?\n|\\n/).map(p => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const part1 = parts[0];
      const part2 = parts.slice(1).join(' ');
      const words1 = part1.split(/\s+/).length;
      const words2 = part2.split(/\s+/).length;
      const ratio = words1 / (words1 + words2);
      const splitTime = Math.round(Math.max(1.2, Math.min(duration - 1.2, duration * Math.max(0.35, Math.min(0.65, ratio)))) * 100) / 100;
      return [
        { text: part1, start: 0, end: splitTime, blockIndex: 0 },
        { text: part2, start: splitTime, end: duration, isSecondBlock: true, blockIndex: 1 }
      ];
    }
  }

  // 3b. Separación por 2 pares de asteriscos (*word1* ... *word2*)
  const asteriskMatches = [...clean.matchAll(/\*([^*]+)\*/g)];
  if (asteriskMatches.length >= 2) {
    const firstEnd = asteriskMatches[0].index! + asteriskMatches[0][0].length;
    const secondStart = asteriskMatches[1].index!;
    const inBetween = clean.substring(firstEnd, secondStart);
    const punctMatch = inBetween.search(/[.,!?:;\-\–]/);
    let splitCharIdx: number;
    if (punctMatch !== -1) {
      splitCharIdx = firstEnd + punctMatch + 1;
    } else {
      const spaceMatch = inBetween.search(/\s+/);
      splitCharIdx = spaceMatch !== -1 ? firstEnd + spaceMatch + 1 : Math.round((firstEnd + secondStart) / 2);
    }
    const part1 = clean.substring(0, splitCharIdx).trim();
    const part2 = clean.substring(splitCharIdx).trim();
    if (part1 && part2) {
      const words1 = part1.split(/\s+/).length;
      const words2 = part2.split(/\s+/).length;
      const ratio = words1 / (words1 + words2);
      const splitTime = Math.round(Math.max(1.2, Math.min(duration - 1.2, duration * Math.max(0.35, Math.min(0.65, ratio)))) * 100) / 100;
      return [
        { text: part1, start: 0, end: splitTime, blockIndex: 0 },
        { text: part2, start: splitTime, end: duration, isSecondBlock: true, blockIndex: 1 }
      ];
    }
  }

  // 3c. Ponderación silábica / de palabras habladas del TTS
  const words = clean.split(/\s+/);
  if (words.length < 2) {
    return [{ text: clean, start: 0, end: duration, blockIndex: 0 }];
  }

  let midWord = Math.ceil(words.length / 2);
  const minIdx = Math.max(1, Math.floor(words.length * 0.25));
  const maxIdx = Math.min(words.length - 1, Math.ceil(words.length * 0.75));

  for (let i = minIdx; i <= maxIdx; i++) {
    const w = words[i - 1];
    if (/[.,!?:;]$/.test(w)) {
      midWord = i;
      break;
    }
  }

  // Asegurar que no se rompa un énfasis *palabra* al medio
  const textBefore = words.slice(0, midWord).join(' ');
  const asteriskCount = (textBefore.match(/\*/g) || []).length;
  if (asteriskCount % 2 !== 0) {
    const nextClose = words.findIndex((w, idx) => idx >= midWord && w.includes('*'));
    if (nextClose !== -1 && nextClose < words.length) {
      midWord = nextClose + 1;
    } else {
      const prevOpen = words.slice(0, midWord).map(w => w.includes('*')).lastIndexOf(true);
      if (prevOpen > 0) midWord = prevOpen;
    }
  }

  if (midWord <= 0 || midWord >= words.length) {
    return [{ text: clean, start: 0, end: duration, blockIndex: 0 }];
  }

  const part1 = words.slice(0, midWord).join(' ').trim();
  const part2 = words.slice(midWord).join(' ').trim();

  const words1 = part1.split(/\s+/).length;
  const words2 = part2.split(/\s+/).length;
  const wordRatio = words1 / (words1 + words2);
  const splitTime = Math.round(Math.max(1.2, Math.min(duration - 1.2, duration * Math.max(0.35, Math.min(0.65, wordRatio)))) * 100) / 100;

  return [
    { text: part1, start: 0, end: splitTime, blockIndex: 0 },
    { text: part2, start: splitTime, end: duration, isSecondBlock: true, blockIndex: 1 }
  ];
}

/**
 * Divide un subtítulo en rondas dinámicas sincronizadas con los bloques del título.
 */
export function splitSubtitlePhases(
  subtitle: string,
  duration: number,
  titleBlocks?: { start: number; end: number }[]
): TextBlockPhase[] {
  const clean = (subtitle || '').trim();
  if (!clean) return [];

  // 1. Escenas ultra cortas (< 2.8s): 1 sola ronda fija
  if (duration < 2.8) {
    return [{ text: clean, start: 0, end: duration }];
  }

  const hasNewline = clean.includes('\n') || clean.includes('\\n');
  const words = clean.split(/\s+/).filter(Boolean);

  // 2. Escenas largas (> 6.0s) con 3 bloques de título
  if (duration > 6.0 && titleBlocks && titleBlocks.length >= 3) {
    if (hasNewline) {
      const parts = clean.split(/\r?\n|\\n/).map(p => p.trim()).filter(Boolean);
      if (parts.length >= 3) {
        return parts.slice(0, titleBlocks.length).map((p, idx) => ({
          text: p,
          start: titleBlocks[idx].start,
          end: titleBlocks[idx].end,
          isSecondBlock: idx > 0,
          blockIndex: idx
        }));
      }
    } else if (words.length >= 6) {
      const step = Math.ceil(words.length / 3);
      const p1 = words.slice(0, step).join(' ').trim();
      const p2 = words.slice(step, step * 2).join(' ').trim();
      const p3 = words.slice(step * 2).join(' ').trim();
      if (p1 && p2 && p3) {
        return [
          { text: p1, start: titleBlocks[0].start, end: titleBlocks[0].end, blockIndex: 0 },
          { text: p2, start: titleBlocks[1].start, end: titleBlocks[1].end, isSecondBlock: true, blockIndex: 1 },
          { text: p3, start: titleBlocks[2].start, end: titleBlocks[titleBlocks.length - 1].end, isSecondBlock: true, blockIndex: 2 }
        ];
      }
    }
  }

  // 3. Escenas estándar (2.8s a 6.0s): 2 bloques dinámicos sincronizados
  if (hasNewline) {
    const parts = clean.split(/\r?\n|\\n/).map(p => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      if (titleBlocks && titleBlocks.length >= 2) {
        return [
          { text: parts[0], start: titleBlocks[0].start, end: titleBlocks[0].end, blockIndex: 0 },
          { text: parts.slice(1).join(' '), start: titleBlocks[1].start, end: titleBlocks[titleBlocks.length - 1].end, isSecondBlock: true, blockIndex: 1 }
        ];
      }
      const splitTime = Math.round(Math.max(1.2, Math.min(duration - 1.2, duration * 0.5)) * 100) / 100;
      return [
        { text: parts[0], start: 0, end: splitTime, blockIndex: 0 },
        { text: parts.slice(1).join(' '), start: splitTime, end: duration, isSecondBlock: true, blockIndex: 1 }
      ];
    }
  }

  // Si no tiene salto de línea pero tiene puntuación natural (, ; . -) y duración suficiente
  const punctMatch = clean.search(/[,;.\-–]\s+/);
  if (punctMatch !== -1 && words.length >= 4) {
    const splitIdx = punctMatch + 1;
    const p1 = clean.substring(0, splitIdx).trim();
    const p2 = clean.substring(splitIdx).trim();
    if (p1 && p2) {
      if (titleBlocks && titleBlocks.length >= 2) {
        return [
          { text: p1, start: titleBlocks[0].start, end: titleBlocks[0].end, blockIndex: 0 },
          { text: p2, start: titleBlocks[1].start, end: titleBlocks[titleBlocks.length - 1].end, isSecondBlock: true, blockIndex: 1 }
        ];
      }
      const splitTime = Math.round(Math.max(1.2, Math.min(duration - 1.2, duration * 0.5)) * 100) / 100;
      return [
        { text: p1, start: 0, end: splitTime, blockIndex: 0 },
        { text: p2, start: splitTime, end: duration, isSecondBlock: true, blockIndex: 1 }
      ];
    }
  }

  // Si no tiene salto de línea pero el título rota en 2 bloques y hay al menos 3 palabras
  if (titleBlocks && titleBlocks.length >= 2 && words.length >= 3) {
    let midIdx = Math.ceil(words.length * (titleBlocks[0].end / duration));
    if (midIdx <= 0) midIdx = 1;
    if (midIdx >= words.length) midIdx = words.length - 1;
    const p1 = words.slice(0, midIdx).join(' ').trim();
    const p2 = words.slice(midIdx).join(' ').trim();
    if (p1 && p2) {
      return [
        { text: p1, start: titleBlocks[0].start, end: titleBlocks[0].end, blockIndex: 0 },
        { text: p2, start: titleBlocks[1].start, end: titleBlocks[titleBlocks.length - 1].end, isSecondBlock: true, blockIndex: 1 }
      ];
    }
  }

  return [{ text: clean, start: 0, end: duration, blockIndex: 0 }];
}

