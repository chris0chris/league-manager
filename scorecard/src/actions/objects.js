/**
 * Class for GameSetup
 */
export class GameSetup {
  /**
   * @param {number} gameId
   * @param  {String} ctResult='' result of coin toss
   * @param  {String} fhPossession='' who has ball possession in the first half
   * @param  {String} direction='' which direction will be played in first half
   */
  constructor(gameId = null, ctResult = '', fhPossession = '', direction = '') {
    this.gameinfo = gameId;
    this.ctResult = ctResult;
    this.fhPossession = fhPossession;
    this.direction = direction;
  }
}

/**
 * Class for Official
 */
export class Official {
  /**
   * @param  {number} gameId
   * @param  {String} name of official
   * @param  {String} position of official see Official.*
   */
  constructor(gameId, name, position) {
    this.gameinfo = gameId;
    this.name = name;
    this.position = position;
  }
}

Official.REFEREE = 'Referee';
Official.DOWN_JUDGE = 'Down Judge';
Official.SCORECARD_JUDGE = 'Scorecard Judge';
Official.FIELD_JUDGE = 'Field Judge';
Official.SIDE_JUDGE = 'Side Judge';
