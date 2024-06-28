import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { loadGamedays } from "../../../common/api/gameDays";
import SelectGame from "../SelectGame";

jest.mock("../../../common/api/gameDays");
const mockLoadGamedays = loadGamedays as jest.MockedFunction<
  typeof loadGamedays
>;

describe("SelectGame component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders without games", async () => {
    const mockGamedaysOverview = {
      officiatingTeamId: 1,
      gamedays: [
        { id: 1, name: "Test Gameday", date: "2024-06-26", games: [] },
      ],
    };
    mockLoadGamedays.mockResolvedValueOnce(mockGamedaysOverview);
    render(
      <MemoryRouter>
        <SelectGame />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(
        screen.queryByText(/Bitte einen Spieltag auswählen/i),
      ).not.toBeInTheDocument();
    });
    await screen.findByText("Test Gameday");
    expect(screen.getByText("Test Gameday")).toBeInTheDocument();
    expect(screen.getByText("Keine Spiele zu pfeifen")).toBeInTheDocument();
  });

  test("renders Gamedays and Games components", async () => {
    const mockGamedaysOverview = {
      officiatingTeamId: 1,
      gamedays: [
        {
          id: 1,
          name: "Test Gameday",
          date: "2024-06-26",
          games: [
            {
              id: 1,
              scheduled: "15:00",
              field: 1,
              officials: "Ref U",
              home: "Team V",
              away: "Team W",
              isFinished: false,
              officialsId: 5,
            },
            {
              id: 2,
              scheduled: "17:00",
              field: 2,
              officials: "Ref X",
              home: "Team Y",
              away: "Team Z",
              isFinished: true,
              officialsId: 7,
            },
          ],
        },
      ],
    };
    mockLoadGamedays.mockResolvedValueOnce(mockGamedaysOverview);
    render(
      <MemoryRouter>
        <SelectGame />
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(
        screen.queryByText(/Bitte einen Spieltag auswählen/i),
      ).not.toBeInTheDocument();
    });
    await screen.findByText("Test Gameday");
    expect(screen.getByText("Test Gameday")).toBeInTheDocument();
    expect(screen.getByText("Ref U")).toBeInTheDocument();
  });
});
