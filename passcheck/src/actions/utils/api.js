import axios from 'axios';
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
//
//export const apiPut = (url, body, successType, errorType) => async (
//    dispatch,
//    getState,
//) => {
//  const header = tokenConfig(getState);
//
//  await axios
//      .put(url, body, header)
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
export const apiGet = async (url) => {
  return await axios
      .get(url, tokenConfig())
      .then((res) => {
        if (res.data) {
          return res.data;
        }

      })
      .catch((err) =>
        console.error(err)
      );
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
