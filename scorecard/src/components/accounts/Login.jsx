import React, {useState} from 'react';
import {Navigate} from 'react-router-dom';
import {connect, useDispatch} from 'react-redux';
import PropTypes from 'prop-types';
import {loginUser} from '../../actions/auth';
// import {setSelectedGame} from '../../actions/games';
import {ROOT_URL} from '../common/urls';
import {GAME_LOG_COMPLETE_GAME} from '../../__tests__/testdata/gameLogData';

const Login = (props) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const onSubmit = (e) => {
    e.preventDefault();
    props.loginUser(username, password);
  };
  const ENTRY_FROM_START = true;
  // ENTRY_FROM_START = false;
  if (props.isAuthenticated) {
    if (process.env.NODE_ENV === 'production' || ENTRY_FROM_START) {
      return <Navigate to={ROOT_URL} />;
    } else {
      // props.setSelectedGame({
      //   'scheduled': '18:10:00',
      //   'field': 1,
      //   'officials': 'Rooks',
      //   'officialsId': 23,
      //   'stage': 'Finalrunde',
      //   'standing': 'P1',
      //   'home': 'Sparr',
      //   'points_home': 27,
      //   'points_away': 26,
      //   'away': 'Spatz',
      //   'status': 'geplant',
      //   'id_home': 117,
      //   'id_away': 118,
      //   'id': 59,
      // });
      // return <Navigate to="/officials" />;
      const dispatch = useDispatch();
      dispatch({
        type: 'GET_GAME_LOG',
        payload: GAME_LOG_COMPLETE_GAME,
      });

      return <Navigate to='/finalize' />;
    }
  }

  return (
    <div className='col-md-6 m-auto'>
      <div className='card card-body mt-5'>
        <h2 className='text-center'>Login</h2>
        <form onSubmit={onSubmit}>
          <div className='form-group'>
            <label>Username</label>
            <input
              type='text'
              className='form-control'
              name='username'
              onChange={(e) => setUsername(e.target.value)}
              value={username}
            />
          </div>

          <div className='form-group'>
            <label>Password</label>
            <input
              type='password'
              className='form-control'
              name='password'
              onChange={(e) => setPassword(e.target.value)}
              value={password}
            />
          </div>

          <div className='form-group d-grid mt-3'>
            <button type='submit' className='btn btn-primary'>
              Login
            </button>
          </div>
          <div className='mt-3'>
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

export default connect(mapStateToProps, {loginUser /* , setSelectedGame*/})(
  Login
);
