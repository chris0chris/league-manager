import "fake-indexeddb/auto";

import {
  fireEvent,
  render as renderComponent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { IDBFactory } from "fake-indexeddb";
import type { ReactElement } from "react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import {
  ApiError,
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
  setDeviceId,
} from "../api/client";
import type {
  CrewPosition,
  Game,
  GameLog,
  GameSetup,
  Official,
  RosterPlayer,
  TeamOfficial,
} from "../api/types";
import { TeamLogosProvider } from "../app/teamLogos";
import { getDeviceId } from "../device";
import {
  readSnapshot,
  resetSnapshotStore,
  snapshotKey,
} from "../offline/snapshot";
import GameSetupScreen from "./GameSetup";

vi.mock("../api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../api/client")>();
  return {
    ...actual,
    apiDelete: vi.fn(),
    apiGet: vi.fn(),
    apiPost: vi.fn(),
    apiPut: vi.fn(),
    setDeviceId: vi.fn(),
  };
});

vi.mock("../device", () => ({
  getDeviceId: vi.fn(() => "device-1"),
}));

const apiDeleteMock = apiDelete as unknown as Mock;
const apiGetMock = apiGet as unknown as Mock;
const apiPostMock = apiPost as unknown as Mock;
const apiPutMock = apiPut as unknown as Mock;
const setDeviceIdMock = setDeviceId as unknown as Mock;
const getDeviceIdMock = getDeviceId as unknown as Mock;

const CREW_PATH = "/api/game/42/officials";
const SETUP_PATH = "/api/game/42/setup";
const EVENTS_PATH = "/api/game/42/events";
const TEAM_PATH = "/api/officials/team/7/list";
const LOG_PATH = "/api/gamelog/42";
const POSITIONS_PATH = "/api/officials/crew-positions/game/42";

/** What the backend answers for a league without configuration. */
const DEFAULT_POSITIONS: CrewPosition[] = [
  { position: "Scorecard Judge", label: "Scorecard Judge", order: 1, required: false },
  { position: "Referee", label: "Schiedsrichter", order: 2, required: true },
  { position: "Down Judge", label: "Down Judge", order: 3, required: true },
  { position: "Field Judge", label: "Field Judge", order: 4, required: true },
  { position: "Side Judge", label: "Side Judge", order: 5, required: true },
];

const ROSTER: RosterPlayer[] = [
  { side: "home", jersey: 7, name: "Meier" },
  { side: "home", jersey: 23, name: "Schulz" },
  { side: "away", jersey: 11, name: "Wolf" },
];

const GAME: Game = {
  id: 42,
  scheduled: "13:30:00",
  field: 2,
  officials: "Crew Rhein",
  officialsId: 7,
  stage: "Vorrunde",
  standing: "",
  home: "Ravens",
  away: "Wolves",
  points_home: null,
  points_away: null,
  status: "Geplant",
  id_home: "11",
  id_away: "12",
  passcheck: true,
};

interface CrewOverrides {
  id?: number;
  official?: number | null;
  name?: string | null;
  position?: string;
}

function crewRow(overrides: CrewOverrides = {}): Official {
  return {
    id: 1,
    official: 11,
    name: "Michael Klein",
    position: "Referee",
    ...overrides,
  };
}

interface TeamOverrides {
  id?: number;
  first_name?: string;
  last_name?: string;
  license?: string | null;
  valid_until?: string | null;
  is_valid?: boolean;
}

function teamPerson(overrides: TeamOverrides = {}): TeamOfficial {
  return {
    id: 11,
    first_name: "Michael",
    last_name: "Klein",
    team: "Crew Rhein",
    license: "B",
    valid_until: "2027-06-30",
    is_valid: true,
    ...overrides,
  };
}

/** A valid guest official who is in no fixture crew, so any slot can take her. */
function klara(): TeamOverrides {
  return {
    id: 17,
    first_name: "Klara",
    last_name: "Berg",
    license: "B",
    valid_until: "2029-06-30",
  };
}

/**
 * The default crew is deliberately sparse: one Referee plus the optional
 * Scorecard Judge. A start refuses an empty `required` slot, so tests that
 * start fill the three remaining refereed positions first.
 */
function completeCrew(): Official[] {
  return [
    crewRow(),
    crewRow({
      id: 2,
      official: 12,
      name: "Anna Richter",
      position: "Scorecard Judge",
    }),
    crewRow({
      id: 3,
      official: 14,
      name: "Sabine Lang",
      position: "Down Judge",
    }),
    crewRow({
      id: 4,
      official: 15,
      name: "Nina Wolf",
      position: "Field Judge",
    }),
    crewRow({
      id: 5,
      official: 16,
      name: "Paul Ohm",
      position: "Side Judge",
    }),
  ];
}

const LOG: GameLog = {
  gameId: 42,
  isFirstHalf: true,
  inPossession: null,
  home: {
    id: 1,
    name: "Ravens",
    score: 0,
    firsthalf: { score: 0, entries: [] },
    secondhalf: { score: 0, entries: [] },
  },
  away: {
    id: 2,
    name: "Wolves",
    score: 0,
    firsthalf: { score: 0, entries: [] },
    secondhalf: { score: 0, entries: [] },
  },
};

/**
 * The log the screen hands over after a start: the payload it read plus the
 * opening possession it just wrote (the read predates the write).
 */
function startedLog(inPossession: string = "Ravens"): GameLog {
  return { ...LOG, inPossession };
}

let crew: Official[];
let teamList: TeamOfficial[];
let positions: CrewPosition[];
let setup: GameSetup;
let startCalls: string[];
/** Every request the screen made, GETs included, for "nothing on tap 1". */
let requests: string[];
let setupFailure: unknown;
let crewFailure: unknown;

beforeEach(() => {
  // The screen preloads reads into IndexedDB; a fresh database per test keeps
  // one case's cache out of the next one.
  vi.stubGlobal("indexedDB", new IDBFactory());
  resetSnapshotStore();
  crew = [
    crewRow(),
    crewRow({
      id: 2,
      official: 12,
      name: "Anna Richter",
      position: "Scorecard Judge",
    }),
  ];
  teamList = [
    teamPerson(),
    teamPerson({
      id: 12,
      first_name: "Anna",
      last_name: "Richter",
      license: "C",
      valid_until: "2028-01-31",
    }),
    teamPerson({
      id: 13,
      first_name: "Tom",
      last_name: "Weber",
      license: "C",
      valid_until: "2025-03-04",
      is_valid: false,
    }),
    teamPerson({
      id: 14,
      first_name: "Sabine",
      last_name: "Lang",
      license: "B",
      valid_until: "2028-12-31",
    }),
    teamPerson({
      id: 15,
      first_name: "Nina",
      last_name: "Wolf",
      license: "C",
      valid_until: "2029-06-30",
    }),
    teamPerson({
      id: 16,
      first_name: "Paul",
      last_name: "Ohm",
      license: "C",
      valid_until: "2029-06-30",
    }),
    teamPerson(klara()),
  ];
  positions = DEFAULT_POSITIONS;
  setup = {};
  startCalls = [];
  requests = [];
  setupFailure = null;
  crewFailure = null;

  apiGetMock.mockReset();
  apiPostMock.mockReset();
  apiPutMock.mockReset();
  apiDeleteMock.mockReset();
  apiDeleteMock.mockResolvedValue(undefined);
  setDeviceIdMock.mockReset();
  getDeviceIdMock.mockReset();
  getDeviceIdMock.mockReturnValue("device-1");

  apiGetMock.mockImplementation(async (path: string) => {
    requests.push(`GET ${path}`);
    switch (path) {
      case CREW_PATH:
        return crew;
      case TEAM_PATH:
        return teamList;
      case SETUP_PATH:
        return setup;
      case POSITIONS_PATH:
        return positions;
      case "/api/game/42/roster":
        return ROSTER;
      case LOG_PATH:
        startCalls.push(`GET ${path}`);
        return LOG;
      default:
        if (path.startsWith("/api/officials/search/list")) {
          const query =
            new URL(path, "http://localhost").searchParams.get("name") ?? "";
          return teamList.filter((person) =>
            `${person.first_name} ${person.last_name}`
              .toLowerCase()
              .includes(query.toLowerCase()),
          );
        }
        throw new Error(`unexpected GET ${path}`);
    }
  });

  apiPutMock.mockImplementation(async (path: string, body: unknown) => {
    requests.push(`PUT ${path}`);
    startCalls.push(`PUT ${path}`);
    if (path === CREW_PATH && crewFailure !== null) {
      throw crewFailure;
    }
    if (path === SETUP_PATH && setupFailure !== null) {
      throw setupFailure;
    }
    if (path === SETUP_PATH) {
      return { ...(body as GameSetup) };
    }
    if (path === CREW_PATH) {
      return [];
    }
    throw new Error(`unexpected PUT ${path}`);
  });

  apiPostMock.mockImplementation(async (path: string) => {
    requests.push(`POST ${path}`);
    startCalls.push(`POST ${path}`);
    if (path === EVENTS_PATH) {
      return { state: {}, cursor: 1 };
    }
    throw new Error(`unexpected POST ${path}`);
  });
});

async function renderSetup(
  overrides: Partial<Game> = {},
  { folded = false }: { folded?: boolean } = {},
) {
  const onStarted = vi.fn();
  const view = render(
    <GameSetupScreen
      game={{ ...GAME, ...overrides }}
      onStarted={onStarted}
    />,
  );
  await screen.findByRole("group", { name: "Münzwurf gewonnen von" });
  // A complete crew folds into one row; the crew tests work on the rows, so
  // they open it the way an official would. The fold has its own tests.
  const summary = screen.queryByRole("button", { name: /^Crew vollständig/ });
  if (summary !== null && !folded) {
    await userEvent.click(summary);
  }
  return { onStarted, ...view };
}

function startButton(): HTMLButtonElement {
  const button = document.querySelector<HTMLButtonElement>(".startbtn");
  if (button === null) {
    throw new Error("start button is missing");
  }
  return button;
}

/** The confirmation sheet the first tap opened. */
function startSheet(): HTMLElement {
  return screen.getByRole("dialog", { name: "Spiel starten" });
}

async function choose(group: string, option: string): Promise<void> {
  await userEvent.click(
    within(screen.getByRole("group", { name: group })).getByRole("button", {
      name: option,
    }),
  );
}

/**
 * Toss, first possession and direction have no default any more: an unset
 * field is refused before the start instead of being written as "home/Nord".
 */
async function chooseDefaults(): Promise<void> {
  await choose("Münzwurf gewonnen von", "Ravens");
  await choose("Erster Ballbesitz", "Ravens");
  await choose("Spielrichtung", "Nord");
}

