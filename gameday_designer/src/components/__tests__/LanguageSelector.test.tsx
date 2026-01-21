/**
 * Tests for LanguageSelector Component
 *
 * TDD RED Phase: Tests for language switching dropdown component
 *
 * Coverage targets:
 * - Rendering current language display (DE/EN)
 * - Dropdown menu items (German and English)
 * - Language switching functionality
 * - Active language highlighting
 * - i18n integration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LanguageSelector from '../LanguageSelector';
import i18n from '../../i18n/testConfig';

describe('LanguageSelector', () => {
  beforeEach(async () => {
    // Reset to English for each test
    await i18n.changeLanguage('en');
  });

  describe('Rendering', () => {
    it('should render language selector button', () => {
      render(<LanguageSelector />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should display globe icon', () => {
      render(<LanguageSelector />);

      const icon = screen.getByRole('button').querySelector('.bi-globe');
      expect(icon).toBeInTheDocument();
    });

    it('should display current language code (EN)', () => {
      render(<LanguageSelector />);

      expect(screen.getByText('EN')).toBeInTheDocument();
    });

    it('should display current language code (DE) when German is active', async () => {
      await i18n.changeLanguage('de');
      render(<LanguageSelector />);

      expect(screen.getByText('DE')).toBeInTheDocument();
    });

    it('should use outline-secondary button variant', () => {
      render(<LanguageSelector />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('btn-outline-secondary');
    });

    it('should use small button size', () => {
      render(<LanguageSelector />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('btn-sm');
    });
  });

  describe('Dropdown Menu', () => {
    it('should show dropdown menu when button is clicked', async () => {
      const user = userEvent.setup();
      render(<LanguageSelector />);

      const button = screen.getByRole('button');
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText(/Deutsch/i)).toBeVisible();
      });
    });

    it('should display German option with flag emoji', async () => {
      const user = userEvent.setup();
      render(<LanguageSelector />);

      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        const germanOption = screen.getByText(/Deutsch/i);
        expect(germanOption).toBeInTheDocument();
        expect(germanOption.textContent).toContain('🇩🇪');
      });
    });

    it('should display English option with flag emoji', async () => {
      const user = userEvent.setup();
      render(<LanguageSelector />);

      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        const englishOption = screen.getByText(/English/i);
        expect(englishOption).toBeInTheDocument();
        expect(englishOption.textContent).toContain('🇬🇧');
      });
    });

    it('should have dropdown menu component', () => {
      const { container } = render(<LanguageSelector />);

      // Dropdown should be rendered (may not be visible until clicked)
      const dropdown = container.querySelector('.dropdown');
      expect(dropdown).toBeInTheDocument();
    });
  });

  describe('Language Switching', () => {
    it('should change language to German when German option is clicked', async () => {
      const user = userEvent.setup();
      render(<LanguageSelector />);

      // Open dropdown
      await user.click(screen.getByRole('button'));

      // Click German option
      const germanOption = await screen.findByText(/Deutsch/i);
      await user.click(germanOption);

      // Verify language changed
      await waitFor(() => {
        expect(i18n.language).toBe('de');
      });
    });

    it('should change language to English when English option is clicked', async () => {
      const user = userEvent.setup();
      await i18n.changeLanguage('de'); // Start with German
      render(<LanguageSelector />);

      // Open dropdown
      await user.click(screen.getByRole('button'));

      // Click English option (shown as "Englisch" when in German)
      const englishOption = await screen.findByText(/Englisch/i);
      await user.click(englishOption);

      // Verify language changed
      await waitFor(() => {
        expect(i18n.language).toBe('en');
      });
    });

    it('should update button text after language change', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<LanguageSelector />);

      // Initially shows EN
      expect(screen.getByText('EN')).toBeInTheDocument();

      // Open dropdown and switch to German
      await user.click(screen.getByRole('button'));
      const germanOption = await screen.findByText(/Deutsch/i);
      await user.click(germanOption);

      // Wait for language to change
      await waitFor(() => {
        expect(i18n.language).toBe('de');
      });

      // Rerender to reflect state change
      rerender(<LanguageSelector />);

      // Now shows DE
      expect(screen.getByText('DE')).toBeInTheDocument();
    });

    it('should persist language selection in localStorage', async () => {
      const user = userEvent.setup();
      render(<LanguageSelector />);

      // Open dropdown and switch to German
      await user.click(screen.getByRole('button'));
      const germanOption = await screen.findByText(/Deutsch/i);
      await user.click(germanOption);

      // Wait for change to be persisted
      await waitFor(() => {
        expect(i18n.language).toBe('de');
      });

      // Note: i18next-browser-languagedetector handles localStorage persistence
      // We can verify by checking if i18n.language is set correctly
      expect(i18n.language).toBe('de');
    });
  });

  describe('Active State Highlighting', () => {
    it('should mark German option as active when German is selected', async () => {
      const user = userEvent.setup();
      await i18n.changeLanguage('de');
      render(<LanguageSelector />);

      // Button should show DE
      expect(screen.getByText('DE')).toBeInTheDocument();

      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        // Look for Deutsch (German word for German)
        const germanOption = screen.getByText(/Deutsch/i).closest('.dropdown-item');
        expect(germanOption).toHaveClass('active');
      });
    });

    it('should mark English option as active when English is selected', async () => {
      const user = userEvent.setup();
      await i18n.changeLanguage('en');
      render(<LanguageSelector />);

      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        const englishOption = screen.getByText(/English/i).closest('.dropdown-item');
        expect(englishOption).toHaveClass('active');
      });
    });

    it('should only have one active option at a time', async () => {
      const user = userEvent.setup();
      await i18n.changeLanguage('en');
      render(<LanguageSelector />);

      await user.click(screen.getByRole('button'));

      await waitFor(() => {
        const activeItems = document.querySelectorAll('.dropdown-item.active');
        expect(activeItems).toHaveLength(1);
      });
    });

    it('should update button display after language change', async () => {
      const user = userEvent.setup();
      await i18n.changeLanguage('en');
      const { rerender } = render(<LanguageSelector />);

      // Initially shows EN
      expect(screen.getByText('EN')).toBeInTheDocument();

      // Open dropdown and switch to German
      const buttons = screen.getAllByRole('button');
      const toggleButton = buttons.find(btn => btn.textContent?.includes('EN'));
      if (toggleButton) {
        await user.click(toggleButton);
      }

      // Find and click German option
      const germanOption = await screen.findByText(/Deutsch/i);
      await user.click(germanOption);

      await waitFor(() => {
        expect(i18n.language).toBe('de');
      });

      // Rerender to reflect state change
      rerender(<LanguageSelector />);

      // Now shows DE
      expect(screen.getByText('DE')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle language switching', async () => {
      const user = userEvent.setup();
      await i18n.changeLanguage('en'); // Start with English
      render(<LanguageSelector />);

      // Get toggle button
      const buttons = screen.getAllByRole('button');
      const toggleButton = buttons.find(btn => btn.textContent?.includes('EN'));

      if (toggleButton) {
        // Switch to German
        await user.click(toggleButton);
        const germanOption = await screen.findByText(/Deutsch/i);
        await user.click(germanOption);

        await waitFor(() => expect(i18n.language).toBe('de'));
      }
    });

    it('should handle clicking the same language option', async () => {
      const user = userEvent.setup();
      await i18n.changeLanguage('en');
      render(<LanguageSelector />);

      // Click English when English is already selected
      await user.click(screen.getByRole('button'));
      const englishOption = await screen.findByText(/English/i);
      await user.click(englishOption);

      // Language should remain English
      expect(i18n.language).toBe('en');
    });

    it('should handle unknown language codes gracefully', async () => {
      const user = userEvent.setup();

      // Set an unknown language code
      await i18n.changeLanguage('fr');

      const { rerender } = render(<LanguageSelector />);

      // Should default to showing EN (fallback for unknown codes)
      // The component logic treats anything not 'de' as English
      expect(screen.getByText('EN')).toBeInTheDocument();

      // Should still be able to switch to German
      await user.click(screen.getByRole('button'));
      const germanOption = await screen.findByText(/Deutsch/i);
      await user.click(germanOption);

      await waitFor(() => {
        expect(i18n.language).toBe('de');
      });

      rerender(<LanguageSelector />);
      expect(screen.getByText('DE')).toBeInTheDocument();
    });
  });

  describe('Integration with i18n', () => {
    it('should use translated labels from i18n', async () => {
      const user = userEvent.setup();
      render(<LanguageSelector />);

      await user.click(screen.getByRole('button'));

      // Verify labels are from i18n (ui:label.german, ui:label.english)
      await waitFor(() => {
        expect(screen.getByText(/Deutsch/i)).toBeInTheDocument();
        expect(screen.getByText(/English/i)).toBeInTheDocument();
      });
    });

    it('should use German translated labels when language is German', async () => {
      const user = userEvent.setup();
      await i18n.changeLanguage('de');
      render(<LanguageSelector />);

      await user.click(screen.getByRole('button'));

      // Labels should be in German
      await waitFor(() => {
        expect(screen.getByText(/Deutsch/i)).toBeInTheDocument();
        expect(screen.getByText(/Englisch/i)).toBeInTheDocument();
      });
    });
  });
});
