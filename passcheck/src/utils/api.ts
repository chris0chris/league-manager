import axios, {AxiosError} from 'axios';
import {SCORECARD_URL} from '../common/routes';
import { instanceOf } from 'prop-types';

export type ApiError = {
  message: string;
};

type Headers = {
  headers: {
    Authorization?: string;
    'Content-Type': string;
  };
};

export const apiPut = (url: string, body: any) => {
  const header = tokenConfig();

  axios
    .put(url, body, header)
    .then((res) => {})
    .catch((err) => {
      console.error(err);
    });
};

export const apiGet = (url: string): any => {
  return axios
    .get(url, tokenConfig())
    .then((res) => {
      if (res.data) {
        return res.data;
      }
    })
    .catch((error: AxiosError) => {
      console.log('api.get ERROR', error);
      if (error.response && error.response.status === 401) {
        if (process.env.NODE_ENV === 'production') {
          window.location.href = SCORECARD_URL;
        } else {
          alert(
            "`localStorage.setItem('token', '${localStorage.getItem('token')}')`"
          );
          const apiError: ApiError = {
            message: 'Bitte erst anmelden',
          };
          throw apiError;
        }
      } else {
        let message = error.message;
        if (error.response) {
          message = (error.response as any).data.detail;
        }
        const apiError: ApiError = {
          message: message,
        };
        throw apiError;
      }
    });
};

const tokenConfig = () => {
  const token = localStorage.getItem('token');

  const config: Headers = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (token) {
    config.headers['Authorization'] = `Token ${token}`;
  }

  return config;
};
