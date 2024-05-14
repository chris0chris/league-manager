import React, { useEffect, useState } from "react";
import Games from "./Games";
import Gamedays from "./Gamedays";
import { connect, useDispatch } from "react-redux";
import PropTypes from "prop-types";
import { getGamedays } from "../../actions/gamedays";
import { getGames, setSelectedGame } from "../../actions/games";
import { getTeamOfficials } from "../../actions/officials";
import { Navigate, useSearchParams } from "react-router-dom";
import { OFFICIALS_URL, stringToBoolean } from "../common/urls";
import { getGameSetup, getOfficials } from "../../actions/gamesetup";
import { GET_ERRORS, GET_GAMES } from "../../actions/types";

const SelectGame = (props) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isSelectedGameLoaded, setSelectedGameLoaded] = useState(false);
  const [gamesForGamedayLoaded, setGamesForGamedayLoaded] = useState(false);
  const [selectedGamedayId, setSelectedGamedayId] = useState(null);
  const dispatch = useDispatch();
  useEffect(() => {
    props.getGamedays();
  }, [props.gamedays.length]);

  useEffect(() => {
    const id = searchParams.get("id");
    const loadAll = stringToBoolean(searchParams.get("loadAll"));
    console.log("id", id, !id);
    if (!id) {
      console.log("id is empty", id, searchParams.size);
      setGamesForGamedayLoaded(false);
      if (searchParams.size > 0) {
        console.log("dispatching GET_ERRORS");
        dispatch({
          type: GET_ERRORS,
          payload: {
            msg: "Bitte einen Spieltag auswählen!",
            status: 500,
          },
        });
      }
      return;
    }
    props.getGames(id, loadAll ? "*" : props.user.username);
    setSelectedGamedayId(id);
    setGamesForGamedayLoaded(true);
  }, [searchParams]);

  const updateSearchParams = (id) => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("id", id);
    console.log("searchParams", ...searchParams, { ...searchParams, id });
    setSearchParams(newSearchParams);
  };
  const loadAllGames = (loadAll) => {
    console.log("loadAllGames :>>", loadAll);
    setSearchParams({ id: selectedGamedayId ?? "", loadAll: loadAll });
  };

  const loadGame = (index) => {
    props.setSelectedGame(props.games[index]);
    props.getOfficials(props.games[index].id);
    props.getGameSetup(props.games[index].id);
    props.getTeamOfficials(props.games[index].officialsId);
    setSelectedGameLoaded(true);
  };
  if (isSelectedGameLoaded) {
    return <Navigate to={OFFICIALS_URL} />;
  }
  return (
    <div>
      <Gamedays gamedays={props.gamedays} onClick={updateSearchParams} />
      {gamesForGamedayLoaded && (
        <Games
          games={props.games}
          onClick={loadGame}
          loadAllGames={loadAllGames}
        />
      )}
    </div>
  );
};

SelectGame.propTypes = {
  gamedays: PropTypes.array.isRequired,
  games: PropTypes.array.isRequired,
  user: PropTypes.object.isRequired,
  getGamedays: PropTypes.func.isRequired,
  getGames: PropTypes.func.isRequired,
  getTeamOfficials: PropTypes.func.isRequired,
  getOfficials: PropTypes.func.isRequired,
  getGameSetup: PropTypes.func.isRequired,
  setSelectedGame: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  gamedays: state.gamedaysReducer.gamedays,
  games: state.gamesReducer.games,
  user: state.authReducer.user,
});

export default connect(mapStateToProps, {
  getGamedays,
  getGames,
  setSelectedGame,
  getTeamOfficials,
  getOfficials,
  getGameSetup,
})(SelectGame);
