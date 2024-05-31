import { render, screen } from "@testing-library/react";
import Notification from "../../components/Notification";
import useNotification from "../../hooks/useNotification";
import { NotificationColor } from "../../context/NotificationContext";

jest.mock("../../hooks/useNotification");

const mockedUseNotification = useNotification as jest.MockedFunction<
  typeof useNotification
>;

describe("Notification Component", () => {
  it("displays an error notification", () => {
    mockedUseNotification.mockReturnValue({
      notification: {
        text: "An error occurred",
        color: NotificationColor.Danger,
        isError: true,
      },
      setNotification: jest.fn(),
    });

    render(<Notification />);

    expect(screen.getByText("An error occurred")).toBeInTheDocument();
    expect(screen.getByText("Fehler")).toBeInTheDocument();

    const { firstChild: toastHeader } = screen.getByRole("alert");
    expect(toastHeader).toHaveClass("bg-danger");
  });

  it("displays an information notification", () => {
    mockedUseNotification.mockReturnValue({
      notification: {
        text: "Some information",
        color: NotificationColor.Info,
        isError: false,
      },
      setNotification: jest.fn(),
    });

    render(<Notification />);

    expect(screen.getByText("Some information")).toBeInTheDocument();
    expect(screen.getByText("nformation")).toBeInTheDocument();

    const { firstChild: toastHeader } = screen.getByRole("alert");
    expect(toastHeader).toHaveClass("bg-info");
  });
});
