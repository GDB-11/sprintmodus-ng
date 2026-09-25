import { summary } from '../../work-items/work-items.testing';
import { compareForBoard, placeBefore, rankGroupOf } from './board-order';

describe('board order', () => {
  const card = (code: string, number: number, extra = {}) =>
    summary({ workItemCode: code, workItemNumber: number, ...extra });

  it('orders by priority (critical first), then manual rank (unranked last), then number', () => {
    const cards = [
      card('low', 1000, { priority: 'LOW' }),
      card('medium-3', 1003),
      card('medium-1-ranked-2', 1001, { boardRank: 2 }),
      card('critical', 1005, { priority: 'CRITICAL' }),
      card('medium-2-ranked-1', 1002, { boardRank: 1 }),
      card('medium-4', 1004),
    ];

    expect(cards.sort(compareForBoard).map((c) => c.workItemCode)).toEqual([
      'critical',
      'medium-2-ranked-1',
      'medium-1-ranked-2',
      'medium-3',
      'medium-4',
      'low',
    ]);
  });

  it('finds the cards a card is ranked among: same type, status and priority', () => {
    const mine = card('a', 1000);
    const cards = [
      mine,
      card('b', 1001),
      card('other-priority', 1002, { priority: 'HIGH' }),
      card('other-type', 1003, { type: 'BUG' }),
      card('other-status', 1004, { status: { code: 'DONE', displayName: 'Done', isInitial: false, isTerminal: true } }),
    ];

    expect(rankGroupOf(cards, mine).map((c) => c.workItemCode)).toEqual(['a', 'b']);
  });

  it('places a card before another, or last, like the backend does', () => {
    expect(placeBefore(['a', 'b', 'c'], 'c', 'a')).toEqual(['c', 'a', 'b']);
    expect(placeBefore(['a', 'b', 'c'], 'a', 'c')).toEqual(['b', 'a', 'c']);
    expect(placeBefore(['a', 'b', 'c'], 'a', null)).toEqual(['b', 'c', 'a']);
    expect(placeBefore(['a', 'b', 'c'], 'b', 'c')).toEqual(['a', 'b', 'c']);
  });
});