/** First tap on the screen button: opens the confirmation, writes nothing. */
async function tapStart(): Promise<void> {
  await userEvent.click(startButton());
}

/** Second tap, inside the sheet — the only tap that writes. */
async function confirmStart(): Promise<void> {
  await userEvent.click(
    within(startSheet()).getByRole("button", {
      name: /^(Jetzt starten|Trotzdem starten)$/,
    }),
  );
}

/** The whole start: open the confirmation, then confirm it. */
async function clickStart(): Promise<void> {
  await tapStart();
  await confirmStart();
}

function crewButton(label: string): HTMLButtonElement {
  return screen.getByRole("button", {
    name: `${label}: Offiziellen wählen`,
  }) as HTMLButtonElement;
}

/** The compact "add" row an empty optional position renders as. */
function addButton(label: string): HTMLButtonElement {
  return screen.getByRole("button", {
    name: `${label} hinzufügen: Offiziellen wählen`,
  }) as HTMLButtonElement;
}

/** The read-only name of an unknown or duplicated row. */
function crewReadOnly(): HTMLElement | null {
  return document.querySelector<HTMLElement>(".offcard-static .offmember");
}

function rowFor(label: string): HTMLElement {
  const row = crewButton(label).closest(".offrow");
  if (!(row instanceof HTMLElement)) {
    throw new Error(`no crew row for ${label}`);
  }
  return row;
}

/** Open a picker from a given row button, search and take the suggestion. */
async function pickCrewFrom(
  button: HTMLButtonElement,
  label: string,
  person: string,
): Promise<void> {
  await userEvent.click(button);
  const input = screen.getByLabelText(`${label}: Person suchen`);
  await userEvent.type(input, person.split(" ").slice(-1)[0]);
  await userEvent.click(
    await screen.findByRole("option", { name: new RegExp(person) }),
  );
}

/** Open the slot's picker, search for a person and take the suggestion. */
async function pickCrew(label: string, person: string): Promise<void> {
  await pickCrewFrom(crewButton(label), label, person);
}

/** The header reads the team directory from the provider; none here. */
function render(ui: ReactElement) {
  return renderComponent(
    <TeamLogosProvider logos={new Map()}>{ui}</TeamLogosProvider>,
  );
}

describe("GameSetup — header and crew", () => {
  it("titles the screen and puts the matchup in a team card", async () => {
    await renderSetup();

    expect(
      screen.getByRole("heading", { level: 1, name: "Spiel vorbereiten" }),
    ).toBeInTheDocument();
    const card = screen.getByRole("region", { name: "Begegnung" });
    expect(card).toHaveTextContent("Ravens");
    expect(card).toHaveTextContent("Wolves");
    expect(card).toHaveTextContent("VS.");
    expect(card).toHaveTextContent("13:30 · Feld 2");
    // The old inline crests in the header subtitle are gone; the card owns it.
    expect(document.querySelector(".app-sub")).toBeNull();
  });

  it("puts the two team logos in the team card", async () => {
    const logos = new Map([
      ["ravens", "https://example.test/media/teammanager/logos/ravens.png"],
      ["wolves", "https://example.test/media/teammanager/logos/wolves.png"],
    ]);
    renderComponent(
      <TeamLogosProvider logos={logos}>
        <GameSetupScreen game={GAME} onStarted={vi.fn()} />
      </TeamLogosProvider>,
    );
    await screen.findByRole("group", { name: "Münzwurf gewonnen von" });

    const images = Array.from(
      screen.getByRole("region", { name: "Begegnung" }).querySelectorAll("img"),
    );
    expect(images.map((image) => image.getAttribute("src"))).toEqual([
      logos.get("ravens"),
      logos.get("wolves"),
    ]);
  });

  it("falls back to the initials discs when the directory is unknown", async () => {
    await renderSetup();

    const card = screen.getByRole("region", { name: "Begegnung" });
    expect(card.querySelectorAll("img")).toHaveLength(0);
    expect(card.querySelectorAll(".teamlogo-match")).toHaveLength(2);
  });

  it("shows crew names and their roles", async () => {
    await renderSetup();

    expect(crewButton("Schiedsrichter")).toHaveTextContent("Michael Klein");
    expect(crewButton("Scorecard Judge")).toHaveTextContent("Anna Richter");
    expect(
      within(rowFor("Schiedsrichter")).getByText("Schiedsrichter"),
    ).toBeInTheDocument();
    expect(screen.getByText("Scorecard Judge")).toBeInTheDocument();
    // Only the four refereed positions count; the Scorecard Judge is optional.
    expect(screen.getByText("1/4 besetzt")).toBeInTheDocument();
  });

  it("suggests people across the directory and flags who already fills a slot", async () => {
    await renderSetup();

    await userEvent.click(crewButton("Scorecard Judge"));
    const input = screen.getByLabelText("Scorecard Judge: Person suchen");
    await userEvent.type(input, "klein");
    const busy = await screen.findByRole("option", { name: /Michael Klein/ });
    expect(busy).toHaveAttribute("aria-disabled", "true");
    expect(busy).toHaveTextContent("bereits gesetzt");

    await userEvent.clear(input);
    await userEvent.type(input, "richter");
    const free = await screen.findByRole("option", { name: /Anna Richter/ });
    expect(free).not.toHaveAttribute("aria-disabled");
    expect(free).toHaveTextContent("Crew Rhein");
  });

  it("keeps a free-text crew name when no official is linked", async () => {
    crew[0] = crewRow({ official: null, name: "Gast Schiri" });
    await renderSetup();

    expect(crewButton("Schiedsrichter")).toHaveTextContent("Gast Schiri");
    expect(crewButton("Schiedsrichter")).toHaveTextContent("Freitext");
    expect(
      within(rowFor("Schiedsrichter")).getByText("keine Lizenz"),
    ).toBeInTheDocument();
  });

  it("shows an unknown position unchanged instead of aliasing it", async () => {
    crew = [crewRow({ position: "Schiedsrichter" })];
    await renderSetup();

    // The Referee slot stays empty: writing "Referee" would create a duplicate.
    expect(crewButton("Schiedsrichter")).toHaveTextContent(
      "Offiziellen wählen",
    );
    expect(screen.getByText("0/4 besetzt")).toBeInTheDocument();
    const extra = crewReadOnly();
    expect(extra).toHaveTextContent("Michael Klein");
    expect(extra?.closest(".offrow")).toHaveTextContent("Schiedsrichter");
  });
});

describe("GameSetup — guest officials", () => {
  it("keeps a guest as free text and writes the name, not a link", async () => {
    crew = completeCrew();
    const { onStarted } = await renderSetup();

    await userEvent.click(crewButton("Schiedsrichter"));
    await userEvent.type(
      screen.getByLabelText("Schiedsrichter: Person suchen"),
      "Gast Schiri",
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Als Freitext übernehmen" }),
    );
    expect(crewButton("Schiedsrichter")).toHaveTextContent("Freitext");
    expect(crewButton("Schiedsrichter")).toHaveTextContent("Gast Schiri");

    await chooseDefaults();
    await clickStart();

    await waitFor(() => expect(onStarted).toHaveBeenCalledWith(startedLog()));
    expect(apiPutMock).toHaveBeenNthCalledWith(1, CREW_PATH, [
      { position: "Scorecard Judge", official: 12, name: "Anna Richter" },
      { position: "Referee", official: null, name: "Gast Schiri" },
      { position: "Down Judge", official: 14, name: "Sabine Lang" },
      { position: "Field Judge", official: 15, name: "Nina Wolf" },
      { position: "Side Judge", official: 16, name: "Paul Ohm" },
    ]);
  });

  it("cannot be started without a connection", async () => {
    Object.defineProperty(globalThis.navigator, "onLine", {
      configurable: true,
      value: false,
    });
    try {
      await renderSetup();
      expect(startButton()).toHaveTextContent("Start nur online");
      expect(startButton()).toBeDisabled();
      // The banner agrees with the disabled bar instead of claiming green.
      const banner = document.querySelector(".readybar");
      expect(banner).toHaveTextContent("Start nur online");
      expect(banner).toHaveTextContent(
        "Das Spiel kann nur mit Verbindung gestartet werden.",
      );
      expect(screen.queryByText("Bereit zum Starten")).toBeNull();

      // The confirmation is not reachable offline: the start needs the server.
      fireEvent.click(startButton());
      expect(screen.queryByRole("dialog")).toBeNull();
    } finally {
      Object.defineProperty(globalThis.navigator, "onLine", {
        configurable: true,
        value: true,
      });
    }
  });
});

