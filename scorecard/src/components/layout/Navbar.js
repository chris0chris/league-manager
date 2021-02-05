import React, {useState} from 'react';
import {Link} from 'react-router-dom';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';

import {logoutUser} from '../../actions/auth';
import {LOGIN_URL} from '../common/urls';

const Navbar = (props) => {
  const {isAuthenticated, user} = props.auth;
  const [expanded, setExpanded] = useState(false);
  const authLinks = (
    <ul className="navbar-nav ml-auto mt-2 mt-lg-0">
      <span className="navbar-text mr-3">
        <strong>{user ? `Hallo ${user.username}` : ''}</strong>
      </span>

      <li className="nav-item">
        <button
          onClick={props.logoutUser}
          className="nav-link btn btn-info btn-sm text-light"
        >
          Logout
        </button>
      </li>
    </ul>
  );

  const guestLinks = (
    <ul className="navbar-nav ml-auto mt-2 mt-lg-0">
      <li className="nav-item">
        <Link to={LOGIN_URL} className="nav-link">
          Login
        </Link>
      </li>
    </ul>
  );

  return (
    <nav className="navbar fixed-bottom navbar-expand-sm navbar-light bg-light">
      <div className="container">
        <a className="navbar-brand" href="#">
          Menü
        </a>
        <button
          className={`navbar-toggler ${expanded ? '' : 'collapsed'}`}
          type="button"
          data-toggle="collapse"
          data-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded={expanded}
          aria-label="Toggle navigation"
          onClick={() => setExpanded(!expanded)}
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div
          className={`collapse navbar-collapse ${expanded ? 'show' : ''}`}
          id="navbarNav"
        >
          {isAuthenticated ? authLinks : guestLinks}
        </div>
      </div>
    </nav>
  );
};

Navbar.propTypes = {
  auth: PropTypes.object.isRequired,
  logoutUser: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  auth: state.authReducer,
});
export default connect(mapStateToProps, {logoutUser})(Navbar);
