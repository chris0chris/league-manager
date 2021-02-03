export class GameSetup {
  constructor(gameId = null, ctWon = "", fhPossession = "", direction = "") {
    this.gameinfo = gameId;
    this.ctResult = ctWon;
    this.fhPossession = fhPossession;
    this.direction = direction;
  }
}

export class Official {
  constructor(gameId, name, position) {
    this.gameinfo = gameId;
    this.name = name;
    this.position = position;
  }
}

Official.REFEREE = "Referee";
Official.DOWN_JUDGE = "Down Judge";
Official.SCORECARD_JUDGE = "Scorecard Judge";
Official.FIELD_JUDGE = "Field Judge";
Official.SIDE_JUDGE = "Side Judge";
