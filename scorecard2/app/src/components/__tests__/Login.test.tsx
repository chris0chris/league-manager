import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Login from "../Login";
import { login } from "../../common/api/auth";
import useNotification from "../../hooks/useNotification";
import { SELECT_APP_URL } from "../../common/routes";
import SelectPasscheckOrScorecard from "../SelectPasscheckOrScorecard";

jest.mock("../../common/api/auth");
jest.mock("../../hooks/useNotification");
jest.mock("../SelectPasscheckOrScorecard", () => () => (
  <div>SelectPasscheckOrScorecard Component</div>
));

describe("Login Component", () => {
  const setNotificationMock = jest.fn();

  beforeEach(() => {
    (useNotification as jest.Mock).mockReturnValue({
      setNotification: setNotificationMock,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders Login form", () => {
    render(<Login />);

    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/passwort/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /anmelden/i }),
    ).toBeInTheDocument();
  });

  test("redirects to SELECT_APP_URL on successful login", async () => {
    (login as jest.Mock).mockResolvedValueOnce(true);

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route
            path={SELECT_APP_URL}
            element={<SelectPasscheckOrScorecard />}
          />
        </Routes>
      </MemoryRouter>,
    );

    userEvent.type(screen.getByLabelText(/username/i), "testuser");
    userEvent.type(screen.getByLabelText(/passwort/i), "password");
    userEvent.click(screen.getByRole("button", { name: /anmelden/i }));

    await waitFor(() => {
      expect(screen.queryByText(/anmelden/i)).not.toBeInTheDocument();
    });
    expect(
      await screen.findByText("SelectPasscheckOrScorecard Component"),
    ).toBeInTheDocument();
  });

  test("shows notification on login failure", async () => {
    const errorMessage = "Invalid credentials";
    (login as jest.Mock).mockRejectedValueOnce(new Error(errorMessage));

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Login />
      </MemoryRouter>,
    );

    userEvent.type(screen.getByLabelText(/username/i), "testuser");
    userEvent.type(screen.getByLabelText(/passwort/i), "wrong password");
    userEvent.click(screen.getByRole("button", { name: /anmelden/i }));

    await waitFor(() => {
      expect(setNotificationMock).toHaveBeenCalledWith({ text: errorMessage });
    });
  });
});
