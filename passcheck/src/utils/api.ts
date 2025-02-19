/* eslint-disable  @typescript-eslint/no-explicit-any */
import axios, { AxiosError } from "axios";
import { SCORECARD_URL } from "../common/routes";

export type ApiError = {
  message: string;
};

type Headers = {
  headers: {
    Authorization?: string;
    "Content-Type": string;
  };
};

export const apiPut = (url: string, body: any) => {
  const header = tokenConfig();
  return axios
    .put(url, body, header)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
    .then((res) => {})
    .catch((err) => {
      console.error(err);
      throwApiError(err);
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
      console.error("api ERROR", error);
      if (error.response && error.response.status === 401) {
        if (process.env.NODE_ENV === "production") {
          window.location.href = SCORECARD_URL;
        } else {
          alert(
            `localStorage.setItem('token', '${localStorage.getItem("token")}')`
          );
          throwApiError("Bitte erst anmelden.");
        }
      } else {
        throwApiError(error);
      }
    });
};

const tokenConfig = () => {
  const token = localStorage.getItem("token");

  const config: Headers = {
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (token) {
    config.headers["Authorization"] = `Token ${token}`;
  }

  return config;
};

const throwApiError = (error: AxiosError<unknown, any> | string) => {
  let message = "";
  if (typeof error === "string") {
    message = error;
  } else {
    message = error.message;
    if (
      typeof error.response?.data === "object" &&
      error.response.data !== null &&
      "detail" in error.response.data
    ) {
      message = error.response?.data?.detail as string;
    }
  }
  const apiError: ApiError = {
    message: message,
  };
  throw apiError;
};
