/** Tests SM-2 (répétition espacée). */
import { describe, expect, it } from 'vitest';
import { newCard, schedule, retentionHint } from '@/services/study/srs';

describe('SM-2', () => {
  it('nouvelle carte : facilité 2.5, due aujourd’hui', () => {
    const c = newCard('2026-11-05');
    expect(c.ease).toBe(2.5);
    expect(c.due).toBe('2026-11-05');
    expect(c.reps).toBe(0);
  });

  it('première réussite → intervalle 1 jour (bien)', () => {
    const c = newCard('2026-11-05');
    const next = schedule(c, 4, '2026-11-05');
    expect(next.intervalDays).toBe(1);
    expect(next.due).toBe('2026-11-06');
    expect(next.reps).toBe(1);
  });

  it('facile accélère les intervalles', () => {
    let card = newCard('2026-11-05');
    card = schedule(card, 5, '2026-11-05');
    expect(card.intervalDays).toBe(2);
    card = schedule(card, 5, card.due);
    expect(card.intervalDays).toBe(6);
    card = schedule(card, 5, card.due);
    expect(card.intervalDays).toBeGreaterThan(10);
  });

  it('échec : due aujourd’hui, facilité réduite, répétitions à zéro', () => {
    let card = newCard('2026-11-05');
    card = schedule(card, 4, '2026-11-05');
    card = schedule(card, 4, card.due);
    const after = schedule(card, 0, card.due);
    expect(after.due).toBe(card.due);
    expect(after.reps).toBe(0);
    expect(after.lapses).toBe(1);
    expect(after.ease).toBeLessThan(card.ease);
  });

  it('la facilité reste bornée', () => {
    let card = newCard('2026-11-05');
    for (let i = 0; i < 30; i++) card = schedule(card, 5, card.due);
    expect(card.ease).toBeLessThanOrEqual(2.8);
    let bad = newCard('2026-11-05');
    for (let i = 0; i < 30; i++) bad = schedule(bad, 0, bad.due);
    expect(bad.ease).toBeGreaterThanOrEqual(1.3);
  });

  it('difficile ralentit la progression', () => {
    const easy = schedule(schedule(newCard('2026-11-05'), 5, '2026-11-05'), 5, '2026-11-07');
    const hard = schedule(schedule(newCard('2026-11-05'), 3, '2026-11-05'), 3, '2026-11-06');
    expect(easy.intervalDays).toBeGreaterThan(hard.intervalDays);
    expect(retentionHint(easy)).toBeGreaterThan(retentionHint(hard));
  });
});
