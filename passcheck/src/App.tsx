import PlayersOverview from "./components/PlayersOverview";

function App() {
  return (
    <>
      <h1>Passcheck von "Teamname"</h1>
      <div>Feld: "Feld"</div>
      <div>Kickoff: "Uhrzeit"</div>
      <div>
        <PlayersOverview />
      </div>
    </>
  );
}

export default App;
