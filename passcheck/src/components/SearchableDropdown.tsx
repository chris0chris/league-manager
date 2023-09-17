import { useState } from "react";

const allTeams = [
  { teamName: "Augsburg Lions", league: "DFFL 1" },
  { teamName: "Augsburg Lions II", league: "DFFL 2" },
  { teamName: "Augsburg Rooks", league: "DFFL 2" },
  { teamName: "Bamberg Phantoms", league: "DFFL 2" },
  { teamName: "Darmstadt Fun Diamonds", league: "DFFL 2" },
  { teamName: "Erfurt Indigos", league: "DFFL 2" },
  { teamName: "Walldorf Wanderers", league: "DFFL 1" },
  { teamName: "Würzburg Wombats", league: "DFFL 1" },
  { teamName: "Eberswalde Rangers", league: "DFFL 1" },
  { teamName: "Regensburg Phoenix", league: "DFFL 2" },
];

const teams = allTeams.sort((a, b) => {
  return a.teamName.toLowerCase() < b.teamName.toLowerCase() ? -1 : 1;
});

function SearchableDropdown() {
  const [searchInput, setSearchInput] = useState("");

  const onSearch = (searchTerm: string) => {
    //Passliste laden
    setSearchInput(searchTerm);
    if (searchTerm.length === 0) {
      console.log("Kein Team ausgewählt");
    } else {
      console.log("gesuchtes Team: ", searchTerm);
    }
  };

  const [showAll, setShowAll] = useState<boolean>(false);

  const showAllTeams = () => {
    setShowAll(!showAll);
  };

  const onChange = (event: any) => {
    setSearchInput(event.target.value);
    setShowAll(false);
  };

  const [radioTeam, setRadioTeam] = useState("all teams");

  const changeTeamFilter = (id: string) => {
    let button = document.getElementById(id) as HTMLInputElement;
    setRadioTeam(button.value);
  };

  return (
    <>
      <div className="radiobuttons-div">
        <label>
          <input
            type="radio"
            id="dffl1"
            name="league"
            value="DFFL 1"
            onClick={() => changeTeamFilter("dffl1")}
          />
          <span> DFFL 1 </span>
        </label>
        <label>
          <input
            type="radio"
            id="dffl2"
            name="league"
            value="DFFL 2"
            onClick={() => changeTeamFilter("dffl2")}
          />
          <span> DFFL 2 </span>
        </label>
        <label>
          <input
            type="radio"
            id="allTeams"
            name="league"
            value="all teams"
            defaultChecked
            onClick={() => changeTeamFilter("allTeams")}
          />
          <span> alle Teams </span>
        </label>
      </div>
      <div className="search-div">
        <input
          className="form-control me-2"
          id="searchbar"
          type="search"
          placeholder="Team"
          aria-label="Search"
          onChange={onChange}
          value={searchInput}
        />
        <button
          className="btn btn-secondary dropdown-toggle"
          type="button"
          data-bs-toggle="dropdown"
          aria-expanded="false"
          onClick={() => showAllTeams()}
        ></button>
        <button
          id="searchbutton"
          type="button"
          className="btn btn-primary"
          onClick={() => onSearch(searchInput)}
        >
          Team laden
        </button>
      </div>
      <div className="dropdown">
        {teams
          .filter((team) => {
            const searchTerm = searchInput.toLowerCase();
            const teamName = team.teamName.toLowerCase();

            if (radioTeam === "all teams") {
              if (showAll) {
                return teamName.startsWith(searchTerm);
              } else {
                return searchTerm && teamName.startsWith(searchTerm);
              }
            } else {
              if (showAll) {
                return (
                  teamName.startsWith(searchTerm) && radioTeam === team.league
                );
              } else {
                return (
                  searchTerm &&
                  teamName.startsWith(searchTerm) &&
                  radioTeam === team.league
                );
              }
            }
          })
          .map((team) => (
            <div
              onClick={() => onSearch(team.teamName)}
              className="dropdown-row"
            >
              {team.teamName}
            </div>
          ))}
      </div>
    </>
  );
}

export default SearchableDropdown;