describe("GameSetup — licences", () => {
  it("marks a valid licence", async () => {
    await renderSetup();

    const row = rowFor("Schiedsrichter");
    expect(within(row).getByText("Lizenz gültig")).toHaveClass("lic-ok");
    expect(within(row).queryByText(/abgelaufen/)).not.toBeInTheDocument();
  });

  it("shows the expiry date of an expired licence", async () => {
    teamList[0] = teamPerson({ is_valid: false, valid_until: "2025-03-04" });
    await renderSetup();

    const row = rowFor("Schiedsrichter");
    expect(
      within(row).getByText("abgelaufen seit 04.03.2025"),
    ).toHaveClass("lic-warn");
  });

  it("says 'keine Lizenz' for a linked official without a licence", async () => {
    teamList[0] = teamPerson({ license: null, is_valid: false });
    await renderSetup();

    expect(
      within(rowFor("Schiedsrichter")).getByText("keine Lizenz"),
    ).toHaveClass("lic-missing");
  });

  it("says 'Lizenz unbekannt' when the official cannot be judged", async () => {
    crew[0] = crewRow({ official: 99, name: "Gast Schiri" });
    await renderSetup();

    expect(
      within(rowFor("Schiedsrichter")).getByText("Lizenz unbekannt"),
    ).toHaveClass("lic-unknown");
    // A guest official is not a known licence problem.
    expect(document.querySelector(".setupwarn")).toBeNull();
  });

  it("says 'keine Lizenz' for an unlinked free-text official", async () => {
    crew[0] = crewRow({ official: null, name: "Gast Schiri" });
    await renderSetup();

    expect(
      within(rowFor("Schiedsrichter")).getByText("keine Lizenz"),
    ).toBeInTheDocument();
  });

  it("marks each invalid licence inline instead of a global paragraph", async () => {
    teamList[0] = teamPerson({ is_valid: false, valid_until: "2025-03-04" });
    teamList[1] = teamPerson({
      id: 12,
      first_name: "Anna",
      last_name: "Richter",
      license: null,
      valid_until: null,
      is_valid: false,
    });
    const { container } = await renderSetup();

    const hints = container.querySelectorAll(".offhint-warn");
    expect(hints).toHaveLength(2);
    expect(hints[0]).toHaveTextContent("Start trotzdem möglich");
    expect(hints[1]).toHaveTextContent("Start trotzdem möglich");
    // The old global paragraph and its footnote are gone.
    expect(container.querySelector(".setupwarn")).toBeNull();
    expect(screen.queryByText(/zählen/)).toBeNull();
  });

  it("shows no warning while every assigned licence is valid", async () => {
    const { container } = await renderSetup();

    expect(document.querySelector(".setupwarn")).toBeNull();
    expect(container.querySelectorAll(".offhint-warn")).toHaveLength(0);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("does not warn about a free-text official without a licence", async () => {
    crew[0] = crewRow({ official: null, name: "Gast Schiri" });
    const { container } = await renderSetup();

    expect(document.querySelector(".setupwarn")).toBeNull();
    expect(container.querySelectorAll(".offhint-warn")).toHaveLength(0);
  });
});

describe("GameSetup — local crew edits", () => {
  it("keeps a changed official local until the start", async () => {
    await renderSetup();

    await pickCrew("Schiedsrichter", "Tom Weber");

    expect(crewButton("Schiedsrichter")).toHaveTextContent("Tom Weber");
    expect(apiPutMock).not.toHaveBeenCalled();
    expect(
      within(rowFor("Schiedsrichter")).getByText("abgelaufen seit 04.03.2025"),
    ).toBeInTheDocument();
  });

  it("sends all five slots before the setup when the crew changed", async () => {
    crew = completeCrew();
    const { onStarted } = await renderSetup();
    await pickCrew("Schiedsrichter", "Tom Weber");
    await chooseDefaults();

    // Tom Weber's licence is expired, so the sheet carries the warning.
    await tapStart();
    expect(apiPutMock).not.toHaveBeenCalled();
    await confirmStart();

    await waitFor(() => expect(onStarted).toHaveBeenCalledWith(startedLog()));

    expect(apiPutMock).toHaveBeenNthCalledWith(1, CREW_PATH, [
      {
        position: "Scorecard Judge",
        official: 12,
        name: "Anna Richter",
      },
      { position: "Referee", official: 13, name: "Tom Weber" },
      { position: "Down Judge", official: 14, name: "Sabine Lang" },
      { position: "Field Judge", official: 15, name: "Nina Wolf" },
      { position: "Side Judge", official: 16, name: "Paul Ohm" },
    ]);
    expect(startCalls).toEqual([
      `PUT ${CREW_PATH}`,
      `PUT ${SETUP_PATH}`,
      `GET ${LOG_PATH}`,
      `POST ${EVENTS_PATH}`,
    ]);
  });

  it("leaves the officials endpoint alone when the crew is unchanged", async () => {
    crew = completeCrew();
    await renderSetup();
    await chooseDefaults();

    await clickStart();

    await waitFor(() => expect(startCalls).toContain(`GET ${LOG_PATH}`));
    expect(apiPutMock).toHaveBeenCalledTimes(1);
    expect(apiPutMock).toHaveBeenCalledWith(SETUP_PATH, expect.anything());
    expect(apiPostMock).toHaveBeenCalledWith(EVENTS_PATH, {
      events: [{ type: "possession", code: "home", side: "home" }],
      client_id: expect.any(String),
    });
    expect(apiPutMock).not.toHaveBeenCalledWith(
      CREW_PATH,
      expect.anything(),
    );
  });
});

describe("GameSetup — crew data problems", () => {
  it("warns about a duplicate position and never writes it", async () => {
    crew = [
      crewRow({ id: 1, official: 11, position: "Referee" }),
      crewRow({
        id: 2,
        official: 12,
        name: "Anna Richter",
        position: "Referee",
      }),
      crewRow({
        id: 3,
        official: 14,
        name: "Sabine Lang",
        position: "Scorecard Judge",
      }),
      crewRow({
        id: 4,
        official: 15,
        name: "Nina Wolf",
        position: "Down Judge",
      }),
      crewRow({
        id: 5,
        official: 16,
        name: "Paul Ohm",
        position: "Field Judge",
      }),
      crewRow({
        id: 6,
        official: 17,
        name: "Klara Berg",
        position: "Side Judge",
      }),
    ];
    const { onStarted } = await renderSetup();

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(
      "Mehrere Einträge für Schiedsrichter – bitte bereinigen",
    );
    expect(alert).toHaveTextContent("Michael Klein, Anna Richter");
    // The duplicated position cannot be counted as filled, the other three can.
    expect(screen.getByText("3/4 besetzt")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: "Schiedsrichter: Offiziellen wählen",
      }),
    ).toBeNull();
    expect(crewReadOnly()).toHaveTextContent("Michael Klein");

    // Dirty via the optional Scorecard Judge; Tom Weber's licence is expired.
    await pickCrew("Scorecard Judge", "Tom Weber");
    await chooseDefaults();
    await tapStart();
    expect(apiPutMock).not.toHaveBeenCalled();
    // Named as information, never as the reason the start is refused.
    expect(startSheet()).toHaveTextContent(
      "Offizielle: Schiedsrichter ist doppelt belegt.",
    );
    expect(
      within(startSheet()).queryByRole("button", { name: "Angaben fehlen" }),
    ).toBeNull();
    await confirmStart();
    await waitFor(() => expect(onStarted).toHaveBeenCalledWith(startedLog()));

    const crewCall = apiPutMock.mock.calls.find(
      ([path]) => path === CREW_PATH,
    );
    expect(crewCall).toBeDefined();
    const positions = (crewCall?.[1] as { position: string }[]).map(
      (row) => row.position,
    );
    expect(positions).toEqual([
      "Scorecard Judge",
      "Down Judge",
      "Field Judge",
      "Side Judge",
    ]);
  });

  it("shows and preserves an unknown position", async () => {
    crew = [
      crewRow({ id: 1, official: 11, position: "Referee" }),
      crewRow({
        id: 2,
        official: 13,
        name: "Tom Weber",
        position: "Zeitnehmer",
      }),
      crewRow({
        id: 3,
        official: 14,
        name: "Sabine Lang",
        position: "Down Judge",
      }),
      crewRow({
        id: 4,
        official: 15,
        name: "Nina Wolf",
        position: "Field Judge",
      }),
      crewRow({
        id: 5,
        official: 16,
        name: "Paul Ohm",
        position: "Side Judge",
      }),
    ];
    const { onStarted } = await renderSetup();

    const extra = crewReadOnly();
    expect(extra).toHaveTextContent("Tom Weber");
    expect(extra?.closest(".offrow")).toHaveTextContent("Zeitnehmer");

    await pickCrew("Schiedsrichter", "Klara Berg");
    await chooseDefaults();
    await tapStart();
    await confirmStart();
    await waitFor(() => expect(onStarted).toHaveBeenCalledWith(startedLog()));

    expect(apiPutMock).toHaveBeenCalledWith(
      CREW_PATH,
      expect.arrayContaining([
        { position: "Zeitnehmer", official: 13, name: "Tom Weber" },
      ]),
    );
  });
});

