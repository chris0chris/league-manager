import axios from 'axios';
import {SCORECARD_URL} from '../common/routes';

export const apiPut = (url, body) => {
  const header = tokenConfig();

  axios
    .put(url, body, header)
    .then((res) => {})
    .catch((err) => {
      console.error(err);
    });
};

export const apiGet = (url) => {
  return axios
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
