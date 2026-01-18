import React from 'react';
import { Container, Navbar, Nav, Button } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTypedTranslation } from '../../i18n/useTypedTranslation';
import LanguageSelector from '../LanguageSelector';
import { useGamedayContext } from '../../context/GamedayContext';

/**
 * Global App Header for Gameday Designer.
 * 
 * Displays: [App Title] - [Page Title] ... [Language] [UserProfile]
 */
const AppHeader: React.FC = () => {
  const { t } = useTypedTranslation(['ui']);
  const { gamedayName } = useGamedayContext();
  const navigate = useNavigate();
  const location = useLocation();

  const isEditor = location.pathname.includes('/designer/');
  const pageTitle = isEditor 
    ? (gamedayName || t('ui:placeholder.gamedayName'))
    : t('ui:label.dashboard');

  return (
    <Navbar bg="dark" variant="dark" expand="lg" className="mb-4 shadow-sm">
      <Container fluid>
        <Navbar.Brand 
          onClick={() => navigate('/')} 
          style={{ cursor: 'pointer' }}
          className="d-flex align-items-center"
        >
          <i className="bi bi-calendar3-event me-2"></i>
          <span className="fw-bold">{t('ui:button.gamedayDesigner')}</span>
          <span className="mx-2 text-muted">|</span>
          <span className="text-light opacity-75">{pageTitle}</span>
        </Navbar.Brand>

        <Nav className="me-auto">
          {isEditor && (
            <Button 
              variant="outline-light" 
              size="sm" 
              onClick={() => navigate('/')}
              className="ms-2 d-flex align-items-center"
              title={t('ui:button.backToDashboard')}
            >
              <i className="bi bi-arrow-left me-1"></i>
              {t('ui:label.back')}
            </Button>
          )}
        </Nav>

        <Navbar.Toggle aria-controls="header-navbar-nav" />
        <Navbar.Collapse id="header-navbar-nav" className="justify-content-end">
          <Nav className="align-items-center gap-3">
            <div className="d-flex align-items-center">
              <LanguageSelector />
            </div>
            
            <div className="d-flex align-items-center text-light border-start ps-3 ms-1" style={{ height: '24px' }}>
              <i className="bi bi-person-circle me-2 fs-5"></i>
              <span className="small fw-medium">User</span>
            </div>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default AppHeader;
