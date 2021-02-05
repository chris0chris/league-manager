import React from 'react';
import {Route, Redirect} from 'react-router-dom';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import {LOGIN_URL} from './urls';

const PrivateRoute = ({component: Component, auth, ...rest}) => {
  return (
    <Route
      {...rest}
      render={(props) => {
        if (auth.isLoading) {
          return <h2>Loading ... </h2>;
        } else if (!auth.isAuthenticated) {
          return <Redirect to={LOGIN_URL} />;
        } else {
          return <Component {...props} />;
        }
      }}
    />
  );
};

const mapStateToProps = (state) => ({
  auth: state.authReducer,
});

PrivateRoute.propTypes = {
  component: PropTypes.object.isRequired,
  auth: PropTypes.shape({
    isLoading: PropTypes.bool.isRequired,
    isAuthenticated: PropTypes.bool.isRequired,
  }),
};

export default connect(mapStateToProps)(PrivateRoute);
