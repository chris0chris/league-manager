export class GameSetup {
  constructor(
    scJudge = "",
    referee = "",
    downJudge = "",
    fieldJudge = "",
    sideJudge = "",
    ctWon = "",
    fhPossession = "",
    direction = ""
  ) {
    this.scJudge = scJudge;
    this.referee = referee;
    this.downJudge = downJudge;
    this.fieldJudge = fieldJudge;
    this.sideJudge = sideJudge;
    this.ctWon = ctWon;
    this.fhPossession = fhPossession;
    this.direction = direction;
  }
}
