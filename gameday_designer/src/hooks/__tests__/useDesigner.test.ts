import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDesigner } from '../useDesigner';
import type { TeamReference } from '../../types/designer';

describe('useDesigner', () => {
  describe('initial state', () => {
    it('starts with an empty fields array', () => {
      const { result } = renderHook(() => useDesigner());

      expect(result.current.state.fields).toEqual([]);
    });

    it('starts with no selected game slot', () => {
      const { result } = renderHook(() => useDesigner());

      expect(result.current.state.selectedGameSlot).toBeNull();
    });

    it('starts with a valid validation result', () => {
      const { result } = renderHook(() => useDesigner());

      expect(result.current.state.validationResult.isValid).toBe(true);
      expect(result.current.state.validationResult.errors).toEqual([]);
      expect(result.current.state.validationResult.warnings).toEqual([]);
    });
  });

  describe('addField', () => {
    it('adds a new field to empty state', () => {
      const { result } = renderHook(() => useDesigner());

      act(() => {
        result.current.addField();
      });

      expect(result.current.state.fields).toHaveLength(1);
    });

    it('creates field with unique id', () => {
      const { result } = renderHook(() => useDesigner());

      act(() => {
        result.current.addField();
      });

      expect(result.current.state.fields[0].id).toBeTruthy();
      expect(typeof result.current.state.fields[0].id).toBe('string');
    });

    it('creates field with default name based on order', () => {
      const { result } = renderHook(() => useDesigner());

      act(() => {
        result.current.addField();
      });

      expect(result.current.state.fields[0].name).toBe('Feld 1');
    });

    it('adds multiple fields with incrementing names', () => {
      const { result } = renderHook(() => useDesigner());

      act(() => {
        result.current.addField();
        result.current.addField();
        result.current.addField();
      });

      expect(result.current.state.fields).toHaveLength(3);
      expect(result.current.state.fields[0].name).toBe('Feld 1');
      expect(result.current.state.fields[1].name).toBe('Feld 2');
      expect(result.current.state.fields[2].name).toBe('Feld 3');
    });

    it('sets correct order for each field', () => {
      const { result } = renderHook(() => useDesigner());

      act(() => {
        result.current.addField();
        result.current.addField();
      });

      expect(result.current.state.fields[0].order).toBe(0);
      expect(result.current.state.fields[1].order).toBe(1);
    });

    it('starts each field with empty game slots', () => {
      const { result } = renderHook(() => useDesigner());

      act(() => {
        result.current.addField();
      });

      expect(result.current.state.fields[0].gameSlots).toEqual([]);
    });
  });

  describe('removeField', () => {
    it('removes a field by id', () => {
      const { result } = renderHook(() => useDesigner());

      act(() => {
        result.current.addField();
        result.current.addField();
      });

      const fieldIdToRemove = result.current.state.fields[0].id;

      act(() => {
        result.current.removeField(fieldIdToRemove);
      });

      expect(result.current.state.fields).toHaveLength(1);
      expect(
        result.current.state.fields.find((f) => f.id === fieldIdToRemove)
      ).toBeUndefined();
    });

    it('does nothing when field id does not exist', () => {
      const { result } = renderHook(() => useDesigner());

      act(() => {
        result.current.addField();
      });

      act(() => {
        result.current.removeField('non-existent-id');
      });

      expect(result.current.state.fields).toHaveLength(1);
    });

    it('removes the last remaining field', () => {
      const { result } = renderHook(() => useDesigner());

      act(() => {
        result.current.addField();
      });

      const fieldId = result.current.state.fields[0].id;

      act(() => {
        result.current.removeField(fieldId);
      });

      expect(result.current.state.fields).toHaveLength(0);
    });

    it('removes field along with all its game slots', () => {
      const { result } = renderHook(() => useDesigner());

      act(() => {
        result.current.addField();
      });

      const fieldId = result.current.state.fields[0].id;

      act(() => {
        result.current.addGameSlot(fieldId);
        result.current.addGameSlot(fieldId);
      });

      expect(result.current.state.fields[0].gameSlots).toHaveLength(2);

      act(() => {
        result.current.removeField(fieldId);
      });

      expect(result.current.state.fields).toHaveLength(0);
    });
  });

  describe('updateFieldName', () => {
    it('updates the name of a field', () => {
      const { result } = renderHook(() => useDesigner());

      act(() => {
        result.current.addField();
      });

      const fieldId = result.current.state.fields[0].id;

      act(() => {
        result.current.updateFieldName(fieldId, 'Main Field');
      });

      expect(result.current.state.fields[0].name).toBe('Main Field');
    });

    it('does nothing when field id does not exist', () => {
      const { result } = renderHook(() => useDesigner());

      act(() => {
        result.current.addField();
      });

      act(() => {
        result.current.updateFieldName('non-existent-id', 'New Name');
      });

      expect(result.current.state.fields[0].name).toBe('Feld 1');
    });
  });

  describe('addGameSlot', () => {
    beforeEach(() => {
      // Most tests need at least one field
    });

    it('adds a game slot to a field', () => {
      const { result } = renderHook(() => useDesigner());

      act(() => {
        result.current.addField();
      });

      const fieldId = result.current.state.fields[0].id;

      act(() => {
        result.current.addGameSlot(fieldId);
      });

      expect(result.current.state.fields[0].gameSlots).toHaveLength(1);
    });

    it('creates game slot with unique id', () => {
      const { result } = renderHook(() => useDesigner());

      act(() => {
        result.current.addField();
      });

      const fieldId = result.current.state.fields[0].id;

      act(() => {
        result.current.addGameSlot(fieldId);
      });

      expect(result.current.state.fields[0].gameSlots[0].id).toBeTruthy();
    });

    it('creates game slot with default values', () => {
      const { result } = renderHook(() => useDesigner());

      act(() => {
        result.current.addField();
      });

      const fieldId = result.current.state.fields[0].id;

      act(() => {
        result.current.addGameSlot(fieldId);
      });

      const slot = result.current.state.fields[0].gameSlots[0];

      expect(slot.stage).toBe('Vorrunde');
      expect(slot.standing).toBe('');
      expect(slot.home.type).toBe('static');
      expect(slot.away.type).toBe('static');
      expect(slot.official.type).toBe('static');
      expect(slot.breakAfter).toBe(0);
    });

    it('adds multiple game slots to the same field', () => {
      const { result } = renderHook(() => useDesigner());

      act(() => {
        result.current.addField();
      });

      const fieldId = result.current.state.fields[0].id;

      act(() => {
        result.current.addGameSlot(fieldId);
        result.current.addGameSlot(fieldId);
        result.current.addGameSlot(fieldId);
      });

      expect(result.current.state.fields[0].gameSlots).toHaveLength(3);
    });

    it('does nothing when field id does not exist', () => {
      const { result } = renderHook(() => useDesigner());

      act(() => {
        result.current.addField();
      });

      act(() => {
        result.current.addGameSlot('non-existent-field');
      });

      expect(result.current.state.fields[0].gameSlots).toHaveLength(0);
    });
  });

  describe('removeGameSlot', () => {
    it('removes a game slot from a field', () => {
      const { result } = renderHook(() => useDesigner());

      act(() => {
        result.current.addField();
      });

      const fieldId = result.current.state.fields[0].id;

      act(() => {
        result.current.addGameSlot(fieldId);
        result.current.addGameSlot(fieldId);
      });

      const slotIdToRemove = result.current.state.fields[0].gameSlots[0].id;

      act(() => {
        result.current.removeGameSlot(slotIdToRemove);
      });

      expect(result.current.state.fields[0].gameSlots).toHaveLength(1);
      expect(
        result.current.state.fields[0].gameSlots.find(
          (s) => s.id === slotIdToRemove
        )
      ).toBeUndefined();
    });

    it('does nothing when game slot id does not exist', () => {
      const { result } = renderHook(() => useDesigner());

      act(() => {
        result.current.addField();
      });

      const fieldId = result.current.state.fields[0].id;

      act(() => {
        result.current.addGameSlot(fieldId);
      });

      act(() => {
        result.current.removeGameSlot('non-existent-slot');
      });

      expect(result.current.state.fields[0].gameSlots).toHaveLength(1);
    });
  });

  describe('updateGameSlot', () => {
    it('updates the stage of a game slot', () => {
      const { result } = renderHook(() => useDesigner());

      act(() => {
        result.current.addField();
      });

      const fieldId = result.current.state.fields[0].id;

      act(() => {
        result.current.addGameSlot(fieldId);
      });

      const slotId = result.current.state.fields[0].gameSlots[0].id;

      act(() => {
        result.current.updateGameSlot(slotId, { stage: 'Finalrunde' });
      });

      expect(result.current.state.fields[0].gameSlots[0].stage).toBe(
        'Finalrunde'
      );
    });

    it('updates the standing of a game slot', () => {
      const { result } = renderHook(() => useDesigner());

      act(() => {
        result.current.addField();
      });

      const fieldId = result.current.state.fields[0].id;

      act(() => {
        result.current.addGameSlot(fieldId);
      });

      const slotId = result.current.state.fields[0].gameSlots[0].id;

      act(() => {
        result.current.updateGameSlot(slotId, { standing: 'HF1' });
      });

      expect(result.current.state.fields[0].gameSlots[0].standing).toBe('HF1');
    });

    it('updates the home team reference', () => {
      const { result } = renderHook(() => useDesigner());

      act(() => {
        result.current.addField();
      });

      const fieldId = result.current.state.fields[0].id;

      act(() => {
        result.current.addGameSlot(fieldId);
      });

      const slotId = result.current.state.fields[0].gameSlots[0].id;
      const homeRef: TeamReference = { type: 'groupTeam', group: 0, team: 1 };

      act(() => {
        result.current.updateGameSlot(slotId, { home: homeRef });
      });

      expect(result.current.state.fields[0].gameSlots[0].home).toEqual(homeRef);
    });

    it('updates multiple properties at once', () => {
      const { result } = renderHook(() => useDesigner());

      act(() => {
        result.current.addField();
      });

      const fieldId = result.current.state.fields[0].id;

      act(() => {
        result.current.addGameSlot(fieldId);
      });

      const slotId = result.current.state.fields[0].gameSlots[0].id;

      act(() => {
        result.current.updateGameSlot(slotId, {
          stage: 'Finalrunde',
          standing: 'P1',
          breakAfter: 5,
        });
      });

      const slot = result.current.state.fields[0].gameSlots[0];
      expect(slot.stage).toBe('Finalrunde');
      expect(slot.standing).toBe('P1');
      expect(slot.breakAfter).toBe(5);
    });

    it('does nothing when game slot id does not exist', () => {
      const { result } = renderHook(() => useDesigner());

      act(() => {
        result.current.addField();
      });

      const fieldId = result.current.state.fields[0].id;

      act(() => {
        result.current.addGameSlot(fieldId);
      });

      act(() => {
        result.current.updateGameSlot('non-existent-slot', {
          stage: 'Finalrunde',
        });
      });

      expect(result.current.state.fields[0].gameSlots[0].stage).toBe(
        'Vorrunde'
      );
    });
  });

  describe('duplicateGameSlot', () => {
    it('duplicates a game slot in the same field', () => {
      const { result } = renderHook(() => useDesigner());

      act(() => {
        result.current.addField();
      });

      const fieldId = result.current.state.fields[0].id;

      act(() => {
        result.current.addGameSlot(fieldId);
      });

      const slotId = result.current.state.fields[0].gameSlots[0].id;

      act(() => {
        result.current.updateGameSlot(slotId, {
          stage: 'Finalrunde',
          standing: 'HF1',
        });
      });

      act(() => {
        result.current.duplicateGameSlot(slotId);
      });

      expect(result.current.state.fields[0].gameSlots).toHaveLength(2);
    });

    it('creates duplicate with new unique id', () => {
      const { result } = renderHook(() => useDesigner());

      act(() => {
        result.current.addField();
      });

      const fieldId = result.current.state.fields[0].id;

      act(() => {
        result.current.addGameSlot(fieldId);
      });

      const originalId = result.current.state.fields[0].gameSlots[0].id;

      act(() => {
        result.current.duplicateGameSlot(originalId);
      });

      const newId = result.current.state.fields[0].gameSlots[1].id;
      expect(newId).not.toBe(originalId);
    });

    it('copies all properties from original slot', () => {
      const { result } = renderHook(() => useDesigner());

      act(() => {
        result.current.addField();
      });

      const fieldId = result.current.state.fields[0].id;

      act(() => {
        result.current.addGameSlot(fieldId);
      });

      const slotId = result.current.state.fields[0].gameSlots[0].id;
      const homeRef: TeamReference = { type: 'groupTeam', group: 0, team: 0 };
      const awayRef: TeamReference = { type: 'groupTeam', group: 0, team: 1 };
      const officialRef: TeamReference = { type: 'groupTeam', group: 0, team: 2 };

      act(() => {
        result.current.updateGameSlot(slotId, {
          stage: 'Finalrunde',
          standing: 'HF1',
          home: homeRef,
          away: awayRef,
          official: officialRef,
          breakAfter: 10,
        });
      });

      act(() => {
        result.current.duplicateGameSlot(slotId);
      });

      const duplicate = result.current.state.fields[0].gameSlots[1];
      expect(duplicate.stage).toBe('Finalrunde');
      expect(duplicate.standing).toBe('HF1');
      expect(duplicate.home).toEqual(homeRef);
      expect(duplicate.away).toEqual(awayRef);
      expect(duplicate.official).toEqual(officialRef);
      expect(duplicate.breakAfter).toBe(10);
    });

    it('inserts duplicate after the original slot', () => {
      const { result } = renderHook(() => useDesigner());

      act(() => {
        result.current.addField();
      });

      const fieldId = result.current.state.fields[0].id;

      act(() => {
        result.current.addGameSlot(fieldId);
        result.current.addGameSlot(fieldId);
        result.current.addGameSlot(fieldId);
      });

      const originalId = result.current.state.fields[0].gameSlots[0].id;

      act(() => {
        result.current.updateGameSlot(originalId, { standing: 'Original' });
      });

      act(() => {
        result.current.duplicateGameSlot(originalId);
      });

      expect(result.current.state.fields[0].gameSlots).toHaveLength(4);
      expect(result.current.state.fields[0].gameSlots[0].standing).toBe(
        'Original'
      );
      expect(result.current.state.fields[0].gameSlots[1].standing).toBe(
        'Original'
      );
    });
  });

  describe('selectGameSlot', () => {
    it('selects a game slot for editing', () => {
      const { result } = renderHook(() => useDesigner());

      act(() => {
        result.current.addField();
      });

      const fieldId = result.current.state.fields[0].id;

      act(() => {
        result.current.addGameSlot(fieldId);
      });

      const slotId = result.current.state.fields[0].gameSlots[0].id;

      act(() => {
        result.current.selectGameSlot(slotId);
      });

      expect(result.current.state.selectedGameSlot).toBe(slotId);
    });

    it('clears selection when called with null', () => {
      const { result } = renderHook(() => useDesigner());

      act(() => {
        result.current.addField();
      });

      const fieldId = result.current.state.fields[0].id;

      act(() => {
        result.current.addGameSlot(fieldId);
      });

      const slotId = result.current.state.fields[0].gameSlots[0].id;

      act(() => {
        result.current.selectGameSlot(slotId);
      });

      act(() => {
        result.current.selectGameSlot(null);
      });

      expect(result.current.state.selectedGameSlot).toBeNull();
    });
  });

  describe('clearAll', () => {
    it('removes all fields and game slots', () => {
      const { result } = renderHook(() => useDesigner());

      act(() => {
        result.current.addField();
        result.current.addField();
      });

      const field1Id = result.current.state.fields[0].id;
      const field2Id = result.current.state.fields[1].id;

      act(() => {
        result.current.addGameSlot(field1Id);
        result.current.addGameSlot(field1Id);
        result.current.addGameSlot(field2Id);
      });

      act(() => {
        result.current.clearAll();
      });

      expect(result.current.state.fields).toHaveLength(0);
    });

    it('clears the selected game slot', () => {
      const { result } = renderHook(() => useDesigner());

      act(() => {
        result.current.addField();
      });

      const fieldId = result.current.state.fields[0].id;

      act(() => {
        result.current.addGameSlot(fieldId);
      });

      const slotId = result.current.state.fields[0].gameSlots[0].id;

      act(() => {
        result.current.selectGameSlot(slotId);
      });

      act(() => {
        result.current.clearAll();
      });

      expect(result.current.state.selectedGameSlot).toBeNull();
    });
  });

  describe('setState (for import)', () => {
    it('replaces the entire state', () => {
      const { result } = renderHook(() => useDesigner());

      act(() => {
        result.current.addField();
      });

      const newState = {
        fields: [
          {
            id: 'imported-field-1',
            name: 'Imported Field',
            order: 0,
            gameSlots: [
              {
                id: 'imported-slot-1',
                stage: 'Vorrunde',
                standing: 'Spiel 1',
                home: { type: 'groupTeam' as const, group: 0, team: 0 },
                away: { type: 'groupTeam' as const, group: 0, team: 1 },
                official: { type: 'groupTeam' as const, group: 0, team: 2 },
                breakAfter: 0,
              },
            ],
          },
        ],
        selectedGameSlot: null,
        validationResult: {
          isValid: true,
          errors: [],
          warnings: [],
        },
      };

      act(() => {
        result.current.setState(newState);
      });

      expect(result.current.state.fields).toHaveLength(1);
      expect(result.current.state.fields[0].name).toBe('Imported Field');
      expect(result.current.state.fields[0].gameSlots[0].standing).toBe(
        'Spiel 1'
      );
    });
  });
});
