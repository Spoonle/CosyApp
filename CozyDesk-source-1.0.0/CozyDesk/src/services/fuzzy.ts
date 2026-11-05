/** Recherche floue avec score (sous-séquences + bonus de préfixe). */

/**
 * Retourne un score > 0 si toutes les lettres de `query` apparaissent
 * dans l'ordre dans `target`, 0 sinon. Les accents sont ignorés.
 */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function fuzzyScore(query: string, target: string): number {
  const q = normalize(query).trim();
  const t = normalize(target);
  if (q.length === 0) return 1;
  if (q.length > t.length) return 0;

  let score = 0;
  let ti = 0;
  let streak = 0;
  for (let qi = 0; qi < q.length; qi++) {
    const ch = q[qi];
    if (ch === ' ') continue;
    let found = -1;
    for (let i = ti; i < t.length; i++) {
      if (t[i] === ch) {
        found = i;
        break;
      }
    }
    if (found === -1) return 0;
    streak = found === ti ? streak + 1 : 0;
    score += 10;
    score += streak * 6; // lettres consécutives
    if (found === 0) score += 14; // correspondance au début
    else if (t[found - 1] === ' ') score += 8; // début de mot
    ti = found + 1;
  }
  // Préférence pour les cibles courtes
  score -= t.length * 0.4;
  return Math.max(1, Math.round(score));
}
