import { Button } from "react-bootstrap";
import TeamCard from "./TeamCard";
import { jsonTypeGames } from "../common/types";
import {useNavigate} from 'react-router-dom';

interface Props {
    index: number;
    games: jsonTypeGames;
    officials: string;
    loadTeam: (team: string) => void;
    playersLoaded: boolean;
}

function TeamOverview({ index, games, officials, loadTeam, playersLoaded }: Props) {
    const navigate = useNavigate();
    const handleClickEvent = () => {
        navigate('/');
    }

  return (
    <>
        <h1>{games[index].home} - {games[index].away}</h1>
        <Button onClick={handleClickEvent} >Auswahl abbrechen</Button>
        <br />
            <div>
              <TeamCard team={games[index].home} index={index} games={games} loadTeam={loadTeam} playersLoaded={playersLoaded} />
            </div>
            <br />
            <div>
              <TeamCard team={games[index].away} index={index} games={games} loadTeam={loadTeam} playersLoaded={playersLoaded} />
            </div>
    </>
  );
}

export default TeamOverview;
