import { loginStatus, loginUser } from "./axiosApi";

export const login = async (
  username: string,
  password: string,
): Promise<void> => {
  return loginUser(username, password);
};

export const loadUser = (): Promise<boolean> => {
  return loginStatus();
};
