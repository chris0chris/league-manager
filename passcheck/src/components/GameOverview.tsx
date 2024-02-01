import {Game, GameList} from '../common/types';
import GameCard from './GameCard';
//import { getGames, getOfficials, getTeams, getGamedays } from "../common/games";

interface Props {
  games: GameList;
  officials: string;
  loadIndex: (game: Game) => void;
}

function GameOverview({games, officials, loadIndex}: Props) {
  return (
    <>
      <h1>Herzlich willkommen, {officials}.</h1>
      <div>Bitte ein Spiel auswählen:</div>
      {games.map((game: Game, index: number) => (
        <GameCard
          key={index}
          officialsTeam={officials}
          game={game}
          loadIndex={loadIndex}
        />
      ))}
    </>
  );
}

export default GameOverview;
