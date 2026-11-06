import { useEffect, useState } from 'react';
import {
  ALL_CATEGORIES,
  Category,
  HINTS,
  LABELS,
  LOWER,
  Scorecard,
  UPPER,
  UPPER_BONUS_THRESHOLD,
  earnsYahtzeeBonus,
  options,
  totals,
} from './scoring';

interface Player {
  name: string;
  card: Scorecard;
  yahtzeeBonuses: number;
}

interface GameState {
  players: [Player, Player];
  current: 0 | 1;
  dice: number[];
  held: boolean[];
  rollsLeft: number;
}

const STORAGE_KEY = 'yazy-game-v1';
const ROLLS_PER_TURN = 3;

const newPlayer = (name: string): Player => ({ name, card: {}, yahtzeeBonuses: 0 });

const freshTurn = () => ({
  dice: [1, 1, 1, 1, 1],
  held: [false, false, false, false, false],
  rollsLeft: ROLLS_PER_TURN,
});

const newGame = (names: [string, string] = ['Player 1', 'Player 2']): GameState => ({
  players: [newPlayer(names[0]), newPlayer(names[1])],
  current: 0,
  ...freshTurn(),
});

function loadGame(): GameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as GameState;
  } catch {
    /* ignore corrupt storage */
  }
  return newGame();
}

const rollDie = () => Math.floor(Math.random() * 6) + 1;

