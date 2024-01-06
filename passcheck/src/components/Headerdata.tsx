var teamDataJson = require("../data/json_format.json");

interface Props {

}


function Headerdata() {
  return (
    <>
      <h1>Passcheck von {teamDataJson.teamname}</h1>
    </>
  );
}

export default Headerdata;
