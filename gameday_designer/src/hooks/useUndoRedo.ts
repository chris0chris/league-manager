import { useState, useCallback, useRef } from 'react';
import type { FlowState } from '../types/flowchart';

/**
 * Hook for managing undo/redo history of the FlowState.
 *
 * @param initialState - The initial state to start history with
 * @returns Object containing current state and history actions
 */
export function useUndoRedo(initialState: FlowState) {
  const [history, setHistory] = useState<FlowState[]>([initialState]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const isInternalChange = useRef(false);

  /**
   * Push a new state to history.
   * Clears any "redo" states that exist.
   */
  const pushState = useCallback((newState: FlowState) => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }

    setHistory((prev) => {
      // Don't push if the state is identical to the current one
      const currentStateStr = JSON.stringify(prev[currentIndex]);
      const newStateStr = JSON.stringify(newState);
      if (currentStateStr === newStateStr) {
        return prev;
      }

      const newHistory = prev.slice(0, currentIndex + 1);
      newHistory.push(newState);
      
      // Limit history size (e.g., 50 states)
      if (newHistory.length > 50) {
        newHistory.shift();
        setCurrentIndex(newHistory.length - 1);
      } else {
        setCurrentIndex(newHistory.length - 1);
      }
      
      return newHistory;
    });
  }, [currentIndex]);

  /**
   * Undo to the previous state.
   */
  const undo = useCallback((): FlowState | null => {
    if (currentIndex > 0) {
      isInternalChange.current = true;
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      return history[prevIndex];
    }
    return null;
  }, [currentIndex, history]);

  /**
   * Redo to the next state.
   */
  const redo = useCallback((): FlowState | null => {
    if (currentIndex < history.length - 1) {
      isInternalChange.current = true;
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      return history[nextIndex];
    }
    return null;
  }, [currentIndex, history]);

  return {
    state: history[currentIndex],
    pushState,
    undo,
    redo,
    canUndo: currentIndex > 0,
    canRedo: currentIndex < history.length - 1,
    resetHistory: (state: FlowState) => {
      setHistory([state]);
      setCurrentIndex(0);
      isInternalChange.current = false;
    }
  };
}
