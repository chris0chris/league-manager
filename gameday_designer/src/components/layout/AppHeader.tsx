import React from 'react';
import { Container, Navbar, Nav, Button } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTypedTranslation } from '../../i18n/useTypedTranslation';
import LanguageSelector from '../LanguageSelector';
import FlowToolbar from '../FlowToolbar';
import { useGamedayContext } from '../../context/GamedayContext';

/**
 * Global App Header for Gameday Designer.
 * 
 * Displays: [App Title] - [Page Title] ... [Generate] [Import/Export] [Language] [UserProfile]
 */
const AppHeader: React.FC = () => {
  const { t } = useTypedTranslation(['ui']);
  const { gamedayName, onGenerateTournament, toolbarProps, isLocked } = useGamedayContext();
  const navigate = useNavigate();
  const location = useLocation();

  const isEditor = location.pathname.includes('/designer/');
  const pageTitle = isEditor 
    ? (gamedayName || t('ui:placeholder.gamedayName'))
    : t('ui:label.dashboard');

  return (
    <Navbar bg="dark" variant="dark" expand="lg" className="mb-2 shadow-sm py-1">
      <Container fluid>
        <div className="d-flex align-items-center">
          <Navbar.Brand 
            onClick={() => navigate('/')} 
            style={{ cursor: 'pointer' }}
            className="d-flex align-items-center me-0"
          >
            <i className="bi bi-calendar3-event me-2"></i>
            <span className="fw-bold">{t('ui:button.gamedayDesigner')}</span>
          </Navbar.Brand>

          {isEditor && (
            <div className="d-flex align-items-center ms-3">
              <Button 
                variant="outline-light" 
                size="sm" 
                onClick={() => navigate('/')}
                className="d-flex align-items-center me-3"
                style={{ fontSize: '0.8rem', padding: '0.15rem 0.5rem' }}
                title={t('ui:button.backToDashboard')}
              >
                <i className="bi bi-arrow-left me-1"></i>
                {t('ui:label.back')}
              </Button>
              <span className="mx-2 text-muted">|</span>
              <span className="text-light opacity-75">{pageTitle}</span>
            </div>
          )}
        </div>

        <div className="me-auto" />

        <Navbar.Toggle aria-controls="header-navbar-nav" />
        <Navbar.Collapse id="header-navbar-nav" className="justify-content-end">
          <Nav className="align-items-center gap-3">
            {isEditor && onGenerateTournament && (
              <Button
                variant="outline-primary"
                onClick={onGenerateTournament}
                size="sm"
                className="btn-adaptive text-light border-light opacity-75 hover-opacity-100"
                disabled={isLocked}
                title={t('ui:tooltip.generateTournament')}
              >
                <i className={`bi bi-magic me-2`}></i>
                <span className="btn-label-adaptive">{t('ui:button.generateTournament')}</span>
              </Button>
            )}

            {isEditor && toolbarProps && (
              <div className="header-toolbar-wrapper">
                <FlowToolbar {...toolbarProps} />
              </div>
            )}

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
