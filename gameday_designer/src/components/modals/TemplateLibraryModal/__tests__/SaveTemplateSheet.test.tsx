import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import SaveTemplateSheet from '../SaveTemplateSheet';

describe('SaveTemplateSheet', () => {
  it('requires a name before saving', () => {
    const onSave = vi.fn();
    render(<SaveTemplateSheet show onHide={vi.fn()} onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: /save template/i }));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('calls onSave with name, description and sharing on submit', () => {
    const onSave = vi.fn();
    render(<SaveTemplateSheet show onHide={vi.fn()} onSave={onSave} />);
    fireEvent.change(screen.getByPlaceholderText(/template name/i), { target: { value: 'My Format' } });
    fireEvent.click(screen.getByTestId('sharing-option-association'));
    fireEvent.click(screen.getByRole('button', { name: /save template/i }));
    expect(onSave).toHaveBeenCalledWith({ name: 'My Format', description: '', sharing: 'ASSOCIATION' });
  });
});
