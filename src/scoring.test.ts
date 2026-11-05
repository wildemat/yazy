import { describe, expect, it } from 'vitest';
import { options, rawScore, totals, earnsYahtzeeBonus } from './scoring';

describe('rawScore', () => {
  it('scores categories', () => {
    expect(rawScore('threes', [3, 3, 1, 3, 6])).toBe(9);
    expect(rawScore('threeKind', [3, 3, 1, 3, 6])).toBe(16);
    expect(rawScore('fourKind', [3, 3, 1, 3, 6])).toBe(0);
    expect(rawScore('fullHouse', [2, 2, 5, 5, 5])).toBe(25);
    expect(rawScore('fullHouse', [5, 5, 5, 5, 5])).toBe(0);
    expect(rawScore('smallStraight', [1, 3, 2, 4, 4])).toBe(30);
    expect(rawScore('smallStraight', [1, 2, 3, 5, 6])).toBe(0);
    expect(rawScore('largeStraight', [2, 3, 4, 5, 6])).toBe(40);
    expect(rawScore('yahtzee', [4, 4, 4, 4, 4])).toBe(50);
    expect(rawScore('chance', [1, 2, 3, 4, 5])).toBe(15);
  });
});

describe('joker rules', () => {
  const dice = [4, 4, 4, 4, 4];
  it('forces matching upper box when open', () => {
    expect(options({ yahtzee: 50 }, dice)).toEqual({ fours: 20 });
  });
  it('allows lower boxes at full value when upper filled', () => {
    const o = options({ yahtzee: 50, fours: 12 }, dice);
    expect(o.fullHouse).toBe(25);
    expect(o.largeStraight).toBe(40);
    expect(o.ones).toBeUndefined();
  });
  it('bonus only if yahtzee box is 50', () => {
    expect(earnsYahtzeeBonus({ yahtzee: 50 }, dice)).toBe(true);
    expect(earnsYahtzeeBonus({ yahtzee: 0 }, dice)).toBe(false);
  });
});

it('totals with upper bonus', () => {
  const t = totals({ ones: 3, twos: 6, threes: 9, fours: 12, fives: 15, sixes: 18, chance: 20 }, 1);
  expect(t.upperBonus).toBe(35);
  expect(t.grand).toBe(63 + 35 + 20 + 100);
});
