export const SUITS = ['spades', 'hearts', 'clubs', 'diamonds'];
export const SUIT_LABELS = {spades: '黑桃', hearts: '紅心', clubs: '梅花', diamonds: '方塊'};
export function rankName(rank) { return ({1:'A',11:'J',12:'Q',13:'K'})[rank] || String(rank); }
export function createDeck() {
  return SUITS.flatMap(suit => Array.from({length: 13}, (_, i) => ({id:`${suit}-${i+1}`, suit, rank:i+1})));
}
export function shuffle(deck, random = Math.random) {
  const cards = deck.slice();
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}
export function createGame(random = Math.random) {
  let state;
  // Start with a visible move to make the first interaction inviting.
  for (let attempt = 0; attempt < 25; attempt++) {
    const deck = shuffle(createDeck(), random);
    const tableau = [];
    let i = 0;
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col <= row; col++) tableau.push({card:deck[i++], row, col, removed:false});
    }
    const stock = deck.slice(i);
    state = {tableau, stock, waste:stock.pop(), score:0, combo:0, stars:1, moves:0};
    if (availableMatches(state).length) break;
  }
  return state;
}
export function isExposed(state, index) {
  const slot = state.tableau[index];
  if (!slot || slot.removed) return false;
  if (slot.row === 6) return true;
  return state.tableau.filter(s => s.row === slot.row + 1 && (s.col === slot.col || s.col === slot.col + 1)).every(s => s.removed);
}
export function adjacent(a, b) {
  if (!a || !b) return false;
  const difference = Math.abs(a.rank - b.rank);
  return difference === 1 || difference === 12;
}
export function availableMatches(state) {
  return state.tableau.map((slot, index) => ({slot,index})).filter(({slot,index}) => isExposed(state,index) && adjacent(slot.card,state.waste)).map(({index}) => index);
}
export function moveCard(state, index, useStar = false) {
  const slot = state.tableau[index];
  if (!isExposed(state,index) || (useStar ? state.stars < 1 : !adjacent(slot.card,state.waste))) return null;
  const next = structuredClone(state);
  const chosen = next.tableau[index];
  const sameSuit = chosen.card.suit === state.waste.suit;
  next.combo += 1;
  next.score += 100 + 30 * Math.min(next.combo - 1, 10) + (sameSuit ? 50 : 0);
  if (useStar) next.stars -= 1;
  if (next.combo % 5 === 0) next.stars = Math.min(3, next.stars + 1);
  next.waste = chosen.card;
  chosen.removed = true;
  next.moves += 1;
  return next;
}
export function drawCard(state) {
  if (!state.stock.length) return null;
  const next = structuredClone(state);
  next.waste = next.stock.pop();
  next.combo = 0;
  next.moves += 1;
  return next;
}
export function gameStatus(state) {
  if (state.tableau.every(slot => slot.removed)) return 'won';
  if (!state.stock.length && !availableMatches(state).length && !state.stars) return 'stuck';
  return 'playing';
}
