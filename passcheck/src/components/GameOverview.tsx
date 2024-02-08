import {useEffect, useState} from 'react';
import {Game, GameList} from '../common/types';
import GameCard from './GameCard';
import {getPasscheckData} from '../common/games';
import {SCORECARD_URL} from '../common/routes';
import useMessage from '../hooks/useMessage';
import {ApiError} from '../utils/api';

function GameOverview() {
  const [games, setGames] = useState<GameList>([]);
  const [officials, setOfficials] = useState<string>('');
  const [tokenKey, setTokenKey] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const {setMessage} = useMessage();

  useEffect(() => {
    getPasscheckData()
      .then((result) => {
        setGames(result.games);
        setOfficials(result.officialsTeamName);
        setLoading(false);
      })
      .catch((error: ApiError) => setMessage({text: error.message}));
  }, []);

  return (
    <>
      {loading && <p>loading...</p>}
      {!loading && (
        <>
          <h1>Herzlich willkommen, {officials}.</h1>
          <div>Bitte ein Spiel auswählen:</div>
          {games.map((game: Game, index: number) => (
            <GameCard key={index} game={game} />
          ))}
        </>
      )}
    </>
  );
}

export default GameOverview;
