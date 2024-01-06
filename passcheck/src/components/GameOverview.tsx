import { Button } from "react-bootstrap";
import GameCard from "./GameCard";
import { useState, useEffect } from "react";
import { jsonTypeGames } from "../common/types";
//import { getGames, getOfficials, getTeams, getGamedays } from "../common/games";
import {getPasscheckData} from "../common/games";


interface Props {
    gamesWithKeys: jsonTypeGames;
    officials: string;
    loadIndex: (index: number) => void;
}

function GameOverview({ gamesWithKeys, officials, loadIndex }: Props) {

  return (
    <>
        <h1>Herzlich willkommen, {officials}.</h1>
        <div>
            Bitte ein Spiel auswählen:
        </div>
        {gamesWithKeys.map((game: any) => (
        <div>
          <GameCard index={game.key} officialsTeam={officials} games={gamesWithKeys} loadIndex={loadIndex}/>
        </div>
        ))}
    </>
  );
}

export default GameOverview;
