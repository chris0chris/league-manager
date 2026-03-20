import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translations synchronously for tests
import uiDE from './locales/de/ui.json';
import domainDE from './locales/de/domain.json';
import validationDE from './locales/de/validation.json';
import modalDE from './locales/de/modal.json';
import errorDE from './locales/de/error.json';

import uiEN from './locales/en/ui.json';
import domainEN from './locales/en/domain.json';
import validationEN from './locales/en/validation.json';
import modalEN from './locales/en/modal.json';
import errorEN from './locales/en/error.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      de: {
        ui: uiDE,
        domain: domainDE,
        validation: validationDE,
        modal: modalDE,
        error: errorDE,
      },
      en: {
        ui: uiEN,
        domain: domainEN,
        validation: validationEN,
        modal: modalEN,
        error: errorEN,
      },
    },
    lng: 'en', // Set language explicitly for tests
    fallbackLng: 'en', // Use English for tests
    defaultNS: 'ui',
    ns: ['ui', 'domain', 'validation', 'modal', 'error'],
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
