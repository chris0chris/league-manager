import React from 'react';
import {Navigate} from 'react-router-dom';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import {LOGIN_URL} from './urls';

const PrivateRoute = ({component: Component, auth, ...rest}) => {
  return (
    <div>
      {auth.isLoading &&
          <h2>Loading ... </h2>}
      {!auth.isAuthenticated &&
      <Navigate to={LOGIN_URL} />}
      {!auth.isLoading && auth.isAuthenticated &&
         <Component />}
    </div>
  );
};

const mapStateToProps = (state) => ({
  auth: state.authReducer,
});

PrivateRoute.propTypes = {
  component: PropTypes.object.isRequired,
  auth: PropTypes.object.isRequired,
};

export default connect(mapStateToProps)(PrivateRoute);
