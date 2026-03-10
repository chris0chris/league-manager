import React, { useState } from 'react';
import { Table, Button, Form, Alert } from 'react-bootstrap';
import { GameResultsDisplay } from '../types/designer';

interface ScoreEdit {
  fh?: number | null;
  sh?: number | null;
  isHome?: boolean;
}

interface GameResultsTableProps {
  games: GameResultsDisplay[];
  onSave: (results: Record<string, ScoreEdit>) => Promise<void>;
}

export const GameResultsTable: React.FC<GameResultsTableProps> = ({
  games,
  onSave,
}) => {
  const [edits, setEdits] = useState<Record<string, ScoreEdit>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleScoreChange = (gameId: number, resultId: number, isHome: boolean, field: 'fh' | 'sh', value: string) => {
    const key = `${gameId}-${resultId}`;
    setEdits({
      ...edits,
      [key]: {
        ...edits[key],
        [field]: value ? parseInt(value) : null,
        isHome, // Preserve isHome in the edit object
      },
    });
  };

  const validateScores = (): boolean => {
    const newErrors: string[] = [];

    games.forEach((game) => {
      game.results.forEach((result) => {
        const key = `${game.id}-${result.id}`;
        const edit = edits[key];

        if (edit && (edit.fh !== undefined || edit.sh !== undefined)) {
          // If one half is entered, both must be entered
          if ((edit.fh ?? result.fh) === null || (edit.sh ?? result.sh) === null) {
            newErrors.push(`Game ${game.id}: Enter both halves for ${result.team.name}`);
          }
        }
      });
    });

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSave = async () => {
    if (!validateScores()) return;

    setLoading(true);
    try {
      await onSave(edits);
      setEdits({});
    } catch (error) {
      setErrors([`Failed to save: ${error}`]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {errors.length > 0 && (
        <Alert variant="danger">
          {errors.map((error, idx) => (
            <div key={idx}>{error}</div>
          ))}
        </Alert>
      )}

      <Table striped bordered hover>
        <thead>
          <tr>
            <th>Field</th>
            <th>Time</th>
            <th>Team</th>
            <th>1H</th>
            <th>2H</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {games.map((game) => (
            <React.Fragment key={game.id}>
              {game.results.map((result) => {
                const key = `${game.id}-${result.id}`;
                const edit = edits[key] || {};
                const fh = edit.fh !== undefined ? edit.fh : result.fh;
                const sh = edit.sh !== undefined ? edit.sh : result.sh;
                const total = fh !== null && sh !== null ? fh + sh : null;

                return (
                  <tr key={key}>
                    <td>{game.field}</td>
                    <td>{game.scheduled}</td>
                    <td>{result.team.name}</td>
                    <td>
                      <Form.Control
                        type="number"
                        value={fh ?? ''}
                        onChange={(e) =>
                          handleScoreChange(game.id, result.id, result.isHome, 'fh', e.target.value)
                        }
                        disabled={loading}
                      />
                    </td>
                    <td>
                      <Form.Control
                        type="number"
                        value={sh ?? ''}
                        onChange={(e) =>
                          handleScoreChange(game.id, result.id, result.isHome, 'sh', e.target.value)
                        }
                        disabled={loading}
                      />
                    </td>
                    <td>{total ?? '-'}</td>
                  </tr>
                );
              })}
            </React.Fragment>
          ))}
        </tbody>
      </Table>

      <Button
        variant="primary"
        onClick={handleSave}
        disabled={loading || Object.keys(edits).length === 0}
      >
        {loading ? 'Saving...' : 'Save Results'}
      </Button>
    </div>
  );
};
