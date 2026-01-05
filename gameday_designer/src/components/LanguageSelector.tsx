/**
 * LanguageSelector Component
 *
 * Provides a dropdown for switching between German and English languages.
 * Language selection is persisted in localStorage and updates the HTML lang attribute.
 */

import React from 'react';
import { Dropdown, ButtonGroup } from 'react-bootstrap';
import { useTypedTranslation } from '../i18n/useTypedTranslation';

/**
 * LanguageSelector component.
 */
const LanguageSelector: React.FC = () => {
  const { t, i18n } = useTypedTranslation('ui');

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const currentLanguage = i18n.language === 'de' ? 'DE' : 'EN';

  return (
    <Dropdown as={ButtonGroup}>
      <Dropdown.Toggle variant="outline-secondary" size="sm">
        <i className="bi bi-globe me-1"></i>
        {currentLanguage}
      </Dropdown.Toggle>
      <Dropdown.Menu align="end">
        <Dropdown.Item
          onClick={() => changeLanguage('de')}
          active={i18n.language === 'de'}
        >
          🇩🇪 {t('label.german')}
        </Dropdown.Item>
        <Dropdown.Item
          onClick={() => changeLanguage('en')}
          active={i18n.language === 'en'}
        >
          🇬🇧 {t('label.english')}
        </Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  );
};

export default LanguageSelector;
