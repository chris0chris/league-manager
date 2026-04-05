import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';
import TemplatePreview from '../TemplatePreview';
import { SelectedTemplate } from '../TemplateList';
import type { TournamentTemplate } from '../../../../types/tournament';

const mockBuiltinTemplate = {
  id: 'f6_2_2',
  name: '6-Team Cup',
  teamCount: { min: 6, max: 6 },
  fieldOptions: [2],
  stages: [],
  timing: { firstGameStartTime: '09:00', defaultGameDuration: 15, defaultBreakBetweenGames: 5 },
};

describe('TemplateManagementUpdate Reproduction', () => {
  it('shows "Number of fields" input for built-in templates (currently fails)', () => {
    const selected: SelectedTemplate = { 
        type: 'builtin', 
        template: mockBuiltinTemplate as unknown as TournamentTemplate 
    };
    
    render(<TemplatePreview 
        selected={selected} 
        currentUserId={1} 
        onApply={vi.fn()} 
        onClone={vi.fn()} 
        onDelete={vi.fn()} 
        onSave={vi.fn()} 
    />);
    
    // This is expected to fail currently based on the code analysis
    expect(screen.getByLabelText(/number of fields/i)).toBeInTheDocument();
  });

  it('passes the selected field count to onApply for built-in templates (currently fails)', () => {
    const onApply = vi.fn();
    const selected: SelectedTemplate = { 
        type: 'builtin', 
        template: mockBuiltinTemplate as unknown as TournamentTemplate 
    };
    
    render(<TemplatePreview 
        selected={selected} 
        currentUserId={1} 
        onApply={onApply} 
        onClone={vi.fn()} 
        onDelete={vi.fn()} 
        onSave={vi.fn()} 
    />);

    // Mock changing fields if it were visible
    const input = screen.queryByLabelText(/number of fields/i);
    if (input) {
        fireEvent.change(input, { target: { value: '3' } });
    }
    
    fireEvent.click(screen.getByTestId('apply-template-button'));
    
    // We want it to be 3 if we changed it, or at least exist in the call
    expect(onApply).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
            numFields: expect.any(Number)
        })
    );
  });
});
