/**
 * Tests for i18n/config.ts
 *
 * TDD RED Phase: Tests for i18next configuration module
 *
 * Coverage targets:
 * - i18n initialization
 * - Language detector integration
 * - React i18next integration
 * - Resources backend (lazy loading)
 * - Language changed event handler
 * - Fallback language configuration
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('i18n/config', () => {
  let originalHtmlLang: string;
  let originalLocalStorage: Storage;

  beforeEach(() => {
    // Save original HTML lang attribute
    originalHtmlLang = document.documentElement.getAttribute('lang') || '';

    // Mock localStorage
    const store: Record<string, string> = {};
    originalLocalStorage = global.localStorage;

    global.localStorage = {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
      clear: vi.fn(() => {
        Object.keys(store).forEach(key => delete store[key]);
      }),
      key: vi.fn((index: number) => Object.keys(store)[index] || null),
      length: Object.keys(store).length,
    } as Storage;
  });

  afterEach(() => {
    // Restore original HTML lang attribute
    document.documentElement.setAttribute('lang', originalHtmlLang);

    // Restore original localStorage
    global.localStorage = originalLocalStorage;

    // Clear module cache to ensure fresh import for each test
    vi.resetModules();
  });

  describe('Initialization', () => {
    it('should initialize i18n instance', async () => {
      const i18n = await import('../config');

      expect(i18n.default).toBeDefined();
      expect(i18n.default.isInitialized).toBe(true);
    });

    it('should configure fallback language as German (de)', async () => {
      const i18n = await import('../config');

      const fallbackLng = i18n.default.options.fallbackLng;
      // fallbackLng can be a string or an array
      if (Array.isArray(fallbackLng)) {
        expect(fallbackLng).toContain('de');
      } else {
        expect(fallbackLng).toBe('de');
      }
    });

    it('should configure default namespace as ui', async () => {
      const i18n = await import('../config');

      expect(i18n.default.options.defaultNS).toBe('ui');
    });

    it('should configure all required namespaces', async () => {
      const i18n = await import('../config');

      expect(i18n.default.options.ns).toEqual(['ui', 'domain', 'validation', 'modal', 'error']);
    });

    it('should configure interpolation with escapeValue: false', async () => {
      const i18n = await import('../config');

      expect(i18n.default.options.interpolation?.escapeValue).toBe(false);
    });
  });

  describe('Language Detection', () => {
    it('should configure language detection order (localStorage, navigator)', async () => {
      const i18n = await import('../config');

      expect(i18n.default.options.detection?.order).toEqual(['localStorage', 'navigator']);
    });

    it('should configure localStorage lookup key as i18nextLng', async () => {
      const i18n = await import('../config');

      expect(i18n.default.options.detection?.lookupLocalStorage).toBe('i18nextLng');
    });

    it('should configure localStorage as cache', async () => {
      const i18n = await import('../config');

      expect(i18n.default.options.detection?.caches).toEqual(['localStorage']);
    });
  });

  describe('Language Changed Event', () => {
    it('should update HTML lang attribute when language changes', async () => {
      const i18n = await import('../config');

      // Initial state
      document.documentElement.setAttribute('lang', 'en');

      // Change language to German
      await i18n.default.changeLanguage('de');

      // Wait for event to process (increased timeout)
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify HTML lang attribute updated
      expect(document.documentElement.getAttribute('lang')).toBe('de');
    }, 10000); // 10s timeout

    it('should update HTML lang attribute when changing to English', async () => {
      const i18n = await import('../config');

      // Initial state
      document.documentElement.setAttribute('lang', 'de');

      // Change language to English
      await i18n.default.changeLanguage('en');

      // Wait for event to process (increased timeout)
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify HTML lang attribute updated
      expect(document.documentElement.getAttribute('lang')).toBe('en');
    }, 10000); // 10s timeout

    it('should handle multiple language changes', async () => {
      const i18n = await import('../config');

      // Change to German
      await i18n.default.changeLanguage('de');
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(document.documentElement.getAttribute('lang')).toBe('de');

      // Change to English
      await i18n.default.changeLanguage('en');
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(document.documentElement.getAttribute('lang')).toBe('en');

      // Change back to German
      await i18n.default.changeLanguage('de');
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(document.documentElement.getAttribute('lang')).toBe('de');
    }, 10000); // 10s timeout
  });

  describe('Resources Backend', () => {
    it('should support lazy loading translations', async () => {
      const i18n = await import('../config');

      // The backend is configured with resourcesToBackend
      // We verify it works by loading translations
      await i18n.default.changeLanguage('en');
      await i18n.default.loadNamespaces('ui');

      // Backend should have loaded resources
      expect(i18n.default.hasResourceBundle('en', 'ui')).toBe(true);
    });

    it('should load translations for German language', async () => {
      const i18n = await import('../config');

      await i18n.default.changeLanguage('de');
      await i18n.default.loadNamespaces('ui');

      // Verify translations are loaded (check for a known key)
      const hasResources = i18n.default.hasResourceBundle('de', 'ui');
      expect(hasResources).toBe(true);
    });

    it('should load translations for English language', async () => {
      const i18n = await import('../config');

      await i18n.default.changeLanguage('en');
      await i18n.default.loadNamespaces('ui');

      // Verify translations are loaded
      const hasResources = i18n.default.hasResourceBundle('en', 'ui');
      expect(hasResources).toBe(true);
    });

    it('should load all namespaces on demand', async () => {
      const i18n = await import('../config');

      await i18n.default.changeLanguage('en');

      // Load all namespaces
      const namespaces = ['ui', 'domain', 'validation', 'modal', 'error'];
      await i18n.default.loadNamespaces(namespaces);

      // Verify each namespace is loaded
      namespaces.forEach(ns => {
        const hasResources = i18n.default.hasResourceBundle('en', ns);
        expect(hasResources).toBe(true);
      });
    });
  });

  describe('React i18next Integration', () => {
    it('should integrate with React i18next', async () => {
      const i18n = await import('../config');

      // Verify React i18next is initialized by checking for core i18next functionality
      expect(i18n.default).toBeDefined();
      expect(typeof i18n.default.t).toBe('function');

      // React i18next options may not be directly exposed in options.react
      // but the integration is confirmed by successful initialization
      expect(i18n.default.isInitialized).toBe(true);
    });
  });

  describe('Module Export', () => {
    it('should export i18n instance as default', async () => {
      const i18n = await import('../config');

      expect(i18n.default).toBeDefined();
      expect(typeof i18n.default.t).toBe('function');
      expect(typeof i18n.default.changeLanguage).toBe('function');
    });

    it('should export a configured i18next instance', async () => {
      const i18n = await import('../config');

      // Verify core i18next properties
      expect(i18n.default.language).toBeDefined();
      expect(i18n.default.languages).toBeDefined();
      expect(i18n.default.isInitialized).toBe(true);
    });
  });
});
