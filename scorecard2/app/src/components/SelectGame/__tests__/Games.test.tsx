import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Game } from "../../../types";
import Games from "../Games";

describe("Games Component", () => {
  const mockOnClick = jest.fn();
  const mockLoadAllGames = jest.fn();
  const mockGames: Game[] = [
    {
      id: 1,
      scheduled: "10:00",
      field: 1,
      officials: "Ref A",
      home: "Team A",
      away: "Team B",
      isFinished: false,
      officialsId: 5,
    },
    {
      id: 2,
      scheduled: "12:00",
      field: 2,
      officials: "Ref B",
      home: "Team C",
      away: "Team D",
      isFinished: true,
      officialsId: 7,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders Games component with no games", () => {
    render(
      <Games
        games={[]}
        displayAll={false}
        onClick={mockOnClick}
        loadAllGames={mockLoadAllGames}
      />,
    );

    expect(screen.getByText("Bitte Spiel auswählen")).toBeInTheDocument();
    expect(screen.getByText("Keine Spiele zu pfeifen")).toBeInTheDocument();
  });

  it("renders Games component with games", () => {
    render(
      <Games
        games={mockGames}
        displayAll={false}
        onClick={mockOnClick}
        loadAllGames={mockLoadAllGames}
      />,
    );

    expect(screen.getByText("Bitte Spiel auswählen")).toBeInTheDocument();
    expect(screen.getByText("10:00")).toBeInTheDocument();
    expect(screen.getByText("Ref A")).toBeInTheDocument();
    expect(screen.getByText("Team A vs Team B")).toBeInTheDocument();
    expect(screen.getByText("Bearbeiten")).toBeInTheDocument();
    expect(screen.getByText("Auswählen")).toBeInTheDocument();
  });

  it("calls onClick when game button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <Games
        games={mockGames}
        displayAll={false}
        onClick={mockOnClick}
        loadAllGames={mockLoadAllGames}
      />,
    );

    await user.click(screen.getByText("Auswählen"));
    expect(mockOnClick).toHaveBeenCalledWith(mockGames[0].id);

    await user.click(screen.getByText("Bearbeiten"));
    expect(mockOnClick).toHaveBeenCalledWith(mockGames[1].id);
  });

  it("toggles the displayAll checkbox", async () => {
    const user = userEvent.setup();
    render(
      <Games
        games={mockGames}
        displayAll={false}
        onClick={mockOnClick}
        loadAllGames={mockLoadAllGames}
      />,
    );

    const checkbox = screen.getByLabelText("Zeige alle Spiele");
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);
    expect(mockLoadAllGames).toHaveBeenCalledWith(true);
    expect(checkbox).toBeChecked();

    await user.click(checkbox);
    expect(mockLoadAllGames).toHaveBeenCalledWith(false);
    expect(checkbox).not.toBeChecked();
  });

  it("updates the loadAll state when displayAll prop changes", () => {
    const { rerender } = render(
      <Games
        games={mockGames}
        displayAll={false}
        onClick={mockOnClick}
        loadAllGames={mockLoadAllGames}
      />,
    );

    const checkbox = screen.getByLabelText("Zeige alle Spiele");
    expect(checkbox).not.toBeChecked();

    rerender(
      <Games
        games={mockGames}
        displayAll={true}
        onClick={mockOnClick}
        loadAllGames={mockLoadAllGames}
      />,
    );

    expect(checkbox).toBeChecked();
  });
});
