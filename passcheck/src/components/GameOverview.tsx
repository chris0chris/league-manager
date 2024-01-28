import {Button} from 'react-bootstrap';
import GameCard from './GameCard';
import {useState, useEffect} from 'react';
import {Game, GameList} from '../common/types';
//import { getGames, getOfficials, getTeams, getGamedays } from "../common/games";
import {getPasscheckData} from '../common/games';

interface Props {
  gamesWithKeys: GameList;
  officials: string;
  loadIndex: (game: Game) => void;
}

function GameOverview({gamesWithKeys, officials, loadIndex}: Props) {
  return (
    <>
      <h1>Herzlich willkommen, {officials}.</h1>
      <div>Bitte ein Spiel auswählen:</div>
      {gamesWithKeys.map((game: Game, index: number) => (
        <div>
          <GameCard
            key={index}
            officialsTeam={officials}
            game={game}
            loadIndex={loadIndex}
          />
        </div>
      ))}
    </>
  );
}

export default GameOverview;
