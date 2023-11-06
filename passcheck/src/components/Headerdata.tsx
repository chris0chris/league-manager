var teamDataJson = require("../data/json_format.json");

function Headerdata() {
  return (
    <>
      <h1>Passcheck von {teamDataJson.teamname}</h1>
    </>
    /*
      <div>Feld: {teamDataJson.field}</div>
      <div>Kickoff: {teamDataJson.kickoff}</div>
    </> */
  );
}

export default Headerdata;
