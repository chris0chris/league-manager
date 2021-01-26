import React, { useEffect } from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import { getGamedays } from "../../actions/gamedays";

const Gamedays = (props) => {
  useEffect(() => {
    console.log("useEffect called", props);
    props.getGamedays();
  }, []);
  return (
    <div>
      {props.gamedays.map((gameday) => (
        <div key={gameday.id}>
          {gameday.date} {gameday.name}
        </div>
      ))}
    </div>
  );
};

const mapStateToProps = (state) => ({
  gamedays: state.gamedaysReducer.gamedays,
});

Gamedays.propTypes = {
  gamedays: PropTypes.array.isRequired,
};

export default connect(mapStateToProps, { getGamedays })(Gamedays);
