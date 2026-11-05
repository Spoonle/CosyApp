/** Tests de la recherche floue de la palette. */
import { describe, expect, it } from 'vitest';
import { fuzzyScore, normalize } from '@/services/fuzzy';

describe('recherche floue', () => {
  it('normalise les accents', () => {
    expect(normalize('Étérnité')).toBe('eternite');
  });

  it('requête vide : tout correspond', () => {
    expect(fuzzyScore('', 'n’importe quoi')).toBeGreaterThan(0);
  });

  it('sous-séquence : ordre respecté', () => {
    expect(fuzzyScore('ocr', 'Ouvrir — Calendrier')).toBeGreaterThan(0);
    expect(fuzzyScore('rco', 'Ouvrir — Calendrier')).toBe(0);
  });

  it('le début de mot marque plus que des lettres éparpillées', () => {
    const prefix = fuzzyScore('tâc', 'Tâches');
    const scattered = fuzzyScore('tâc', 'matin côte');
    expect(prefix).toBeGreaterThan(scattered);
  });

  it('insensible à la casse et aux accents', () => {
    expect(fuzzyScore('accueil', 'Aujourd’hui')).toBe(0);
    expect(fuzzyScore('aujourdhui', 'Aujourd’hui')).toBeGreaterThan(0);
  });

  it('les cibles courtes sont préférées', () => {
    const short = fuzzyScore('note', 'Note');
    const long = fuzzyScore('note', 'Notes de formation avancée');
    expect(short).toBeGreaterThan(long);
  });
});
