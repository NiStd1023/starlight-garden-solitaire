import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame, createDeck, isExposed, adjacent, availableMatches, moveCard, drawCard, gameStatus} from '../dist/engine.js';

test('a deal uses all 52 cards once, exposes only the bottom row, and starts with a playable card', () => {
  for (let i=0; i<50; i++) {
    const s=createGame();
    const ids=[...s.tableau.map(x=>x.card.id),...s.stock.map(x=>x.id),s.waste.id];
    assert.equal(s.tableau.length,28); assert.equal(s.stock.length,23);
    assert.equal(new Set(ids).size,52); assert.equal(createDeck().length,52);
    assert.equal(s.tableau.filter((_,j)=>isExposed(s,j)).length,7);
    assert.ok(availableMatches(s).length);
  }
});
test('A and K connect but equal and distant ranks do not', () => {
  assert.equal(adjacent({rank:1},{rank:13}),true);
  assert.equal(adjacent({rank:1},{rank:2}),true);
  assert.equal(adjacent({rank:4},{rank:4}),false);
  assert.equal(adjacent({rank:4},{rank:7}),false);
});
test('a card is exposed only after both covering cards are removed', () => {
  const s=createGame(); const parent=s.tableau.findIndex(x=>x.row===5 && x.col===0);
  const childA=s.tableau.findIndex(x=>x.row===6 && x.col===0);
  const childB=s.tableau.findIndex(x=>x.row===6 && x.col===1);
  assert.equal(isExposed(s,parent),false); s.tableau[childA].removed=true;
  assert.equal(isExposed(s,parent),false); s.tableau[childB].removed=true;
  assert.equal(isExposed(s,parent),true);
});
test('moves preserve prior snapshots, consume stars, and award a star on five-combo', () => {
  const s=createGame(); const target=s.tableau.findIndex((x,i)=>isExposed(s,i));
  s.combo=4; const next=moveCard(s,target,true);
  assert.ok(next); assert.equal(s.tableau[target].removed,false);
  assert.equal(next.tableau[target].removed,true); assert.equal(next.combo,5);
  assert.equal(next.stars,1); assert.equal(next.moves,1); assert.ok(next.score>0);
  assert.equal(moveCard(next,target,true),null);
});
test('drawing resets combo, retains cards immutably, and cannot draw an empty stock', () => {
  const s=createGame(); s.combo=4; const d=drawCard(s);
  assert.equal(s.stock.length,23); assert.equal(d.stock.length,22); assert.equal(d.combo,0);
  d.stock=[]; assert.equal(drawCard(d),null);
});
test('win and stuck states reflect the remaining cards and available wild cards', () => {
  const s=createGame(); s.tableau.forEach(x=>x.removed=true); assert.equal(gameStatus(s),'won');
  s.tableau.at(-1).removed=false; s.waste={rank:s.tableau.at(-1).card.rank,suit:'clubs'}; s.stock=[]; s.stars=0;
  assert.equal(gameStatus(s),'stuck'); s.stars=1; assert.equal(gameStatus(s),'playing');
});
