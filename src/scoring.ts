export const UPPER = ['ones', 'twos', 'threes', 'fours', 'fives', 'sixes'] as const;
export const LOWER = [
  'threeKind',
  'fourKind',
  'fullHouse',
  'smallStraight',
  'largeStraight',
  'yahtzee',
  'chance',
] as const;

export type UpperCat = (typeof UPPER)[number];
export type LowerCat = (typeof LOWER)[number];
export type Category = UpperCat | LowerCat;
export type Scorecard = Partial<Record<Category, number>>;

export const LABELS: Record<Category, string> = {
  ones: 'Ones',
  twos: 'Twos',
  threes: 'Threes',
  fours: 'Fours',
  fives: 'Fives',
  sixes: 'Sixes',
  threeKind: '3 of a Kind',
  fourKind: '4 of a Kind',
  fullHouse: 'Full House',
  smallStraight: 'Sm. Straight',
  largeStraight: 'Lg. Straight',
  yahtzee: 'Yahtzee',
  chance: 'Chance',
};

export const HINTS: Record<Category, string> = {
  ones: 'Sum of 1s',
  twos: 'Sum of 2s',
  threes: 'Sum of 3s',
  fours: 'Sum of 4s',
  fives: 'Sum of 5s',
  sixes: 'Sum of 6s',
  threeKind: 'Sum of all dice',
  fourKind: 'Sum of all dice',
  fullHouse: '25',
  smallStraight: '30',
  largeStraight: '40',
  yahtzee: '50',
  chance: 'Sum of all dice',
};

export const ALL_CATEGORIES: Category[] = [...UPPER, ...LOWER];
export const UPPER_BONUS_THRESHOLD = 63;
export const UPPER_BONUS = 35;
export const YAHTZEE_BONUS = 100;

const sum = (d: number[]) => d.reduce((a, b) => a + b, 0);

function counts(dice: number[]): number[] {
  const c = [0, 0, 0, 0, 0, 0, 0];
  dice.forEach((v) => c[v]++);
  return c;
}

function hasRun(dice: number[], len: number): boolean {
  const set = new Set(dice);
  for (let start = 1; start + len - 1 <= 6; start++) {
    let ok = true;
    for (let v = start; v < start + len; v++) if (!set.has(v)) ok = false;
    if (ok) return true;
  }
  return false;
}

export const isYahtzee = (dice: number[]) => dice.every((v) => v === dice[0]);

/** Raw score for a category, ignoring joker rules. */
export function rawScore(cat: Category, dice: number[]): number {
  const c = counts(dice);
  const upperIdx = UPPER.indexOf(cat as UpperCat);
  if (upperIdx >= 0) return c[upperIdx + 1] * (upperIdx + 1);
  switch (cat) {
    case 'threeKind':
      return c.some((n) => n >= 3) ? sum(dice) : 0;
    case 'fourKind':
      return c.some((n) => n >= 4) ? sum(dice) : 0;
    case 'fullHouse':
      return c.includes(3) && c.includes(2) ? 25 : 0;
    case 'smallStraight':
      return hasRun(dice, 4) ? 30 : 0;
    case 'largeStraight':
      return hasRun(dice, 5) ? 40 : 0;
    case 'yahtzee':
      return isYahtzee(dice) ? 50 : 0;
    case 'chance':
      return sum(dice);
  }
  return 0;
}

/**
 * Returns the categories a player may score in, plus the score each would get.
 * Implements official forced-joker rules when a Yahtzee is rolled and the Yahtzee box is already filled.
 */
export function options(card: Scorecard, dice: number[]): Partial<Record<Category, number>> {
  const open = ALL_CATEGORIES.filter((c) => card[c] === undefined);
  const result: Partial<Record<Category, number>> = {};
  const joker = isYahtzee(dice) && card.yahtzee !== undefined;

  if (!joker) {
    open.forEach((c) => (result[c] = rawScore(c, dice)));
    return result;
  }

  const upperCat = UPPER[dice[0] - 1];
  if (card[upperCat] === undefined) {
    result[upperCat] = rawScore(upperCat, dice);
    return result;
  }
  const openLower = open.filter((c) => (LOWER as readonly string[]).includes(c)) as LowerCat[];
  if (openLower.length) {
    openLower.forEach((c) => {
      if (c === 'fullHouse') result[c] = 25;
      else if (c === 'smallStraight') result[c] = 30;
      else if (c === 'largeStraight') result[c] = 40;
      else result[c] = rawScore(c, dice);
    });
    return result;
  }
  open.forEach((c) => (result[c] = 0));
  return result;
}

/** Whether scoring these dice earns the 100-point Yahtzee bonus. */
export const earnsYahtzeeBonus = (card: Scorecard, dice: number[]) =>
  isYahtzee(dice) && card.yahtzee === 50;

export interface Totals {
  upperSubtotal: number;
  upperBonus: number;
  upperTotal: number;
  lowerSubtotal: number;
  yahtzeeBonus: number;
  lowerTotal: number;
  grand: number;
}

export function totals(card: Scorecard, yahtzeeBonusCount: number): Totals {
  const upperSubtotal = sum(UPPER.map((c) => card[c] ?? 0));
  const upperBonus = upperSubtotal >= UPPER_BONUS_THRESHOLD ? UPPER_BONUS : 0;
  const upperTotal = upperSubtotal + upperBonus;
  const lowerSubtotal = sum(LOWER.map((c) => card[c] ?? 0));
  const yahtzeeBonus = yahtzeeBonusCount * YAHTZEE_BONUS;
  const lowerTotal = lowerSubtotal + yahtzeeBonus;
  return {
    upperSubtotal,
    upperBonus,
    upperTotal,
    lowerSubtotal,
    yahtzeeBonus,
    lowerTotal,
    grand: upperTotal + lowerTotal,
  };
}
