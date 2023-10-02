import { useState } from "react";

interface Props {
  teamName: string;
  league: string;
  checked: boolean;
}

function TeamButton({ teamName, checked }: Props) {
  const [checkedTeam, setChecked] = useState<boolean>(false);

  const clickHandler = (team: string) => {
    console.log(team);
    setChecked(!checkedTeam);
  };

  return (
    <div>
      <label>
        <span>{teamName} </span>
        <input type="button" onClick={() => clickHandler(teamName)} />
      </label>
      {checkedTeam && <span>gecheckt</span>}
    </div>
  );
}

export default TeamButton;
