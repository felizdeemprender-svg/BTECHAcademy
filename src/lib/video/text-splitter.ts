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
 * Divide una frase principal en 1, 2 o 3 rondas cinéticas según la duración en segundos y delimitadores explícitos.
 */
export function splitKineticPhrase(text: string, duration: number): TextBlockPhase[] {
  const clean = (text || '').trim();
  if (!clean) return [];

  // 1. Escenas cortas (< 2.8s): 1 ronda única para evitar ráfagas ilegibles
  if (duration < 2.8) {
    return [{ text: clean, start: 0, end: duration, blockIndex: 0 }];
  }

  // Delimitador explícito: salto de línea (\n, \\n) o barra vertical (|)
  const hasExplicitDelimiter = clean.includes('\n') || clean.includes('\\n') || clean.includes('|');
  const delimiterRegex = /\r?\n|\\n|\|/;

  // 2. Escenas moderadas a largas (> 6.0s): Particionar en hasta 3 bloques si viene delimitador explícito
  if (duration > 6.0 && hasExplicitDelimiter) {
    const rawParts = clean.split(delimiterRegex).map(p => p.trim()).filter(Boolean);
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

  // 3a. Separación explícita por delimitador (\n, \\n o |)
  if (hasExplicitDelimiter) {
    const parts = clean.split(delimiterRegex).map(p => p.trim()).filter(Boolean);
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

  // 3b. Separación por 2 pares de asteriscos (*word1* ... *word2*) SOLO si hay al menos 5 palabras
  const words = clean.split(/\s+/).filter(Boolean);
  const asteriskMatches = [...clean.matchAll(/\*([^*]+)\*/g)];
  if (asteriskMatches.length >= 2 && words.length >= 5) {
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
    if (part1 && part2 && part1.split(/\s+/).length >= 2 && part2.split(/\s+/).length >= 2) {
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

  // 3c. Sin delimitador explícito:
  // Si la frase no tiene delimitador explícito y tiene pocas palabras (<= 5 palabras, ej: "¿NEGOCIO *FRENADO*?"),
  // NUNCA debe cortarse en dos mitades porque destruye el sentido gramatical de la frase.
  if (words.length <= 5) {
    return [{ text: clean, start: 0, end: duration, blockIndex: 0 }];
  }

  // Para frases largas (> 5 palabras) sin delimitador:
  // Solo se divide si tiene puntuación natural clara o si es suficientemente larga (>= 7 palabras)
  let midWord = Math.ceil(words.length / 2);
  const minIdx = Math.max(2, Math.floor(words.length * 0.3));
  const maxIdx = Math.min(words.length - 2, Math.ceil(words.length * 0.7));

  let hasPunctSplit = false;
  for (let i = minIdx; i <= maxIdx; i++) {
    const w = words[i - 1];
    if (/[.,!?:;\-\–]$/.test(w)) {
      midWord = i;
      hasPunctSplit = true;
      break;
    }
  }

  // Si no tiene puntuación natural y no llega a 7 palabras, mantener como 1 bloque
  if (!hasPunctSplit && words.length < 7) {
    return [{ text: clean, start: 0, end: duration, blockIndex: 0 }];
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

  if (midWord < 2 || midWord > words.length - 2) {
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
    return [{ text: clean, start: 0, end: duration, blockIndex: 0 }];
  }

  const hasDelimiter = clean.includes('\n') || clean.includes('\\n') || clean.includes('|');
  const delimiterRegex = /\r?\n|\\n|\|/;
  const words = clean.split(/\s+/).filter(Boolean);

  // 2. Delimitador explícito en subtítulo (\n, \\n, |):
  // Si el autor o la IA colocó un delimitador explícito, se respeta siempre.
  if (hasDelimiter) {
    const parts = clean.split(delimiterRegex).map(p => p.trim()).filter(Boolean);
    if (duration > 6.0 && titleBlocks && titleBlocks.length >= 3 && parts.length >= 3) {
      return parts.slice(0, titleBlocks.length).map((p, idx) => ({
        text: p,
        start: titleBlocks[idx].start,
        end: titleBlocks[idx].end,
        isSecondBlock: idx > 0,
        blockIndex: idx
      }));
    }
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

  // 3. Sin delimitador explícito:
  // Si el título es de 1 sola ronda (no rota), el subtítulo tampoco debe dividirse jamás.
  if (!titleBlocks || titleBlocks.length <= 1) {
    return [{ text: clean, start: 0, end: duration, blockIndex: 0 }];
  }

  // Si no tiene delimitador, solo dividir si tiene puntuación natural (, ; . -) y ambas partes tienen al menos 2 palabras
  const punctMatch = clean.search(/[,;.\-–]\s+/);
  if (punctMatch !== -1 && words.length >= 6) {
    const splitIdx = punctMatch + 1;
    const p1 = clean.substring(0, splitIdx).trim();
    const p2 = clean.substring(splitIdx).trim();
    if (p1 && p2 && p1.split(/\s+/).length >= 2 && p2.split(/\s+/).length >= 2) {
      if (titleBlocks && titleBlocks.length >= 2) {
        return [
          { text: p1, start: titleBlocks[0].start, end: titleBlocks[0].end, blockIndex: 0 },
          { text: p2, start: titleBlocks[1].start, end: titleBlocks[1].end, isSecondBlock: true, blockIndex: 1 }
        ];
      }
      const splitTime = Math.round(Math.max(1.2, Math.min(duration - 1.2, duration * 0.5)) * 100) / 100;
      return [
        { text: p1, start: 0, end: splitTime, blockIndex: 0 },
        { text: p2, start: splitTime, end: duration, isSecondBlock: true, blockIndex: 1 }
      ];
    }
  }

  // Si no tiene delimitador y no tiene puntuación natural (ej: "Necesitás impulsar tu red"),
  // NO cortar arbitrariamente palabras en dos mitades sin sentido.
  // Permanecer como 1 sola frase continua para toda la escena.
  return [{ text: clean, start: 0, end: duration, blockIndex: 0 }];
}
