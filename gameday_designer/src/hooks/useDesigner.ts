/**
 * useDesigner Hook
 *
 * Main state management hook for the Gameday Designer.
 * Provides all actions for managing fields, game slots, and the overall schedule.
 */

import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type {
  DesignerState,
  GameSlot,
} from '../types/designer';
import {
  createInitialDesignerState,
  createDefaultField,
  createDefaultGameSlot,
} from '../types/designer';

/**
 * Partial update type for game slots.
 * Allows updating any subset of GameSlot properties.
 */
export type GameSlotUpdate = Partial<Omit<GameSlot, 'id'>>;

/**
 * Return type for the useDesigner hook.
 */
export interface UseDesignerReturn {
  /** Current designer state */
  state: DesignerState;

  /** Add a new field to the canvas */
  addField: () => void;

  /** Remove a field by ID */
  removeField: (fieldId: string) => void;

  /** Update a field's name */
  updateFieldName: (fieldId: string, name: string) => void;

  /** Add a game slot to a field */
  addGameSlot: (fieldId: string) => void;

  /** Remove a game slot by ID */
  removeGameSlot: (slotId: string) => void;

  /** Update properties of a game slot */
  updateGameSlot: (slotId: string, update: GameSlotUpdate) => void;

  /** Duplicate a game slot (inserts after the original) */
  duplicateGameSlot: (slotId: string) => void;

  /** Select a game slot for editing (or null to clear) */
  selectGameSlot: (slotId: string | null) => void;

  /** Clear all fields and game slots */
  clearAll: () => void;

  /** Replace the entire state (used for importing) */
  setState: (newState: DesignerState) => void;
}

/**
 * Main hook for managing the Gameday Designer state.
 *
 * Provides all CRUD operations for fields and game slots,
 * as well as drag-and-drop reordering support.
 *
 * @returns Object containing state and action functions
 */
export function useDesigner(): UseDesignerReturn {
  const [state, setStateInternal] = useState<DesignerState>(
    createInitialDesignerState()
  );

  /**
   * Add a new field to the canvas.
   */
  const addField = useCallback(() => {
    setStateInternal((prevState) => {
      const newOrder = prevState.fields.length;
      const newField = createDefaultField(uuidv4(), newOrder);

      return {
        ...prevState,
        fields: [...prevState.fields, newField],
      };
    });
  }, []);

  /**
   * Remove a field by ID.
   * Also removes all game slots associated with the field.
   */
  const removeField = useCallback((fieldId: string) => {
    setStateInternal((prevState) => ({
      ...prevState,
      fields: prevState.fields.filter((f) => f.id !== fieldId),
    }));
  }, []);

  /**
   * Update a field's name.
   */
  const updateFieldName = useCallback((fieldId: string, name: string) => {
    setStateInternal((prevState) => ({
      ...prevState,
      fields: prevState.fields.map((f) =>
        f.id === fieldId ? { ...f, name } : f
      ),
    }));
  }, []);

  /**
   * Add a game slot to a field.
   */
  const addGameSlot = useCallback((fieldId: string) => {
    setStateInternal((prevState) => {
      const fieldIndex = prevState.fields.findIndex((f) => f.id === fieldId);
      if (fieldIndex === -1) {
        return prevState;
      }

      const newSlot = createDefaultGameSlot(uuidv4());
      const newFields = [...prevState.fields];
      newFields[fieldIndex] = {
        ...newFields[fieldIndex],
        gameSlots: [...newFields[fieldIndex].gameSlots, newSlot],
      };

      return {
        ...prevState,
        fields: newFields,
      };
    });
  }, []);

  /**
   * Remove a game slot by ID.
   * Searches all fields to find and remove the slot.
   */
  const removeGameSlot = useCallback((slotId: string) => {
    setStateInternal((prevState) => ({
      ...prevState,
      fields: prevState.fields.map((field) => ({
        ...field,
        gameSlots: field.gameSlots.filter((s) => s.id !== slotId),
      })),
    }));
  }, []);

  /**
   * Update properties of a game slot.
   */
  const updateGameSlot = useCallback((slotId: string, update: GameSlotUpdate) => {
    setStateInternal((prevState) => ({
      ...prevState,
      fields: prevState.fields.map((field) => ({
        ...field,
        gameSlots: field.gameSlots.map((slot) =>
          slot.id === slotId ? { ...slot, ...update } : slot
        ),
      })),
    }));
  }, []);

  /**
   * Duplicate a game slot.
   * The duplicate is inserted immediately after the original.
   */
  const duplicateGameSlot = useCallback((slotId: string) => {
    setStateInternal((prevState) => {
      // Find the field and slot
      let sourceFieldIndex = -1;
      let sourceSlotIndex = -1;
      let sourceSlot: GameSlot | undefined;

      for (let fi = 0; fi < prevState.fields.length; fi++) {
        const field = prevState.fields[fi];
        const si = field.gameSlots.findIndex((s) => s.id === slotId);
        if (si !== -1) {
          sourceFieldIndex = fi;
          sourceSlotIndex = si;
          sourceSlot = field.gameSlots[si];
          break;
        }
      }

      if (!sourceSlot || sourceFieldIndex === -1) {
        return prevState;
      }

      // Create duplicate with new ID
      const duplicateSlot: GameSlot = {
        ...sourceSlot,
        id: uuidv4(),
      };

      // Insert after the original
      const newFields = [...prevState.fields];
      const newSlots = [...newFields[sourceFieldIndex].gameSlots];
      newSlots.splice(sourceSlotIndex + 1, 0, duplicateSlot);
      newFields[sourceFieldIndex] = {
        ...newFields[sourceFieldIndex],
        gameSlots: newSlots,
      };

      return {
        ...prevState,
        fields: newFields,
      };
    });
  }, []);

  /**
   * Select a game slot for editing.
   */
  const selectGameSlot = useCallback((slotId: string | null) => {
    setStateInternal((prevState) => ({
      ...prevState,
      selectedGameSlot: slotId,
    }));
  }, []);

  /**
   * Clear all fields and game slots.
   */
  const clearAll = useCallback(() => {
    setStateInternal(createInitialDesignerState());
  }, []);

  /**
   * Replace the entire state.
   * Used primarily for importing schedules.
   */
  const setState = useCallback((newState: DesignerState) => {
    setStateInternal(newState);
  }, []);

  return {
    state,
    addField,
    removeField,
    updateFieldName,
    addGameSlot,
    removeGameSlot,
    updateGameSlot,
    duplicateGameSlot,
    selectGameSlot,
    clearAll,
    setState,
  };
}
