import { renderHook, act } from '@testing-library/react';
import { GamedayProvider, useGamedayContext } from '../GamedayContext';

describe('GamedayContext Results Mode', () => {
  it('tracks results entry mode', () => {
    const { result } = renderHook(() => useGamedayContext(), {
      wrapper: GamedayProvider,
    });

    act(() => {
      result.current.setResultsMode(true);
    });

    expect(result.current.resultsMode).toBe(true);
  });
});
