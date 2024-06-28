import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Gameday } from "../../../types";
import Gamedays from "../Gamedays";

describe("Gamedays Component", () => {
  const mockOnClick = jest.fn();
  const mockGamedays: Gameday[] = [
    { id: 1, date: "2023-06-01", name: "Gameday 1", games: [] },
    { id: 2, date: "2023-07-01", name: "Gameday 2", games: [] },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders Gamedays component with no gamedays", () => {
    render(<Gamedays gamedays={[]} onClick={mockOnClick} />);

    expect(
      screen.getByText("Bitte einen Spieltag auswählen"),
    ).toBeInTheDocument();
    expect(screen.getByText("Keine Spieltage verfügbar")).toBeInTheDocument();
  });

  test("renders Gamedays component with multiple gamedays", () => {
    render(<Gamedays gamedays={mockGamedays} onClick={mockOnClick} />);

    expect(
      screen.getByText("Bitte einen Spieltag auswählen"),
    ).toBeInTheDocument();
    expect(screen.getByText("Gameday 1")).toBeInTheDocument();
    expect(screen.getByText("Gameday 2")).toBeInTheDocument();
  });

  test("calls onClick and sets active row when a gameday is selected", async () => {
    const user = userEvent.setup();
    render(<Gamedays gamedays={mockGamedays} onClick={mockOnClick} />);

    await user.click(screen.getAllByText("Auswählen")[0]);

    expect(mockOnClick).toHaveBeenCalledWith(1);
    expect(screen.getAllByRole("row")[1]).toHaveClass("table-success");
  });

  test("automatically sets the active row if there is only one gameday", () => {
    render(<Gamedays gamedays={[mockGamedays[0]]} onClick={mockOnClick} />);

    expect(screen.getByRole("row", { name: /gameday 1/i })).toHaveClass(
      "table-success",
    );
  });
});
