/**
 * TeamSelector Component
 *
 * Allows selecting a team reference with support for all types:
 * - Group-Team: select group + position (e.g., "0_1")
 * - Standing: select standing + group (e.g., "P1 Gruppe 1")
 * - Result: select winner/loser + match (e.g., "Gewinner HF1")
 * - Static: enter custom name (e.g., "Team Officials")
 */

import React from 'react';
import { Form, Row, Col } from 'react-bootstrap';
import type { TeamReference } from '../types/designer';

type ReferenceType = TeamReference['type'];

export interface TeamSelectorProps {
  /** Current team reference value */
  value: TeamReference;
  /** Callback when the reference changes */
  onChange: (ref: TeamReference) => void;
  /** Label for this selector (e.g., "Home", "Away", "Official") */
  label: string;
  /** Available match names for winner/loser references */
  matchNames: string[];
  /** Available group names for standing references */
  groupNames: string[];
}

/**
 * Create a default reference for a given type.
 */
function createDefaultReference(
  type: ReferenceType,
  matchNames: string[],
  groupNames: string[]
): TeamReference {
  switch (type) {
    case 'groupTeam':
      return { type: 'groupTeam', group: 0, team: 0 };
    case 'standing':
      return {
        type: 'standing',
        place: 1,
        groupName: groupNames[0] || 'Gruppe 1',
      };
    case 'winner':
      return { type: 'winner', matchName: matchNames[0] || '' };
    case 'loser':
      return { type: 'loser', matchName: matchNames[0] || '' };
    case 'static':
    default:
      return { type: 'static', name: '' };
  }
}

/**
 * TeamSelector component.
 */
const TeamSelector: React.FC<TeamSelectorProps> = ({
  value,
  onChange,
  label,
  matchNames,
  groupNames,
}) => {
  /**
   * Handle type change.
   */
  const handleTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = event.target.value as ReferenceType;
    onChange(createDefaultReference(newType, matchNames, groupNames));
  };

  /**
   * Render type-specific inputs.
   */
  const renderInputs = () => {
    switch (value.type) {
      case 'groupTeam':
        return (
          <Row className="g-2">
            <Col xs={6}>
              <Form.Group controlId={`${label}-group`}>
                <Form.Label className="small mb-1">Group</Form.Label>
                <Form.Control
                  type="number"
                  min={0}
                  value={value.group}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      group: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  size="sm"
                />
              </Form.Group>
            </Col>
            <Col xs={6}>
              <Form.Group controlId={`${label}-position`}>
                <Form.Label className="small mb-1">Position</Form.Label>
                <Form.Control
                  type="number"
                  min={0}
                  value={value.team}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      team: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  size="sm"
                />
              </Form.Group>
            </Col>
          </Row>
        );

      case 'standing':
        return (
          <Row className="g-2">
            <Col xs={4}>
              <Form.Group controlId={`${label}-place`}>
                <Form.Label className="small mb-1">Place</Form.Label>
                <Form.Control
                  type="number"
                  min={1}
                  value={value.place}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      place: parseInt(e.target.value, 10) || 1,
                    })
                  }
                  size="sm"
                />
              </Form.Group>
            </Col>
            <Col xs={8}>
              <Form.Group controlId={`${label}-groupName`}>
                <Form.Label className="small mb-1">Group Name</Form.Label>
                <Form.Control
                  type="text"
                  value={value.groupName}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      groupName: e.target.value,
                    })
                  }
                  list={`${label}-groupNames`}
                  size="sm"
                />
                <datalist id={`${label}-groupNames`}>
                  {groupNames.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </Form.Group>
            </Col>
          </Row>
        );

      case 'winner':
      case 'loser':
        return (
          <Form.Group controlId={`${label}-match`}>
            <Form.Label className="small mb-1">Match</Form.Label>
            <Form.Control
              type="text"
              value={value.matchName}
              onChange={(e) =>
                onChange({
                  ...value,
                  matchName: e.target.value,
                } as TeamReference)
              }
              list={`${label}-matchNames`}
              size="sm"
              placeholder="e.g., HF1, Finale"
            />
            <datalist id={`${label}-matchNames`}>
              {matchNames.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </Form.Group>
        );

      case 'static':
      default:
        return (
          <Form.Group controlId={`${label}-name`}>
            <Form.Label className="small mb-1">Team Name</Form.Label>
            <Form.Control
              type="text"
              value={value.name}
              onChange={(e) =>
                onChange({
                  type: 'static',
                  name: e.target.value,
                })
              }
              size="sm"
              placeholder="e.g., Team Officials"
            />
          </Form.Group>
        );
    }
  };

  return (
    <div className="team-selector mb-3">
      <Form.Label className="fw-bold">{label}</Form.Label>
      <Form.Group controlId={`${label}-type`} className="mb-2">
        <Form.Label className="small mb-1">Type</Form.Label>
        <Form.Select
          value={value.type}
          onChange={handleTypeChange}
          size="sm"
        >
          <option value="groupTeam">Group-Team (0_1)</option>
          <option value="standing">Standing (P1 Gruppe 1)</option>
          <option value="winner">Winner (Gewinner)</option>
          <option value="loser">Loser (Verlierer)</option>
          <option value="static">Static (Custom Name)</option>
        </Form.Select>
      </Form.Group>
      {renderInputs()}
    </div>
  );
};

export default TeamSelector;
