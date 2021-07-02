import React, {useState} from 'react';
import {Redirect} from 'react-router-dom';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import {loginUser} from '../../actions/auth';
import {ROOT_URL} from '../common/urls';

const Login = (props) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const onSubmit = (e) => {
    e.preventDefault();
    props.loginUser(username, password);
  };
  if (props.isAuthenticated) {
    if (process.env.NODE_ENV === 'production') {
      return <Redirect to={ROOT_URL} />;
    } else {
      return <Redirect to="/details" />;
    }
  }

  return (
    <div className="col-md-6 m-auto">
      <div className="card card-body mt-5">
        <h2 className="text-center">Login</h2>
        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              className="form-control"
              name="username"
              onChange={(e) => setUsername(e.target.value)}
              value={username}
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              className="form-control"
              name="password"
              onChange={(e) => setPassword(e.target.value)}
              value={password}
            />
          </div>

          <div className="form-group d-grid mt-3">
            <button type="submit" className="btn btn-primary">
              Login
            </button>
          </div>
          <div className="mt-3">
            Du hast keine Login-Daten? Oh, oh ... bitte an dein Teammanagement
            oder die Ligaorganisation wenden.
          </div>
        </form>
      </div>
    </div>
  );
};

const mapStateToProps = (state) => ({
  isAuthenticated: state.authReducer.isAuthenticated,
});

Login.propTypes = {
  loginUser: PropTypes.func.isRequired,
  isAuthenticated: PropTypes.bool,
};

export default connect(mapStateToProps, {loginUser})(Login);
