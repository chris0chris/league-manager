import axios, { AxiosError } from "axios";
import { LOGIN_URL } from "../routes";
import { navigateTo } from "../utils";

export type ApiError = {
  message: string;
};

type Headers = {
  headers: {
    Authorization?: string;
    "Content-Type": string;
  };
};

export const loginStatus = (): Promise<boolean> => {
  const header = tokenConfig();

  return axios
    .get("/accounts/auth/user/", header)
    .then((res) => {
      return true;
    })
    .catch((error) => {
      if (error.response.status === 401) {
        navigateTo(`#${LOGIN_URL}`);
      } else {
        throwApiError(error);
      }
      return true;
    });
};

export const loginUser = async (
  username: string,
  password: string,
): Promise<void> => {
  const config = {
    headers: {
      "Content-Type": "application/json",
    },
  };

  const body = JSON.stringify({ username, password });

  return axios
    .post("/accounts/auth/login/", body, config)
    .then((res) => {
      console.log("auth/login", res);
      localStorage.setItem("token", res.data.token);
    })
    .catch((error) => {
      console.log("error :>>", error);
      throwApiError(error);
    });
};

export const axiosGet = async (url: string): Promise<any> => {
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
        window.location.href = "#/login";
      }
      throwApiError(error);
    });
};

export const axiosPut = (url: string, body: any): any => {
  return axios
    .put(url, body, tokenConfig())
    .then((res) => {
      if (res.data) {
        return res.data;
      }
    })
    .catch((error: AxiosError) => {
      console.error("api ERROR", error);
      if (error.response && error.response.status === 401) {
        if (process.env.NODE_ENV === "production") {
          window.location.href = "#/login";
        } else {
          alert(
            "`localStorage.setItem('token', '${localStorage.getItem('token')}')`",
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
      "detail" in error.response?.data!
    ) {
      message = error.response?.data?.detail as string;
    } else {
      message = JSON.stringify(error.response?.data);
    }
  }
  const apiError: ApiError = {
    message: message,
  };
  console.log("throwing ApiError :>>", apiError);
  throw apiError;
};
