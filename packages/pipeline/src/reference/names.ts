const UPPERCASE_ACRONYMS = new Set([
  'NHS',
  'UK',
  'MSK',
  'ENT',
  'CIC',
  'LLP',
  'PLC',
  'LTD',
  'IVF',
  'MRI',
  'CT',
  'CDC',
  'OOH',
  'GP',
  'DMC',
  'SPA',
  'ME',
  'CF',
  'UCL',
  'UCLH',
  'NCL',
  'NEL',
  'NWL',
  'SEL',
  'SWL',
  'ADHD',
  'CAMHS',
  'EAC',
  'B&Q',
]);

const LOWERCASE_PARTICLES = new Set([
  'and',
  'of',
  'the',
  'in',
  'at',
  'on',
  'for',
  'with',
  'by',
  'to',
  'upon',
  'under',
  'over',
  'super',
  'du',
  'des',
  'de',
  'la',
  // Welsh & Scottish particles
  'y',
  'yr',
  'yn',
  'ar',
  'fach',
  'fawr',
  'ganol',
  'uchaf',
  'isaf',
  "a'",
  'na',
  'nam',
  'nan',
  'an',
]);

const SPECIAL_BRAND_CASINGS: Readonly<Record<string, string>> = {
  SPAMEDICA: 'SpaMedica',
  INHEALTH: 'InHealth',
  HEALTHHARMONIE: 'HealthHarmonie',
  OPTEGRA: 'Optegra',
  MEDIPRO: 'MediPro',
};

function capitalizeWord(word: string, isFirstOrLast: boolean): string {
  if (!word) return '';

  const cleanUpper = word.toUpperCase().replace(/^[^A-Z0-9]+|[^A-Z0-9]+$/g, '');

  // Brand name overrides
  if (SPECIAL_BRAND_CASINGS[cleanUpper]) {
    const brand = SPECIAL_BRAND_CASINGS[cleanUpper];
    return word.replace(new RegExp(cleanUpper, 'i'), brand);
  }

  // Acronyms
  if (UPPERCASE_ACRONYMS.has(cleanUpper)) {
    return word.replace(new RegExp(cleanUpper, 'i'), cleanUpper);
  }

  // Lowercase particles (only when not first or last word)
  if (!isFirstOrLast && LOWERCASE_PARTICLES.has(cleanUpper.toLowerCase())) {
    return word.toLowerCase();
  }

  // Handle Mc/Mac prefixes
  if (/^MC[A-Z]/i.test(word)) {
    return 'Mc' + word.charAt(2).toUpperCase() + word.slice(3).toLowerCase();
  }
  if (/^MAC[A-Z]/i.test(word) && word.length > 4) {
    return 'Mac' + word.charAt(3).toUpperCase() + word.slice(4).toLowerCase();
  }

  // Handle St / St.
  if (/^ST\.?$/i.test(cleanUpper)) {
    return word.startsWith('ST.') || word.startsWith('St.') ? 'St.' : 'St';
  }

  // Default title case
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/**
 * Converts uppercase or raw text names into clean display names.
 * Applies title-casing while respecting acronyms, prepositions, and name prefixes.
 */
export function toDisplayName(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';

  const trimmed = raw.trim();
  if (trimmed.length === 0) return '';

  // Split tokens by space while preserving hyphenated segments and delimiters
  const tokens = trimmed.split(/(\s+|[-/&()])/);

  // Identify meaningful word indices for first/last detection
  const wordIndices: number[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token && /[A-Za-z0-9]/.test(token)) {
      wordIndices.push(i);
    }
  }

  const firstWordIndex = wordIndices[0] ?? -1;
  const lastWordIndex = wordIndices[wordIndices.length - 1] ?? -1;

  const result = tokens.map((token, index) => {
    if (!token || !/[A-Za-z0-9]/.test(token)) {
      return token;
    }

    const isFirst = index === firstWordIndex;
    const isLast = index === lastWordIndex;

    // Handle O' prefix (e.g. O'Connor, O'Neill)
    if (/^[Oo]'[A-Za-z]/i.test(token)) {
      return "O'" + capitalizeWord(token.slice(2), isFirst || isLast);
    }

    // Check if token contains internal apostrophe (e.g. KING'S, QUEEN'S, BARTHOLOMEW'S)
    if (token.includes("'")) {
      const parts = token.split("'");
      return parts
        .map((part, pIdx) => (pIdx === 0 ? capitalizeWord(part, isFirst) : part.toLowerCase()))
        .join("'");
    }

    return capitalizeWord(token, isFirst || isLast);
  });

  return result.join('');
}
