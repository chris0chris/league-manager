import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SelectPasscheckOrScorecard from "../SelectPasscheckOrScorecard";
import { getPasscheckStatus } from "../../common/api/config";
import { SELECT_GAME_URL } from "../../common/routes";
import { navigateTo } from "../../common/utils";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import SelectGame from "../SelectGame";

jest.mock("../../common/api/config", () => ({
  getPasscheckStatus: jest.fn(),
}));
jest.mock("../../common/utils", () => ({
  navigateTo: jest.fn(),
}));
jest.mock("../SelectGame", () => () => <div>SelectGame Component</div>);

describe("SelectPasscheckOrScorecard", () => {
  beforeEach(() => {
    (getPasscheckStatus as jest.Mock).mockResolvedValue(false);
  });

  test("renders the component and buttons correctly", () => {
    render(
      <MemoryRouter>
        <SelectPasscheckOrScorecard />
      </MemoryRouter>,
    );

    expect(screen.getByText("Passcheck")).toBeInTheDocument();
    expect(screen.getByText("Scorecard")).toBeInTheDocument();
  });

  test("redirects to /passcheck when Passcheck button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SelectPasscheckOrScorecard />
      </MemoryRouter>,
    );

    await user.click(screen.getByText("Passcheck"));
    await waitFor(() => {
      expect(navigateTo).toHaveBeenCalledWith("/passcheck");
    });
  });

  test("redirects to scorecard when Scorecard button is clicked", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<SelectPasscheckOrScorecard />} />
          <Route path={SELECT_GAME_URL} element={<SelectGame />} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(screen.getByText("Scorecard"));

    expect(await screen.findByText("SelectGame Component")).toBeInTheDocument();
  });

  test("navigates to SELECT_GAME_URL when passcheck status is completed", async () => {
    (getPasscheckStatus as jest.Mock).mockResolvedValue(true);

    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<SelectPasscheckOrScorecard />} />
          <Route path={SELECT_GAME_URL} element={<SelectGame />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("SelectGame Component")).toBeInTheDocument();
  });
});
