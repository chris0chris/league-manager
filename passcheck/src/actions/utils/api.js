import axios from 'axios';
import {SCORECARD_URL} from '../../common/routes';
//
//export const apiPost = (url, body, successType, errorType) => async (
//    dispatch,
//    getState,
//) => {
//  const header = tokenConfig(getState);
//
//  await axios
//      .post(url, body, header)
//      .then((res) => {
//        dispatch({
//          type: successType,
//          payload: res.data,
//        });
//      })
//      .catch((err) => {
//        dispatch(returnErrors(err.response.data, err.response.status));
//        dispatch({
//          type: errorType,
//        });
//      });
//};
//
//export const apiDelete = (url, body, successType, errorType) => async (
//    dispatch,
//    getState,
//) => {
//  const header = tokenConfig(getState);
//
//  await axios
//      .delete(url, {...header, data: body})
//      .then((res) => {
//        dispatch({
//          type: successType,
//          payload: res.data,
//        });
//      })
//      .catch((err) => {
//        dispatch(returnErrors(err.response.data, err.response.status));
//        dispatch({
//          type: errorType,
//        });
//      });
//};

export const apiPut = async (url, body) => {
  const header = tokenConfig();

  await axios
    .put(url, body, header)
    .then((res) => {})
    .catch((err) => {
      console.error(err);
    });
};

export const apiGet = async (url) => {
  return await axios
    .get(url, tokenConfig())
    .then((res) => {
      if (res.data) {
        return res.data;
      }
    })
    .catch((error) => {
      console.log('api.get ERROR', error);
      if (error.response && error.response.status === 401) {
        if (process.env.NODE_ENV === 'production') {
          window.location.href = SCORECARD_URL;
        } else {
          alert(
            "`localStorage.setItem('token', '${localStorage.getItem('token')}')`"
          );
        }
      } else {
        console.error('Error fetching data:', error.message);
      }
    });
};

const tokenConfig = () => {
  const token = localStorage.getItem('token');

  const config = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (token) {
    config.headers['Authorization'] = `Token ${token}`;
  }

  return config;
};