const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function Die(props: {
  value: number;
  held: boolean;
  blank: boolean;
  rolling: boolean;
  disabled: boolean;
  index: number;
  onClick: () => void;
}) {
  const { value, held, blank, rolling, disabled, index, onClick } = props;
  return (
    <button
      className={`die ${held ? 'held' : ''} ${rolling && !held ? 'rolling' : ''} ${blank ? 'blank' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={blank ? `Die ${index + 1}` : `Die ${index + 1}: ${value}${held ? ', held' : ''}`}
      aria-pressed={held}
    >
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className={`pip ${!blank && PIPS[value].includes(i) ? 'on' : ''}`} />
      ))}
      {held && <span className="held-tag">HELD</span>}
    </button>
  );
}

export default function App() {
  const [game, setGame] = useState<GameState>(loadGame);
  const [rolling, setRolling] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
  }, [game]);

  const { players, current, dice, held, rollsLeft } = game;
  const player = players[current];
  const hasRolled = rollsLeft < ROLLS_PER_TURN;
  const gameOver = players.every((p) => ALL_CATEGORIES.every((c) => p.card[c] !== undefined));
  const opts = hasRolled && !gameOver ? options(player.card, dice) : {};
  const allTotals = players.map((p) => totals(p.card, p.yahtzeeBonuses));
  const round = Math.min(
    13,
    Math.min(...players.map((p) => Object.keys(p.card).length)) + 1,
  );

  const roll = () => {
    if (rollsLeft === 0 || rolling || gameOver) return;
    setRolling(true);
    setTimeout(() => {
      setGame((g) => ({
        ...g,
        dice: g.dice.map((v, i) => (g.held[i] ? v : rollDie())),
        rollsLeft: g.rollsLeft - 1,
      }));
      setRolling(false);
    }, 450);
  };

  const toggleHold = (i: number) => {
    if (!hasRolled || rollsLeft === 0 || rolling) return;
    setGame((g) => ({ ...g, held: g.held.map((h, j) => (j === i ? !h : h)) }));
  };

  const score = (cat: Category) => {
    if (opts[cat] === undefined || rolling) return;
    setGame((g) => {
      const p = g.players[g.current];
      const updated: Player = {
        ...p,
        card: { ...p.card, [cat]: opts[cat] },
        yahtzeeBonuses: p.yahtzeeBonuses + (earnsYahtzeeBonus(p.card, g.dice) ? 1 : 0),
      };
      const nextPlayers = [...g.players] as [Player, Player];
      nextPlayers[g.current] = updated;
      return {
        players: nextPlayers,
        current: g.current === 0 ? 1 : 0,
        ...freshTurn(),
      };
    });
  };

  const rename = (idx: 0 | 1, name: string) => {
    setGame((g) => {
      const nextPlayers = [...g.players] as [Player, Player];
      nextPlayers[idx] = { ...nextPlayers[idx], name };
      return { ...g, players: nextPlayers };
    });
  };

  const restart = () => {
    if (gameOver || confirm('Start a new game? Current scores will be lost.')) {
      setGame(newGame([players[0].name, players[1].name]));
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.code === 'Space' || e.key === 'r') {
        e.preventDefault();
        roll();
      } else if (/^[1-5]$/.test(e.key)) {
        toggleHold(Number(e.key) - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const renderCell = (pIdx: 0 | 1, cat: Category) => {
    const value = players[pIdx].card[cat];
    if (value !== undefined) {
      return <td className={`score filled ${value === 0 ? 'zero' : ''}`}>{value}</td>;
    }
    const preview = pIdx === current ? opts[cat] : undefined;
    if (preview !== undefined) {
      return (
        <td className="score option">
          <button onClick={() => score(cat)} className={preview === 0 ? 'zero' : ''}>
            {preview}
          </button>
        </td>
      );
    }
    return <td className={`score ${pIdx === current && !gameOver ? 'active-col' : ''}`} />;
  };

  const totalRow = (label: string, key: keyof (typeof allTotals)[0], cls = '') => (
    <tr className={`total ${cls}`}>
      <th scope="row">{label}</th>
      {allTotals.map((t, i) => (
        <td key={i} className="score">
          {t[key]}
        </td>
      ))}
    </tr>
  );

  const winner =
    gameOver &&
    (allTotals[0].grand === allTotals[1].grand
      ? null
      : allTotals[0].grand > allTotals[1].grand
        ? players[0]
        : players[1]);

  const status = gameOver
    ? 'Game over'
    : rolling
      ? 'Rolling…'
      : !hasRolled
        ? `${player.name}, roll the dice`
        : rollsLeft === 0
          ? `${player.name}, choose a box to score`
          : `${player.name}: tap dice to hold, roll again, or pick a box`;

  return (
    <div className="app">
      <header>
        <h1>Yazy</h1>
        <div className="round">Round {round} / 13</div>
        <button className="secondary" onClick={restart}>
          New game
        </button>
      </header>

      <main>
        <section className="card">
          <table>
            <thead>
              <tr>
                <th className="cat-head">Category</th>
                {players.map((p, i) => (
                  <th key={i} className={`player-head p${i} ${i === current && !gameOver ? 'active' : ''}`}>
                    <input
                      value={p.name}
                      onChange={(e) => rename(i as 0 | 1, e.target.value)}
                      aria-label={`Player ${i + 1} name`}
                      maxLength={16}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="section">
                <th colSpan={3}>Upper section</th>
              </tr>
              {UPPER.map((cat) => (
                <tr key={cat}>
                  <th scope="row">
                    {LABELS[cat]}
                    <small>{HINTS[cat]}</small>
                  </th>
                  {renderCell(0, cat)}
                  {renderCell(1, cat)}
                </tr>
              ))}
              {totalRow('Subtotal', 'upperSubtotal')}
              <tr className="total">
                <th scope="row">
                  Bonus<small>35 if subtotal ≥ {UPPER_BONUS_THRESHOLD}</small>
                </th>
                {allTotals.map((t, i) => (
                  <td key={i} className="score">
                    {t.upperBonus || (
                      <span className="need">
                        {t.upperSubtotal < UPPER_BONUS_THRESHOLD
                          ? `need ${UPPER_BONUS_THRESHOLD - t.upperSubtotal}`
                          : ''}
                      </span>
                    )}
                  </td>
                ))}
              </tr>
              {totalRow('Upper total', 'upperTotal', 'strong')}

              <tr className="section">
                <th colSpan={3}>Lower section</th>
              </tr>
              {LOWER.map((cat) => (
                <tr key={cat}>
                  <th scope="row">
                    {LABELS[cat]}
                    <small>{HINTS[cat]}</small>
                  </th>
                  {renderCell(0, cat)}
                  {renderCell(1, cat)}
                </tr>
              ))}
              <tr className="total">
                <th scope="row">
                  Yahtzee bonus<small>100 each</small>
                </th>
                {allTotals.map((t, i) => (
                  <td key={i} className="score">
                    {t.yahtzeeBonus}
                  </td>
                ))}
              </tr>
              {totalRow('Lower total', 'lowerTotal', 'strong')}
              {totalRow('Grand total', 'grand', 'grand')}
            </tbody>
          </table>
        </section>
        <section className={`tray p${current}`}>
          <div className="turn-banner">
            {!gameOver && <span className="turn-name">{player.name}'s turn</span>}
            <span className="status">{status}</span>
          </div>
          <div className="dice">
            {dice.map((v, i) => (
              <Die
                key={i}
                index={i}
                value={v}
                held={held[i]}
                blank={!hasRolled && !rolling}
                rolling={rolling}
                disabled={!hasRolled || rollsLeft === 0 || rolling || gameOver}
                onClick={() => toggleHold(i)}
              />
            ))}
          </div>
          <button
            className="roll"
            onClick={roll}
            disabled={rollsLeft === 0 || rolling || gameOver}
          >
            {hasRolled ? 'Roll again' : 'Roll'}
            <span className="rolls-left">
              {Array.from({ length: ROLLS_PER_TURN }, (_, i) => (
                <span key={i} className={`dot ${i < rollsLeft ? 'on' : ''}`} />
              ))}
            </span>
          </button>
          <p className="keys">Space: roll · 1–5: hold die</p>
        </section>

      </main>

      {gameOver && (
        <div className="overlay">
          <div className="modal">
            <h2>{winner ? `${winner.name} wins!` : "It's a tie!"}</h2>
            <p>
              {players[0].name}: <strong>{allTotals[0].grand}</strong> · {players[1].name}:{' '}
              <strong>{allTotals[1].grand}</strong>
            </p>
            <button className="roll" onClick={restart}>
              Play again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
