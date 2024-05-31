import { render, screen, waitFor } from "@testing-library/react";

import App from "./App";
import { LOGIN_URL } from "./common/routes";
import axios from "axios";

jest.mock("axios");

const mockedAxios = axios as jest.Mocked<typeof axios>;

jest.mock("./components/Login", () => () => <div>Login Component</div>);

describe("App Component", () => {
  beforeEach(() => {
    mockedAxios.get.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("calls loadUser on mount", () => {
    const loadUserMock = jest.fn();
    const loadUserSpy = jest
      .spyOn(require("./common/api/auth"), "loadUser")
      .mockImplementation(loadUserMock);
    render(<App />);
    expect(loadUserSpy).toHaveBeenCalled();
    loadUserSpy.mockRestore();
  });

  it("renders Login component for LOGIN_URL", async () => {
    mockedAxios.get.mockRejectedValue({ response: { status: 401 } });
    render(<App />);
    await waitFor(() => {
      expect(mockedAxios.get.mock.calls[0][0]).toBe("/accounts/auth/user/");
    });
    expect(window.location.hash).toEqual(`#${LOGIN_URL}`);
    expect(await screen.findByText("Login Component")).toBeInTheDocument();
  });
});
