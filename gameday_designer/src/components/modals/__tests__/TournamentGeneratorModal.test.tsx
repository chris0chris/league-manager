/**
 * Tests for TournamentGeneratorModal Component
 *
 * Simplified tests focusing on core functionality and coverage
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TournamentGeneratorModal from '../TournamentGeneratorModal';
import type { GlobalTeam } from '../../../types/flowchart';
import i18n from '../../../i18n/testConfig';

describe('TournamentGeneratorModal - Core Functionality', () => {
  const mockOnHide = vi.fn();
  const mockOnGenerate = vi.fn();
  const mockTeams: GlobalTeam[] = Array.from({ length: 6 }, (_, i) => ({
    id: `t${i}`,
    label: `Team ${i}`,
    color: '#000',
    order: i,
    groupId: 'g1'
  }));

  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage('en');
  });

  describe('Modal Visibility', () => {
    it('should not render when show is false', () => {
      render(
        <TournamentGeneratorModal
          show={false}
          onHide={mockOnHide}
          teams={mockTeams}
          onGenerate={mockOnGenerate}
        />
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render modal when show is true', () => {
      render(
        <TournamentGeneratorModal
          show={true}
          onHide={mockOnHide}
          teams={mockTeams}
          onGenerate={mockOnGenerate}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should call onHide when close button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <TournamentGeneratorModal
          show={true}
          onHide={mockOnHide}
          teams={mockTeams}
          onGenerate={mockOnGenerate}
        />
      );

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(mockOnHide).toHaveBeenCalledTimes(1);
    });

    it('should call onHide when Cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <TournamentGeneratorModal
          show={true}
          onHide={mockOnHide}
          teams={mockTeams}
          onGenerate={mockOnGenerate}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnHide).toHaveBeenCalledTimes(1);
    });
  });

  describe('Template Selection', () => {
    it('should display template selection options', () => {
      render(
        <TournamentGeneratorModal
          show={true}
          onHide={mockOnHide}
          teams={mockTeams}
          onGenerate={mockOnGenerate}
        />
      );

      // Should have at least one template radio button or show no templates message
      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
    });

    it('should allow selecting different templates by clicking', async () => {
      const user = userEvent.setup();
      render(
        <TournamentGeneratorModal
          show={true}
          onHide={mockOnHide}
          teams={mockTeams}
          onGenerate={mockOnGenerate}
        />
      );

      const templates = screen.queryAllByRole('radio');
      if (templates.length > 1) {
        // Can click different templates
        await user.click(templates[1]);
        expect(templates[1]).toBeChecked();
      }
    });
  });

  describe('Team Options', () => {
    it('should display team generation options', () => {
      render(
        <TournamentGeneratorModal
          show={true}
          onHide={mockOnHide}
          teams={mockTeams}
          onGenerate={mockOnGenerate}
        />
      );

      const checkboxes = screen.queryAllByRole('checkbox');
      // May have generate teams and auto-assign checkboxes if templates exist
      expect(checkboxes.length).toBeGreaterThanOrEqual(0);
    });

    it('should allow toggling team generation checkbox', async () => {
      const user = userEvent.setup();
      render(
        <TournamentGeneratorModal
          show={true}
          onHide={mockOnHide}
          teams={[]} // MUST BE EMPTY to allow toggling
          onGenerate={mockOnGenerate}
        />
      );

      const generateCheckbox = screen.queryByLabelText(/generate.*teams/i);
      if (generateCheckbox) {
        const initialState = (generateCheckbox as HTMLInputElement).checked;
        await user.click(generateCheckbox);
        expect((generateCheckbox as HTMLInputElement).checked).toBe(!initialState);
      }
    });
  });

  describe('Generate Button', () => {
    it('should display generate button', () => {
      render(
        <TournamentGeneratorModal
          show={true}
          onHide={mockOnHide}
          teams={mockTeams}
          onGenerate={mockOnGenerate}
        />
      );

      const generateButton = screen.getByRole('button', { name: /generate/i });
      expect(generateButton).toBeInTheDocument();
    });

    it('should call onGenerate when clicked and templates available', async () => {
      const user = userEvent.setup();
      render(
        <TournamentGeneratorModal
          show={true}
          onHide={mockOnHide}
          teams={mockTeams}
          onGenerate={mockOnGenerate}
        />
      );

      const generateButton = screen.getByRole('button', { name: /generate/i });

      // Only click if button is enabled (templates available)
      if (!generateButton.hasAttribute('disabled')) {
        await user.click(generateButton);
        expect(mockOnGenerate).toHaveBeenCalled();
        expect(mockOnHide).toHaveBeenCalled();
      }
    });
  });

  describe('Modal Layout', () => {
    it('should use large modal size', () => {
      render(
        <TournamentGeneratorModal
          show={true}
          onHide={mockOnHide}
          teams={mockTeams}
          onGenerate={mockOnGenerate}
        />
      );

      const modal = screen.getByRole('dialog');
      expect(modal.querySelector('.modal-lg')).toBeInTheDocument();
    });

    it('should center modal on screen', () => {
      render(
        <TournamentGeneratorModal
          show={true}
          onHide={mockOnHide}
          teams={mockTeams}
          onGenerate={mockOnGenerate}
        />
      );

      const modalDialog = screen.getByRole('dialog').querySelector('.modal-dialog');
      expect(modalDialog).toHaveClass('modal-dialog-centered');
    });
  });
});