describe("GameSetup — crew slots per league", () => {
  it("renders the configured slots in the configured order and labels", async () => {
    positions = [
      { position: "Referee", label: "Head Referee", order: 1, required: true },
      {
        position: "Scorecard Judge",
        label: "Protokoll",
        order: 2,
        required: false,
      },
    ];
    await renderSetup();

    const roles = Array.from(document.querySelectorAll(".offrole")).map(
      (role) => role.textContent,
    );
    expect(roles).toEqual(["Head Referee", "Protokoll"]);
    expect(crewButton("Head Referee")).toHaveTextContent("Michael Klein");
    expect(crewButton("Protokoll")).toHaveTextContent("Anna Richter");
  });

  it("counts only the configured required slots", async () => {
    positions = [
      { position: "Referee", label: "Head Referee", order: 1, required: true },
      {
        position: "Side Judge",
        label: "Seitenrichter",
        order: 2,
        required: true,
      },
      { position: "Down Judge", label: "Linienrichter", order: 3, required: false },
    ];
    await renderSetup();

    // Referee is filled, Side Judge is not; Down Judge is optional.
    expect(screen.getByText("1/2 besetzt")).toBeInTheDocument();
    expect(screen.queryByText("1/4 besetzt")).toBeNull();
  });

  it("is complete when a league marks no slot as required", async () => {
    positions = [
      { position: "Referee", label: "Head Referee", order: 1, required: false },
    ];
    await renderSetup();

    expect(screen.getByText("keine Pflichtposition")).toBeInTheDocument();
    expect(screen.queryByText("0/0 besetzt")).toBeNull();
  });

  it("writes the configured wire value, not the label", async () => {
    positions = [
      { position: "Referee", label: "Head Referee", order: 1, required: true },
    ];
    const { onStarted } = await renderSetup();

    await pickCrew("Head Referee", "Sabine Lang");
    await chooseDefaults();
    await clickStart();
    await waitFor(() => expect(onStarted).toHaveBeenCalledWith(startedLog()));

    expect(apiPutMock).toHaveBeenCalledWith(CREW_PATH, [
      { position: "Referee", official: 14, name: "Sabine Lang" },
      // The unconfigured stored row survives the save untouched.
      { position: "Scorecard Judge", official: 12, name: "Anna Richter" },
    ]);
  });

  it("keeps a stored position the league does not configure read-only", async () => {
    positions = [
      { position: "Referee", label: "Head Referee", order: 1, required: true },
    ];
    crew = [
      crewRow(),
      crewRow({
        id: 2,
        official: 12,
        name: "Anna Richter",
        position: "Scorecard Judge",
      }),
    ];
    await renderSetup();

    expect(crewButton("Head Referee")).toHaveTextContent("Michael Klein");
    // "Scorecard Judge" is not configured, so it can only be shown verbatim.
    const extra = crewReadOnly();
    expect(extra).toHaveTextContent("Anna Richter");
    expect(extra?.closest(".offrow")).toHaveTextContent("Scorecard Judge");
    expect(
      screen.queryByRole("button", {
        name: "Scorecard Judge: Offiziellen wählen",
      }),
    ).toBeNull();
  });

  it("keeps the defaults when the league has no configuration", async () => {
    await renderSetup();

    const roles = Array.from(document.querySelectorAll(".offrole")).map(
      (role) => role.textContent,
    );
    // Required positions first, the optional Scorecard Judge last.
    expect(roles).toEqual([
      "Schiedsrichter",
      "Down Judge",
      "Field Judge",
      "Side Judge",
      "Scorecard Judge",
    ]);
    expect(screen.getByText("1/4 besetzt")).toBeInTheDocument();
  });

  it("puts every required position before an optional one", async () => {
    positions = [
      { position: "Scorecard Judge", label: "Protokoll", order: 1, required: false },
      { position: "Referee", label: "Head Referee", order: 2, required: true },
      { position: "Side Judge", label: "Seitenrichter", order: 3, required: true },
      { position: "Down Judge", label: "Linienrichter", order: 4, required: false },
    ];
    await renderSetup();

    const roles = Array.from(document.querySelectorAll(".offrole")).map(
      (role) => role.textContent,
    );
    // The server's order is kept inside each group; required wins the group.
    expect(roles).toEqual(["Head Referee", "Seitenrichter", "Protokoll"]);
  });

  it("renders an empty optional slot as a compact add row", async () => {
    positions = [
      { position: "Referee", label: "Head Referee", order: 1, required: true },
      {
        position: "Scorecard Judge",
        label: "Scorecard Judge",
        order: 2,
        required: false,
      },
    ];
    // No crew row for the optional slot: it must not become a full row.
    crew = [crewRow()];
    await renderSetup();

    const add = addButton("Scorecard Judge");
    expect(add).toHaveAttribute(
      "aria-label",
      "Scorecard Judge hinzufügen: Offiziellen wählen",
    );
    expect(add).toHaveTextContent("Scorecard Judge hinzufügen");
    expect(add).toHaveTextContent("Optional · ohne Pflicht zur Besetzung");
    expect(add.querySelector(".offsep")).toHaveTextContent("·");
    expect(add.querySelector(".offsep")).toHaveAttribute("aria-hidden", "true");
    expect(document.querySelector(".offrow-optional")).not.toBeNull();
    // It is the same picker: one tap opens it, a pick turns it into a row.
    await pickCrewFrom(addButton("Scorecard Judge"), "Scorecard Judge", "Anna Richter");
    expect(crewButton("Scorecard Judge")).toHaveTextContent("Anna Richter");
    expect(document.querySelector(".offcard-add")).toBeNull();
  });

  it("shows an optional slot with somebody in it as a normal row", async () => {
    positions = [
      { position: "Referee", label: "Head Referee", order: 1, required: true },
      {
        position: "Scorecard Judge",
        label: "Scorecard Judge",
        order: 2,
        required: false,
      },
    ];
    await renderSetup();

    expect(document.querySelector(".offcard-add")).toBeNull();
    expect(crewButton("Scorecard Judge")).toHaveTextContent("Anna Richter");
  });

  it("preloads the slots so a reload without that request keeps the labels", async () => {
    positions = [
      { position: "Zeitnehmer", label: "Protokoll", order: 1, required: false },
      { position: "Referee", label: "Head Referee", order: 2, required: true },
    ];
    // Only the configured slots, so the rendered roles are exactly those two.
    crew = [crewRow()];

    const first = await renderSetup();
    expect(crewButton("Head Referee")).toHaveTextContent("Michael Klein");
    // The read preloads the slots through the snapshot layer.
    await expect(
      readSnapshot(snapshotKey.crewPositions(42)),
    ).resolves.toMatchObject({ value: positions });
    first.unmount();

    // Reload while that one request fails (server down, 5xx): the stored copy
    // still carries the league's labels and order.
    const online = apiGetMock.getMockImplementation();
    apiGetMock.mockImplementation(async (path: string) => {
      if (path === POSITIONS_PATH) {
        throw new TypeError("Failed to fetch");
      }
      return online?.(path);
    });
    await renderSetup();

    const roles = Array.from(document.querySelectorAll(".offrole")).map(
      (role) => role.textContent,
    );
    // Required first; the empty optional slot is an add row, not a role row.
    expect(roles).toEqual(["Head Referee"]);
    expect(document.querySelector(".offcard-add")).toHaveTextContent(
      "Protokoll hinzufügen",
    );
    expect(crewButton("Head Referee")).toHaveTextContent("Michael Klein");
  });

  it("refuses an empty slot list instead of an officials step without positions", async () => {
    // The endpoint never answers `[]` (a league without rows gets the five
    // defaults). An empty list must not become a crew section with no slots
    // and a "besetzt" chip — it is unusable configuration.
    positions = [];
    render(<GameSetupScreen game={GAME} onStarted={vi.fn()} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Die Vorbereitung konnte nicht geladen werden.",
    );
    expect(document.querySelector(".offrow")).toBeNull();
    expect(screen.queryByText(/besetzt/)).toBeNull();
  });

  it("cannot prepare the crew when the slots cannot be loaded", async () => {
    apiGetMock.mockImplementation(async (path: string) => {
      if (path === POSITIONS_PATH) {
        throw new Error("boom");
      }
      if (path === CREW_PATH) {
        return crew;
      }
      if (path === TEAM_PATH) {
        return teamList;
      }
      if (path === SETUP_PATH) {
        return setup;
      }
      throw new Error(`unexpected GET ${path}`);
    });
    render(<GameSetupScreen game={GAME} onStarted={vi.fn()} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Die Vorbereitung konnte nicht geladen werden.",
    );
  });
});

