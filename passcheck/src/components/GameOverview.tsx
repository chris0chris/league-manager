import {useEffect, useState} from 'react';
import {Game, GameList} from '../common/types';
import GameCard from './GameCard';
import {getPasscheckData} from '../common/games';
import {SCORECARD_URL} from '../common/routes';

function GameOverview() {
  const [games, setGames] = useState<GameList>([]);
  const [officials, setOfficials] = useState<string>('');
  const [tokenKey, setTokenKey] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token !== null) {
      setTokenKey(token.slice(0, 8));
      if (tokenKey !== '') {
        getPasscheckData().then((result) => {
          setGames(result.games);
          setOfficials(result.officialsTeamName);
          setLoading(false);
        });
      }
    } else {
      if (process.env.NODE_ENV === 'production') {
        window.location.href = SCORECARD_URL;
      } else {
        alert(
          "`localStorage.setItem('token', '${localStorage.getItem('token')}')`"
        );
      }
    }
  }, [tokenKey]);

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