describe("GameSetup — configuration and readiness", () => {
  it("stores the pre-game quarterbacks and remembers them on this device", async () => {
    crew = completeCrew();
    const { onStarted } = await renderSetup();

    const home = screen.getByRole("group", { name: "Quarterback Ravens" });
    const away = screen.getByRole("group", { name: "Quarterback Wolves" });
    await userEvent.click(
      await within(home).findByRole("button", { name: "QB 7, Meier" }),
    );
    await userEvent.click(
      await within(away).findByRole("button", { name: "QB 11, Wolf" }),
    );

    await chooseDefaults();
    await clickStart();
    await waitFor(() => expect(onStarted).toHaveBeenCalledWith(startedLog()));

    expect(apiPutMock).toHaveBeenCalledWith(
      SETUP_PATH,
      expect.objectContaining({ qbHome: 7, qbAway: 11 }),
    );
    // The starting device seeds its play sheet at once.
    expect(
      globalThis.localStorage.getItem("scorecard:v2:qb:42:home"),
    ).toBe("7");
    expect(
      globalThis.localStorage.getItem("scorecard:v2:qb:42:away"),
    ).toBe("11");
  });

  it("preselects the stored quarterbacks on a prepared game", async () => {
    setup = { ctResult: "home", direction: "Nord", fhPossession: "home", qbHome: 23 };
    await renderSetup();

    const home = screen.getByRole("group", { name: "Quarterback Ravens" });
    expect(
      await within(home).findByRole("button", { name: "QB 23, Schulz" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("starts without a preselection and names what is still open", async () => {
    await renderSetup();

    expect(screen.getByText("Angaben fehlen")).toBeInTheDocument();
    expect(document.querySelector("#readiness")).toHaveTextContent(
      "Münzwurf gewonnen von: keine Mannschaft gewählt.",
    );
    for (const group of [
      "Münzwurf gewonnen von",
      "Erster Ballbesitz",
      "Spielrichtung",
    ]) {
      for (const button of within(
        screen.getByRole("group", { name: group }),
      ).getAllByRole("button")) {
        expect(button).toHaveAttribute("aria-pressed", "false");
      }
    }
  });

  it("uses the renamed labels for the three configuration groups", async () => {
    await renderSetup();

    for (const label of [
      "Münzwurf gewonnen von",
      "Erster Ballbesitz",
      "Spielrichtung",
    ]) {
      expect(screen.getByRole("group", { name: label })).toBeInTheDocument();
    }
    expect(screen.queryByRole("group", { name: "Münzwurf" })).toBeNull();
    expect(screen.queryByRole("group", { name: "Richtung" })).toBeNull();
  });

  it("turns the readiness banner green once every required fact is set", async () => {
    crew = completeCrew();
    await renderSetup();

    expect(screen.getByText("Angaben fehlen")).toBeInTheDocument();
    await chooseDefaults();

    const ready = screen.getByRole("status");
    expect(ready).toHaveTextContent("Bereit zum Starten");
    expect(ready).toHaveTextContent("Alle Pflichtangaben sind gesetzt.");
    expect(screen.queryByText("Angaben fehlen")).toBeNull();
  });

  it("names the first open item beside the start button", async () => {
    // The banner can sit under the sticky start bar; the bar itself must say
    // why the start is refused.
    crew = completeCrew();
    await renderSetup();

    const start = screen.getByRole("button", { name: /^Spiel starten/ });
    const why = document.querySelector(".setupfoot .setupfoot-why");
    expect(why).toHaveTextContent(
      "Noch offen: Münzwurf gewonnen von: keine Mannschaft gewählt. (+2 weitere)",
    );
    expect(start).toHaveAccessibleDescription(
      "Noch offen: Münzwurf gewonnen von: keine Mannschaft gewählt. (+2 weitere)",
    );

    await chooseDefaults();

    expect(document.querySelector(".setupfoot-why")).toBeNull();
    expect(
      screen.getByRole("button", { name: /^Spiel starten/ }),
    ).not.toHaveAttribute("aria-describedby");
  });

  it("lists exactly the missing required fields in the banner", async () => {
    crew = completeCrew();
    await renderSetup();

    const banner = screen.getByText("Angaben fehlen").closest(".readybar");
    expect(banner).toHaveTextContent(
      "Münzwurf gewonnen von: keine Mannschaft gewählt.",
    );
    expect(banner).toHaveTextContent(
      "Erster Ballbesitz: keine Mannschaft gewählt.",
    );
    expect(banner).toHaveTextContent("Spielrichtung: keine Seite gewählt.");

    await chooseDefaults();

    expect(screen.queryByText("Spielrichtung: keine Seite gewählt.")).toBeNull();
  });

  it("marks the selected segment with aria-pressed", async () => {
    await renderSetup();
    await chooseDefaults();

    const toss = screen.getByRole("group", { name: "Münzwurf gewonnen von" });
    expect(within(toss).getByRole("button", { name: "Ravens" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      within(toss).getByRole("button", { name: "Wolves" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("tints the team switches and names the guest team's coin call", async () => {
    await renderSetup();

    const toss = screen.getByRole("group", { name: "Münzwurf gewonnen von" });
    expect(within(toss).getByRole("button", { name: "Ravens" })).toHaveClass(
      "seg-home",
    );
    expect(within(toss).getByRole("button", { name: "Wolves" })).toHaveClass(
      "seg-away",
    );
    const possession = screen.getByRole("group", { name: "Erster Ballbesitz" });
    expect(
      within(possession).getByRole("button", { name: "Ravens" }),
    ).toHaveClass("seg-home");
    expect(
      screen.getByText(/Die Münzwahl hat das Gastteam/),
    ).toHaveTextContent("Wolves");
  });

  it("labels the start button with the kick-off time", async () => {
    await renderSetup();

    expect(startButton()).toHaveTextContent("Spiel starten · 13:30");
    expect(startButton()).toBeEnabled();
  });
});

describe("GameSetup — start sequence", () => {
  it("sends the chosen toss, possession and direction once, then loads the log", async () => {
    crew = completeCrew();
    const { onStarted } = await renderSetup();
    await chooseDefaults();

    await clickStart();

    await waitFor(() => expect(onStarted).toHaveBeenCalledWith(startedLog()));

    // The setup read names the device too, so `getDeviceId` runs more than
    // once; what matters here is that the start claims the lock exactly once.
    expect(setDeviceIdMock).toHaveBeenCalledTimes(1);
    expect(setDeviceIdMock).toHaveBeenCalledWith("device-1");
    expect(apiPutMock).toHaveBeenCalledTimes(1);
    expect(apiPutMock).toHaveBeenCalledWith(SETUP_PATH, {
      ctResult: "home",
      direction: "Nord",
      fhPossession: "home",
      qbHome: null,
      qbAway: null,
      device_id: "device-1",
    });
    expect(apiPostMock).toHaveBeenCalledWith(EVENTS_PATH, {
      events: [{ type: "possession", code: "home", side: "home" }],
      client_id: expect.any(String),
    });
    expect(startCalls).toEqual([
      `PUT ${SETUP_PATH}`,
      `GET ${LOG_PATH}`,
      `POST ${EVENTS_PATH}`,
    ]);
    expect(onStarted).toHaveBeenCalledTimes(1);
  });

  it("sends the chosen toss, possession and direction", async () => {
    crew = completeCrew();
    await renderSetup();

    await choose("Münzwurf gewonnen von", "Wolves");
    await choose("Erster Ballbesitz", "Wolves");
    await choose("Spielrichtung", "Süd");
    await clickStart();

    await waitFor(() => expect(startCalls).toContain(`GET ${LOG_PATH}`));
    expect(apiPutMock).toHaveBeenCalledWith(SETUP_PATH, {
      ctResult: "away",
      direction: "Süd",
      fhPossession: "away",
      qbHome: null,
      qbAway: null,
      device_id: "device-1",
    });
    expect(apiPostMock).toHaveBeenCalledWith(EVENTS_PATH, {
      events: [{ type: "possession", code: "away", side: "away" }],
      client_id: expect.any(String),
    });
  });

  it("writes the opening possession as an event after reading the log", async () => {
    // The possession event names a *side*, but the marker the screen shows is
    // the team *name*, which only the log carries — the list row is labelled
    // with `Team.description`. So the log is read first, like before.
    crew = completeCrew();
    const { onStarted } = await renderSetup({
      home: "The rising bird team from the north",
      away: "Speed and precision football",
    });
    // The segments are labelled with the row's long team descriptions.
    await choose("Münzwurf gewonnen von", "The rising bird team from the north");
    await choose("Erster Ballbesitz", "The rising bird team from the north");
    await choose("Spielrichtung", "Nord");

    await clickStart();

    await waitFor(() => expect(onStarted).toHaveBeenCalledWith(startedLog()));
    expect(apiPostMock).toHaveBeenCalledWith(EVENTS_PATH, {
      events: [{ type: "possession", code: "home", side: "home" }],
      client_id: expect.any(String),
    });
    expect(startCalls.indexOf(`GET ${LOG_PATH}`)).toBeLessThan(
      startCalls.indexOf(`POST ${EVENTS_PATH}`),
    );
  });

  it("shows an existing setup as Fortsetzen and restores its values", async () => {
    setup = { ctResult: "away", direction: "Süd", fhPossession: "away" };
    await renderSetup();

    expect(startButton()).toHaveTextContent("Fortsetzen");
    expect(
      within(
        screen.getByRole("group", { name: "Münzwurf gewonnen von" }),
      ).getByRole("button", { name: "Wolves" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      within(
        screen.getByRole("group", { name: "Erster Ballbesitz" }),
      ).getByRole("button", { name: "Wolves" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      within(screen.getByRole("group", { name: "Spielrichtung" })).getByRole(
        "button",
        { name: "Süd" },
      ),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("maps the legacy toss relative to the away side", async () => {
    // v1 recorded "Gewonnen" for the away team's coin-toss call.
    setup = {
      ctResult: "Gewonnen",
      direction: "directionRight",
      fhPossession: "Wolves",
    };
    await renderSetup();

    expect(startButton()).toHaveTextContent("Fortsetzen");
    expect(
      within(
        screen.getByRole("group", { name: "Münzwurf gewonnen von" }),
      ).getByRole("button", { name: "Wolves" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      within(
        screen.getByRole("group", { name: "Erster Ballbesitz" }),
      ).getByRole("button", { name: "Wolves" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("maps a lost legacy toss to the home side", async () => {
    setup = {
      ctResult: "Verloren",
      direction: "arrow_forward",
      fhPossession: "Ravens",
    };
    await renderSetup();

    expect(
      within(
        screen.getByRole("group", { name: "Münzwurf gewonnen von" }),
      ).getByRole("button", { name: "Ravens" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      within(screen.getByRole("group", { name: "Spielrichtung" })).getByRole(
        "button",
        { name: "Süd" },
      ),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("disables the button while the start is in flight", async () => {
    crew = completeCrew();
    let release: (value: unknown) => void = () => undefined;
    apiPutMock.mockImplementation(async (path: string) => {
      if (path === SETUP_PATH) {
        return new Promise((resolve) => {
          release = resolve;
        });
      }
      return [];
    });
    const { onStarted } = await renderSetup();
    await chooseDefaults();

    await clickStart();

    expect(startButton()).toBeDisabled();
    expect(startButton()).toHaveTextContent("Startet …");
    release({});
    await waitFor(() => expect(onStarted).toHaveBeenCalledWith(startedLog()));
  });
});

describe("GameSetup — start confirmation", () => {
  it("restates what is about to start and writes nothing on the first tap", async () => {
    await renderSetup();
    await chooseDefaults();
    await pickCrew("Scorecard Judge", "Sabine Lang");
    apiPutMock.mockClear();
    // Everything so far was the load and the local edits.
    requests = [];

    await tapStart();

    const sheet = within(startSheet());
    expect(sheet.getByText("Ravens – Wolves")).toBeInTheDocument();
    expect(sheet.getByText("13:30 · Feld 2")).toBeInTheDocument();
    // The crew with the league's labels, not the position wire values.
    expect(sheet.getByText("Michael Klein")).toBeInTheDocument();
    expect(sheet.getByText("Sabine Lang")).toBeInTheDocument();
    expect(sheet.getByText("Scorecard Judge")).toBeInTheDocument();
    expect(startSheet()).toHaveTextContent("Passcheckvollständig");
    expect(startSheet()).toHaveTextContent("Wolves");
    expect(startSheet()).toHaveTextContent("Nord");
    // The first tap only opens the sheet: no write, and not even a re-read of
    // crew, positions, setup or log.
    expect(apiPutMock).not.toHaveBeenCalled();
    expect(requests).toEqual([]);
    expect(startCalls).toEqual([]);
  });

  it("starts on the second tap in the order the sequence had before", async () => {
    crew = completeCrew();
    const { onStarted } = await renderSetup();
    await chooseDefaults();
    await pickCrew("Schiedsrichter", "Klara Berg");

    await clickStart();

    await waitFor(() => expect(onStarted).toHaveBeenCalledWith(startedLog()));
    expect(startCalls).toEqual([
      `PUT ${CREW_PATH}`,
      `PUT ${SETUP_PATH}`,
      `GET ${LOG_PATH}`,
      `POST ${EVENTS_PATH}`,
    ]);
    // The sheet is gone before the write starts: failures belong to the screen.
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("dismisses the confirmation without writing and asks again next time", async () => {
    await renderSetup();
    await chooseDefaults();

    await tapStart();
    await userEvent.click(
      within(startSheet()).getByRole("button", { name: "Schließen" }),
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(apiPutMock).not.toHaveBeenCalled();
    expect(startCalls).toEqual([]);
    // A dismissed sheet is not a remembered confirmation.
    expect(startButton()).toHaveTextContent("Spiel starten · 13:30");
    await tapStart();
    expect(startSheet()).toBeInTheDocument();
  });

  it("refuses an empty crew slot the league marks as required", async () => {
    positions = [
      { position: "Referee", label: "Head Referee", order: 1, required: true },
      {
        position: "Side Judge",
        label: "Seitenrichter",
        order: 2,
        required: true,
      },
    ];
    const { onStarted } = await renderSetup();
    await chooseDefaults();

    await tapStart();

    const sheet = within(startSheet());
    expect(sheet.getByText("fehlt")).toBeInTheDocument();
    expect(startSheet()).toHaveTextContent(
      "Offizielle: Seitenrichter fehlt – die Liga verlangt diese Position.",
    );
    const blocked = sheet.getByRole("button", { name: "Angaben fehlen" });
    expect(blocked).toBeDisabled();
    await userEvent.click(blocked);
    expect(apiPutMock).not.toHaveBeenCalled();

    // Filling the slot is all that was missing: the same sheet starts.
    await userEvent.click(
      within(startSheet()).getByRole("button", { name: "Schließen" }),
    );
    await pickCrew("Seitenrichter", "Sabine Lang");
    await clickStart();

    await waitFor(() => expect(onStarted).toHaveBeenCalledWith(startedLog()));
    expect(apiPutMock).toHaveBeenCalledWith(SETUP_PATH, expect.anything());
  });

  it("accepts an empty slot the league does not require", async () => {
    positions = [
      { position: "Referee", label: "Head Referee", order: 1, required: true },
      {
        position: "Side Judge",
        label: "Seitenrichter",
        order: 2,
        required: false,
      },
    ];
    const { onStarted } = await renderSetup();
    await chooseDefaults();

    await tapStart();

    expect(startSheet()).toHaveTextContent("nicht nötig");
    expect(within(startSheet()).getByRole("button", { name: "Jetzt starten" }))
      .toBeEnabled();
    await confirmStart();

    await waitFor(() => expect(onStarted).toHaveBeenCalledWith(startedLog()));
  });

  it("starts when a linked official's name cannot be resolved", async () => {
    // The team list fails, so no linked official has a display name: the picker
    // says "Offizieller 99" and the chip counts the slot as filled. The sheet
    // must not call that slot missing — a crewed gameday has to start.
    positions = [
      { position: "Referee", label: "Schiedsrichter", order: 1, required: true },
    ];
    crew = [crewRow({ id: 1, official: 99, name: null, position: "Referee" })];
    const online = apiGetMock.getMockImplementation();
    apiGetMock.mockImplementation(async (path: string) => {
      if (path === TEAM_PATH) {
        throw new ApiError(500, null);
      }
      return online?.(path);
    });
    const { onStarted } = await renderSetup();
    await chooseDefaults();

    expect(screen.getByText("1/1 besetzt")).toBeInTheDocument();
    expect(
      screen.getByText("Die Offiziellen des Teams konnten nicht geladen werden."),
    ).toBeInTheDocument();

    await tapStart();

    expect(startSheet()).toHaveTextContent("eingetragen");
    expect(
      within(startSheet()).queryByText("fehlt", { selector: ".startmiss" }),
    ).toBeNull();
    expect(
      within(startSheet()).queryByRole("button", { name: "Angaben fehlen" }),
    ).toBeNull();

    await confirmStart();

    await waitFor(() => expect(onStarted).toHaveBeenCalledWith(startedLog()));
  });

  it("starts when the team list does not know the linked official", async () => {
    // The other unresolvable path: the team request works, the person is simply
    // not in it (a guest official stored as a link). Same rule, same result.
    positions = [
      { position: "Referee", label: "Schiedsrichter", order: 1, required: true },
    ];
    crew = [crewRow({ id: 1, official: 99, name: null, position: "Referee" })];
    const { onStarted } = await renderSetup();
    await chooseDefaults();

    expect(
      within(rowFor("Schiedsrichter")).getByText("Lizenz unbekannt"),
    ).toBeInTheDocument();
    expect(crewButton("Schiedsrichter")).toHaveTextContent("Offizieller 99");

    await tapStart();

    expect(startSheet()).toHaveTextContent("eingetragen");
    await confirmStart();

    await waitFor(() => expect(onStarted).toHaveBeenCalledWith(startedLog()));
  });

  it("refuses a free-text name without a first and a last name", async () => {
    crew = [crewRow({ official: null, name: "Schiri" })];
    await renderSetup();
    await chooseDefaults();

    await tapStart();

    expect(startSheet()).toHaveTextContent(
      "Offizielle: Schiedsrichter – Freitextname „Schiri“ braucht Vor- und Nachnamen.",
    );
    expect(within(startSheet()).getByRole("button", { name: "Angaben fehlen" }))
      .toBeDisabled();
    expect(apiPutMock).not.toHaveBeenCalled();
  });

  it("restates a one-word free text in an optional slot without blocking", async () => {
    positions = [
      { position: "Referee", label: "Schiedsrichter", order: 1, required: true },
      { position: "Additional", label: "Zeitnehmer", order: 2, required: false },
    ];
    crew = [
      crewRow(),
      crewRow({
        id: 2,
        official: null,
        name: "N.N.",
        position: "Additional",
      }),
    ];
    const { onStarted } = await renderSetup();
    await chooseDefaults();

    await tapStart();

    // An optional guest can be fixed on the crew card; it never strands the game.
    expect(startSheet()).toHaveTextContent("N.N.");
    expect(
      within(startSheet()).getByRole("button", { name: "Jetzt starten" }),
    ).toBeEnabled();

    await confirmStart();

    await waitFor(() => expect(onStarted).toHaveBeenCalledWith(startedLog()));
  });

  it("refuses a start before toss, possession and direction are chosen", async () => {
    await renderSetup();

    await tapStart();

    for (const reason of [
      "Münzwurf gewonnen von: keine Mannschaft gewählt.",
      "Erster Ballbesitz: keine Mannschaft gewählt.",
      "Spielrichtung: keine Seite gewählt.",
    ]) {
      expect(startSheet()).toHaveTextContent(reason);
    }
    expect(within(startSheet()).getByRole("button", { name: "Angaben fehlen" }))
      .toBeDisabled();
    await userEvent.click(
      within(startSheet()).getByRole("button", { name: "Schließen" }),
    );
    expect(apiPutMock).not.toHaveBeenCalled();
  });

  it("says that starting writes the setup and that no clock runs", async () => {
    await renderSetup();
    await chooseDefaults();

    await tapStart();

    expect(startSheet()).toHaveTextContent(
      "Der Start schreibt die Vorbereitung und sperrt das Spiel für dieses Gerät.",
    );
    expect(startSheet()).toHaveTextContent(
      "Eine Spieluhr läuft in der App nicht.",
    );
  });

  it("carries the passcheck state into the confirmation", async () => {
    await renderSetup({ passcheck: false });
    await chooseDefaults();

    await tapStart();

    expect(startSheet()).toHaveTextContent("Passcheckfehlt");
  });
});

describe("GameSetup — start failures and guards", () => {
  it("does not start when saving the crew is rejected", async () => {
    crew = completeCrew();
    const { onStarted } = await renderSetup();
    await pickCrew("Schiedsrichter", "Klara Berg");
    await chooseDefaults();
    crewFailure = new ApiError(
      400,
      { detail: "Offizielle konnten nicht gespeichert werden." },
      "Offizielle konnten nicht gespeichert werden.",
    );

    await clickStart();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Offizielle konnten nicht gespeichert werden.",
    );
    expect(apiPutMock).toHaveBeenCalledTimes(1);
    expect(apiPutMock).toHaveBeenCalledWith(CREW_PATH, expect.anything());
    expect(setDeviceIdMock).not.toHaveBeenCalled();
    expect(startCalls).toEqual([`PUT ${CREW_PATH}`]);
    // The rejected write closes the sheet: the failure is the screen's.
    expect(screen.queryByRole("dialog")).toBeNull();

    crewFailure = null;
    await clickStart();

    await waitFor(() => expect(onStarted).toHaveBeenCalledWith(startedLog()));
    expect(apiPutMock).toHaveBeenCalledWith(SETUP_PATH, expect.anything());
  });

  it("retries only the log after the setup was accepted", async () => {
    crew = completeCrew();
    let logCalls = 0;
    apiGetMock.mockImplementation(async (path: string) => {
      switch (path) {
        case CREW_PATH:
          return crew;
        case TEAM_PATH:
          return teamList;
        case SETUP_PATH:
          return setup;
        case POSITIONS_PATH:
          return positions;
        case LOG_PATH: {
          logCalls += 1;
          startCalls.push(`GET ${path}`);
          if (logCalls === 1) {
            throw new ApiError(500, null);
          }
          return LOG;
        }
        default:
          throw new Error(`unexpected GET ${path}`);
      }
    });
    const { onStarted } = await renderSetup();
    await chooseDefaults();

    await clickStart();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Der Start ist fehlgeschlagen. Bitte erneut versuchen.",
    );
    expect(startButton()).toHaveTextContent("Fortsetzen");
    expect(startCalls).toEqual([`PUT ${SETUP_PATH}`, `GET ${LOG_PATH}`]);

    await clickStart();

    await waitFor(() => expect(onStarted).toHaveBeenCalledWith(startedLog()));
    expect(startCalls).toEqual([
      `PUT ${SETUP_PATH}`,
      `GET ${LOG_PATH}`,
      `GET ${LOG_PATH}`,
      `POST ${EVENTS_PATH}`,
    ]);
    expect(
      apiPutMock.mock.calls.filter(([path]) => path === SETUP_PATH),
    ).toHaveLength(1);
  });

  it("ignores a second tap on the confirmation while the start is in flight", async () => {
    crew = completeCrew();
    let release: (value: unknown) => void = () => undefined;
    apiPutMock.mockImplementation(async (path: string) => {
      if (path === SETUP_PATH) {
        return new Promise((resolve) => {
          release = resolve;
        });
      }
      return [];
    });
    const { onStarted } = await renderSetup();
    await chooseDefaults();
    await tapStart();

    const confirm = within(startSheet()).getByRole("button", {
      name: "Jetzt starten",
    });
    fireEvent.click(confirm);
    fireEvent.click(confirm);

    await waitFor(() => expect(apiPutMock).toHaveBeenCalledTimes(1));
    expect(apiPutMock).toHaveBeenCalledWith(SETUP_PATH, expect.anything());
    release({});
    await waitFor(() => expect(onStarted).toHaveBeenCalledWith(startedLog()));
  });

  it("shows a finished game as a notice without a start button", async () => {
    const { onStarted } = await renderSetup({ status: "beendet" });

    expect(screen.getByText("Dieses Spiel ist beendet.")).toBeInTheDocument();
    expect(document.querySelector(".startbtn")).toBeNull();
    expect(crewButton("Schiedsrichter")).toBeDisabled();
    expect(
      within(screen.getByRole("group", { name: "Spielrichtung" })).getByRole(
        "button",
        { name: "Nord" },
      ),
    ).toBeDisabled();
    expect(onStarted).not.toHaveBeenCalled();
  });
});

describe("GameSetup — warn and confirm", () => {
  it("carries the licence warning in the confirmation instead of a third tap", async () => {
    crew = completeCrew();
    teamList[0] = teamPerson({ is_valid: false, valid_until: "2025-03-04" });
    const { onStarted } = await renderSetup();
    await chooseDefaults();

    expect(
      within(rowFor("Schiedsrichter")).getByText("Start trotzdem möglich"),
    ).toBeInTheDocument();
    expect(startButton()).not.toHaveAttribute("aria-describedby");

    requests = [];
    await tapStart();

    // Warned, not blocked: the sheet repeats the licence problem and its
    // second tap starts. The confirmation *is* the licence confirmation, so the
    // start takes exactly two taps — never three.
    const sheet = within(startSheet());
    expect(sheet.getByText("1 Lizenz ist nicht gültig")).toBeInTheDocument();
    expect(
      sheet.getByText("Michael Klein (Schiedsrichter)"),
    ).toBeInTheDocument();
    expect(
      sheet.getByText("Das Spiel lässt sich trotzdem starten."),
    ).toBeInTheDocument();
    // The footer names the licence case instead of "Jetzt starten"…
    expect(
      sheet.queryByRole("button", { name: "Jetzt starten" }),
    ).toBeNull();
    const second = sheet.getByRole("button", { name: "Trotzdem starten" });
    expect(second).toBeEnabled();
    expect(requests).toEqual([]);
    expect(onStarted).not.toHaveBeenCalled();

    // …and one tap on it finishes: tap 1 opened, tap 2 started.
    await userEvent.click(second);

    await waitFor(() => expect(onStarted).toHaveBeenCalledWith(startedLog()));
    expect(onStarted).toHaveBeenCalledTimes(1);
    expect(startCalls).toEqual([
      `PUT ${SETUP_PATH}`,
      `GET ${LOG_PATH}`,
      `POST ${EVENTS_PATH}`,
    ]);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("asks again after a dismissed confirmation", async () => {
    crew = completeCrew();
    teamList[0] = teamPerson({ is_valid: false, valid_until: "2025-03-04" });
    await renderSetup();
    await chooseDefaults();

    await tapStart();
    await userEvent.click(
      within(startSheet()).getByRole("button", { name: "Schließen" }),
    );
    expect(apiPutMock).not.toHaveBeenCalled();

    await tapStart();
    expect(
      within(startSheet()).getByRole("button", { name: "Trotzdem starten" }),
    ).toBeInTheDocument();
  });
});

describe("GameSetup — passcheck", () => {
  it("shows a complete passcheck with the link to its page", async () => {
    await renderSetup({ passcheck: true });

    expect(screen.getByText("Passcheck vollständig")).toHaveClass("okchip");
    const link = screen.getByRole("link", { name: "Passcheck-Seite" });
    expect(link).toHaveAttribute("href", "/passcheck/");
    // A new tab keeps unsaved crew edits on this screen alive.
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("shows a missing passcheck", async () => {
    await renderSetup({ passcheck: false });

    expect(screen.getByText("kein Passcheck")).toHaveClass("chip-miss");
  });

  it("shows an unknown passcheck when the payload omits it", async () => {
    const game = { ...GAME };
    delete game.passcheck;
    render(<GameSetupScreen game={game} onStarted={vi.fn()} />);
    await screen.findByRole("group", { name: "Münzwurf gewonnen von" });

    expect(screen.getByText("unbekannt")).toBeInTheDocument();
  });
});

describe("GameSetup — server rejections", () => {
  const statusMessage = "Dieser Spielstatus erlaubt keinen Spielstart.";
  const deviceMessage = "Dieses Spiel läuft auf einem anderen Gerät.";

  it("shows the server detail for an illegal transition", async () => {
    crew = completeCrew();
    setupFailure = new ApiError(409, { detail: statusMessage }, statusMessage);
    const { onStarted } = await renderSetup();
    await chooseDefaults();

    await clickStart();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(statusMessage);
    expect(startCalls).toEqual([`PUT ${SETUP_PATH}`]);
    expect(onStarted).not.toHaveBeenCalled();
    expect(startButton()).toBeEnabled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("switches to read-only when another device owns the game", async () => {
    crew = completeCrew();
    setupFailure = new ApiError(409, { detail: deviceMessage }, deviceMessage);
    await renderSetup();
    await chooseDefaults();

    await clickStart();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(deviceMessage);
    expect(crewButton("Schiedsrichter")).toBeDisabled();
    for (const group of screen.getAllByRole("group")) {
      for (const button of within(group).getAllByRole("button")) {
        expect(button).toBeDisabled();
      }
    }
    expect(startButton()).toBeDisabled();
    expect(startButton()).toHaveTextContent("Nur lesen");
    // The banner names the device lock, not a green "ready".
    const banner = document.querySelector(".readybar");
    expect(banner).toHaveTextContent("Nur lesen");
    expect(banner).toHaveTextContent(deviceMessage);
    expect(screen.queryByText("Bereit zum Starten")).toBeNull();
    expect(setDeviceIdMock).not.toHaveBeenCalled();
    // The lock arrives after the confirmation was tapped: no sheet is left.
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("classifies the device lock by the server's device_id", async () => {
    crew = completeCrew();
    setupFailure = new ApiError(
      409,
      { detail: "Konflikt beim Start.", device_id: "device-2" },
      "Konflikt beim Start.",
    );
    await renderSetup();
    await chooseDefaults();

    await clickStart();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Konflikt beim Start.");
    expect(startButton()).toHaveTextContent("Nur lesen");
    expect(crewButton("Schiedsrichter")).toBeDisabled();
  });

  it("offers a retry after the device lock was released", async () => {
    crew = completeCrew();
    setupFailure = new ApiError(
      409,
      { detail: deviceMessage, device_id: "device-2" },
      deviceMessage,
    );
    const { onStarted } = await renderSetup();
    await chooseDefaults();

    await clickStart();
    expect(startButton()).toHaveTextContent("Nur lesen");

    // Staff released the lock; the same attempt must be possible again.
    setupFailure = null;
    await userEvent.click(
      screen.getByRole("button", { name: "Erneut prüfen" }),
    );

    await waitFor(() => expect(onStarted).toHaveBeenCalledWith(startedLog()));
    expect(
      apiPutMock.mock.calls.filter(([path]) => path === SETUP_PATH),
    ).toHaveLength(2);
    expect(startButton()).not.toBeDisabled();
  });

  it("falls back to a readable message for other failures", async () => {
    crew = completeCrew();
    setupFailure = new ApiError(500, null);
    await renderSetup();
    await chooseDefaults();

    await clickStart();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Der Start ist fehlgeschlagen. Bitte erneut versuchen.",
    );
    expect(startButton()).toBeEnabled();
  });
});

describe("GameSetup — loading", () => {
  it("shows a readable error and retries the load", async () => {
    apiGetMock.mockRejectedValue(new ApiError(500, null));
    render(<GameSetupScreen game={GAME} onStarted={vi.fn()} />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "Die Vorbereitung konnte nicht geladen werden.",
    );

    apiGetMock.mockImplementation(async (path: string) => {
      if (path === CREW_PATH) {
        return crew;
      }
      if (path === TEAM_PATH) {
        return teamList;
      }
      if (path === SETUP_PATH) {
        return {};
      }
      if (path === POSITIONS_PATH) {
        return positions;
      }
      throw new Error(`unexpected GET ${path}`);
    });
    await userEvent.click(
      within(alert).getByRole("button", { name: "Erneut laden" }),
    );

    expect(
      await screen.findByRole("group", { name: "Münzwurf gewonnen von" }),
    ).toBeInTheDocument();
  });

  it("keeps the screen usable when the officials team list fails", async () => {
    apiGetMock.mockImplementation(async (path: string) => {
      if (path === CREW_PATH) {
        return crew;
      }
      if (path === TEAM_PATH) {
        throw new ApiError(500, null);
      }
      if (path === SETUP_PATH) {
        return {};
      }
      if (path === POSITIONS_PATH) {
        return positions;
      }
      throw new Error(`unexpected GET ${path}`);
    });
    render(<GameSetupScreen game={GAME} onStarted={vi.fn()} />);

    await screen.findByRole("group", { name: "Münzwurf gewonnen von" });

    expect(
      screen.getByText("Die Offiziellen des Teams konnten nicht geladen werden."),
    ).toBeInTheDocument();
    // Without the team list an assigned official cannot be judged; showing
    // "keine Lizenz" would be a claim the screen cannot make.
    expect(within(rowFor("Schiedsrichter")).getByText("Lizenz unbekannt"))
      .toHaveClass("lic-unknown");
    expect(document.querySelector(".setupwarn")).toBeNull();
    expect(startButton()).toBeEnabled();
  });
});

describe("GameSetup — the remaining data shapes", () => {
  it("labels a stored row without a position", async () => {
    crew = [crewRow({ official: null, name: null, position: "   " })];
    await renderSetup();

    expect(screen.getByText("Ohne Position")).toBeInTheDocument();
    // The nameless free-text row renders as a dash, not as "undefined".
    expect(screen.getByText("–")).toBeInTheDocument();
  });

  it("names an unknown official the team list does not know", async () => {
    crew = [crewRow({ official: 99, name: null, position: "Referee" })];
    await renderSetup();

    expect(crewButton("Schiedsrichter")).toHaveTextContent("Offizieller 99");
    expect(
      within(rowFor("Schiedsrichter")).getByText("Lizenz unbekannt"),
    ).toBeInTheDocument();
  });

  it("clears a crew slot back to nobody", async () => {
    crew = [crewRow({ official: 11, position: "Referee" })];
    await renderSetup();

    await userEvent.click(crewButton("Schiedsrichter"));
    await userEvent.click(
      screen.getByRole("button", { name: "Auswahl entfernen" }),
    );

    expect(crewButton("Schiedsrichter")).toHaveTextContent(
      "Offiziellen wählen",
    );
  });

  it("shows an expired licence whose expiry date is unknown", async () => {
    teamList = [
      teamPerson({ id: 11, license: "B", valid_until: null, is_valid: false }),
    ];
    crew = [crewRow({ official: 11, position: "Referee" })];
    await renderSetup();

    expect(
      within(rowFor("Schiedsrichter")).getByText("abgelaufen"),
    ).toBeInTheDocument();
  });

  it("shows an unparsable expiry date as it is", async () => {
    teamList = [
      teamPerson({ id: 11, license: "B", valid_until: "bald", is_valid: false }),
    ];
    crew = [crewRow({ official: 11, position: "Referee" })];
    await renderSetup();

    expect(
      within(rowFor("Schiedsrichter")).getByText("abgelaufen seit bald"),
    ).toBeInTheDocument();
  });

  it("counts a complete refereed crew", async () => {
    crew = [
      crewRow({ id: 1, official: 11, name: null, position: "Referee" }),
      crewRow({ id: 2, official: 12, name: null, position: "Down Judge" }),
      crewRow({ id: 3, official: 13, name: null, position: "Field Judge" }),
      crewRow({ id: 4, official: 14, name: null, position: "Side Judge" }),
    ];
    await renderSetup();

    expect(screen.getByText("4/4 besetzt")).toBeInTheDocument();
  });

  it("reads a saved setup that already uses the v2 side tokens", async () => {
    setup = { ctResult: "home", fhPossession: "Wolves", direction: "Nord" };
    await renderSetup();

    expect(startButton()).toHaveTextContent("Fortsetzen");
    expect(
      within(
        screen.getByRole("group", { name: "Münzwurf gewonnen von" }),
      ).getByRole("button", { name: "Ravens" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      within(
        screen.getByRole("group", { name: "Erster Ballbesitz" }),
      ).getByRole("button", { name: "Wolves" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("falls back to its own message when the load fails without a detail", async () => {
    apiGetMock.mockRejectedValue(new TypeError("Failed to fetch"));
    render(<GameSetupScreen game={GAME} onStarted={vi.fn()} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Die Vorbereitung konnte nicht geladen werden.",
    );
  });

  it("starts without a possession write when the log has no team name", async () => {
    crew = completeCrew();
    const nameless: GameLog = {
      ...LOG,
      home: { ...LOG.home, name: null },
      inPossession: null,
    };
    apiGetMock.mockImplementation(async (path: string) => {
      switch (path) {
        case CREW_PATH:
          return crew;
        case TEAM_PATH:
          return teamList;
        case SETUP_PATH:
          return setup;
        case POSITIONS_PATH:
          return positions;
        case LOG_PATH:
          return nameless;
        default:
          throw new Error(`unexpected GET ${path}`);
      }
    });
    const { onStarted } = await renderSetup();
    await chooseDefaults();

    await clickStart();

    await waitFor(() =>
      expect(onStarted).toHaveBeenCalledWith({ ...nameless, inPossession: null }),
    );
    expect(
      apiPostMock.mock.calls.filter(([path]) => path === EVENTS_PATH),
    ).toHaveLength(0);
  });
});

describe("GameSetup — odd saved values and bodies", () => {
  it("falls back to the home side for an unrecognised saved toss", async () => {
    setup = { ctResult: "irgendwas", fhPossession: "auch-egal" };
    await renderSetup();

    expect(
      within(
        screen.getByRole("group", { name: "Münzwurf gewonnen von" }),
      ).getByRole("button", { name: "Ravens" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      within(
        screen.getByRole("group", { name: "Erster Ballbesitz" }),
      ).getByRole("button", { name: "Ravens" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("treats a 409 without a body as a status problem, not a device lock", async () => {
    crew = completeCrew();
    setupFailure = new ApiError(
      409,
      null,
      "Dieser Spielstatus erlaubt keinen Spielstart.",
    );
    await renderSetup();
    await chooseDefaults();

    await clickStart();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Dieser Spielstatus erlaubt keinen Spielstart.",
    );
    expect(startButton()).toBeEnabled();
  });
});

describe("GameSetup crew summary", () => {
  it("folds a complete crew with valid licences into one row", async () => {
    crew = completeCrew();
    await renderSetup({}, { folded: true });

    const summary = screen.getByRole("button", { name: /^Crew vollständig/ });
    expect(summary).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("4/4 besetzt")).toBeInTheDocument();
    expect(summary).toHaveTextContent("Michael Klein");
    expect(
      screen.queryByRole("button", { name: "Schiedsrichter: Offiziellen wählen" }),
    ).toBeNull();

    await userEvent.click(summary);

    expect(crewButton("Schiedsrichter")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Crew vollständig/ })).toBeNull();
  });

  it("keeps the rows open while a required slot is empty", async () => {
    await renderSetup();

    expect(screen.queryByRole("button", { name: /^Crew vollständig/ })).toBeNull();
    expect(crewButton("Schiedsrichter")).toBeInTheDocument();
  });

  it("keeps the rows open when a licence is not valid", async () => {
    crew = completeCrew();
    teamList[0] = teamPerson({ is_valid: false, valid_until: "2025-03-04" });
    await renderSetup({}, { folded: true });

    expect(screen.queryByRole("button", { name: /^Crew vollständig/ })).toBeNull();
    expect(crewButton("Schiedsrichter")).toBeInTheDocument();
  });
});

describe("GameSetup direction on the field", () => {
  it("draws both directions on a field between the two end zones", async () => {
    await renderSetup();

    const group = screen.getByRole("group", { name: "Spielrichtung" });
    expect(group).toHaveClass("fielddir");
    expect(
      within(group).getByText("Nord", { selector: ".fielddir-end" }),
    ).toBeInTheDocument();
    expect(
      within(group).getByText("Süd", { selector: ".fielddir-end" }),
    ).toBeInTheDocument();
    expect(within(group).getByRole("button", { name: "Nord" })).toBeInTheDocument();
    expect(within(group).getByRole("button", { name: "Süd" })).toBeInTheDocument();
  });
});

describe("a game another device already took", () => {
  it("warns before anyone taps start", async () => {
    crew = completeCrew();
    setup = {
      ctResult: "home",
      direction: "Nord",
      fhPossession: "home",
      // What GET /game/<id>/setup really answers: the server compares the
      // request's device header itself and never sends the stored id back.
      locked_elsewhere: true,
      can_release_lock: true,
    };

    await renderSetup();

    const warning = await screen.findByText(
      /hat ein anderes Gerät bereits übernommen/,
    );
    expect(warning).toBeInTheDocument();
    // Not `.seterror`: that class means "the start failed", and the officials
    // (and the e2e harness) read it that way before anyone taps.
    expect(document.querySelector(".devicewarn")).not.toBeNull();
    expect(document.querySelector(".seterror")).toBeNull();
    // it is a warning, not a gate: the start button stays available
    expect(screen.getByRole("button", { name: "Fortsetzen" })).toBeEnabled();
  });

  it("does not trust a lock read back from the offline snapshot", async () => {
    crew = completeCrew();
    setup = {
      ctResult: "home",
      direction: "Nord",
      fhPossession: "home",
      locked_elsewhere: true,
      can_release_lock: true,
    };

    // Online: the live answer warns, and the read stores the setup.
    const first = await renderSetup();
    expect(
      await screen.findByText(/hat ein anderes Gerät bereits übernommen/),
    ).toBeInTheDocument();
    await expect(
      readSnapshot(snapshotKey.setup(42)),
    ).resolves.toMatchObject({ value: { locked_elsewhere: true } });
    first.unmount();

    // Reload while the setup read fails: the screen restores the stored copy,
    // but a lock is live state, so that copy must not raise the warning.
    const online = apiGetMock.getMockImplementation();
    apiGetMock.mockImplementation(async (path: string, ...rest: unknown[]) => {
      if (path === SETUP_PATH) {
        throw new TypeError("Failed to fetch");
      }
      return online?.(path, ...rest);
    });
    await renderSetup();

    expect(
      screen.getByRole("group", { name: "Spielrichtung" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/hat ein anderes Gerät bereits übernommen/),
    ).toBeNull();
    expect(document.querySelector(".devicewarn")).toBeNull();
  });

  it("asks the setup read with this device's id", async () => {
    crew = completeCrew();
    setup = { ctResult: "home", direction: "Nord", fhPossession: "home" };

    await renderSetup();

    // Without the id the server cannot compare, and the warning is dead code.
    expect(apiGetMock).toHaveBeenCalledWith(SETUP_PATH, {
      deviceId: "device-1",
    });
  });

  it("stays quiet for a game this device started", async () => {
    crew = completeCrew();
    setup = {
      ctResult: "home",
      direction: "Nord",
      fhPossession: "home",
      locked_elsewhere: false,
      can_release_lock: true,
    };

    await renderSetup();

    expect(
      screen.queryByText(/hat ein anderes Gerät bereits übernommen/),
    ).toBeNull();
  });

  it("ignores a device_id in the payload", async () => {
    crew = completeCrew();
    setup = {
      ctResult: "home",
      direction: "Nord",
      fhPossession: "home",
      // A GET never carries this; a payload that does must not fake a warning.
      device_id: "device-2",
    };

    await renderSetup();

    expect(
      screen.queryByText(/hat ein anderes Gerät bereits übernommen/),
    ).toBeNull();
  });

  it("offers staff a take-over that frees the game for the start", async () => {
    crew = completeCrew();
    setup = {
      ctResult: "home",
      direction: "Nord",
      fhPossession: "home",
      locked_elsewhere: true,
      can_release_lock: true,
    };

    const { onStarted } = await renderSetup();

    // The warning promises a take-over ("oder dieses Gerät das Spiel
    // übernimmt"); without the button that promise was a dead end: the start
    // simply answered 409 and the screen turned read-only.
    const takeOverButton = await screen.findByRole("button", {
      name: "Spiel übernehmen",
    });
    await userEvent.click(takeOverButton);
    // The same two-step rule as the tracking strip: the first tap only arms.
    expect(apiDeleteMock).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Übernehmen" }),
    ).toHaveClass("is-armed");
    await userEvent.click(screen.getByRole("button", { name: "Übernehmen" }));

    await waitFor(() =>
      expect(apiDeleteMock).toHaveBeenCalledWith("/api/game/42/device"),
    );
    expect(apiPutMock).toHaveBeenCalledWith(
      SETUP_PATH,
      { device_id: "device-1" },
      { deviceId: "device-1" },
    );
    // This device holds the game now: the warning no longer applies.
    expect(
      screen.queryByText(/hat ein anderes Gerät bereits übernommen/),
    ).toBeNull();

    await clickStart();
    await waitFor(() => expect(onStarted).toHaveBeenCalledWith(startedLog()));
  });

  it("keeps the warning and names the reason when the take-over is refused", async () => {
    crew = completeCrew();
    setup = {
      ctResult: "home",
      direction: "Nord",
      fhPossession: "home",
      locked_elsewhere: true,
      can_release_lock: true,
    };
    apiDeleteMock.mockRejectedValue(
      new ApiError(
        403,
        { detail: "Nur die Turnierleitung kann die Gerätesperre aufheben." },
        "Nur die Turnierleitung kann die Gerätesperre aufheben.",
      ),
    );

    await renderSetup();

    await userEvent.click(
      await screen.findByRole("button", { name: "Spiel übernehmen" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Übernehmen" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "Nur die Turnierleitung kann die Gerätesperre aufheben.",
    );
    expect(
      screen.getByText(/hat ein anderes Gerät bereits übernommen/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Spiel übernehmen" }),
    ).toBeInTheDocument();
  });

  it("offers the take-over after a start met a lock the load did not show", async () => {
    crew = completeCrew();
    // The load saw a free game: the other device started it in between.
    setup = { ctResult: "home", direction: "Nord", fhPossession: "home" };
    const locked = "Dieses Spiel läuft auf einem anderen Gerät.";
    setupFailure = new ApiError(
      409,
      { detail: locked, device_id: "device-2" },
      locked,
    );
    let setupReads = 0;
    const served = apiGetMock.getMockImplementation();
    apiGetMock.mockImplementation(async (path: string, options?: unknown) => {
      if (path === SETUP_PATH) {
        setupReads += 1;
        return setupReads === 1
          ? setup
          : { ...setup, locked_elsewhere: true, can_release_lock: true };
      }
      return served?.(path, options);
    });

    await renderSetup();
    await chooseDefaults();

    await clickStart();

    expect(
      await screen.findByRole("button", { name: "Spiel übernehmen" }),
    ).toBeInTheDocument();
    expect(setupReads).toBeGreaterThan(1);
  });

  it("offers no take-over to a user who may not release", async () => {
    crew = completeCrew();
    setup = {
      ctResult: "home",
      direction: "Nord",
      fhPossession: "home",
      locked_elsewhere: true,
      can_release_lock: false,
    };

    await renderSetup();

    expect(
      await screen.findByText(/hat ein anderes Gerät bereits übernommen/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Spiel übernehmen" }),
    ).toBeNull();
    expect(
      screen.getByText("Die Turnierleitung kann die Gerätesperre aufheben."),
    ).toBeInTheDocument();
  });
});

describe("a setup read the server cannot judge", () => {
  it("shows no warning when the answer carries no lock flag", async () => {
    crew = completeCrew();
    setup = { ctResult: "home", direction: "Nord", fhPossession: "home" };

    await renderSetup();

    expect(
      screen.queryByText(/hat ein anderes Gerät bereits übernommen/),
    ).toBeNull();
  });
});
