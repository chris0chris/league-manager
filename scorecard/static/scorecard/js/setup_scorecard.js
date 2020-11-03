function initGameSetup(gameInfo) {
  $('#setupTitle').text('Feld ' + gameInfo.field + ': ' + gameInfo.home + ' vs ' + gameInfo.away)
  $('#possHome').val(gameInfo.home);
  $('#possHome').next().text(gameInfo.home);
  $('#ctAway').text(gameInfo.away);
  $('#possAway').val(gameInfo.away);
  $('#possAway').next().text(gameInfo.away);
  $('#displayGameSetup').show();
  $('#displayGameSelection').hide();
  let startDate = new Date();
  $('#gameDate').append(startDate.getDate() + "." + (startDate.getMonth() + 1) + "." + startDate.getFullYear());
  let minutes = (startDate.getMinutes() < 10 ? '0' : '') + startDate.getMinutes()

  $('#startDate').append(startDate.getHours() + ":" + minutes);
  setTimeout(function () { $('#scJudge').focus(); }, 10);
  document.body.scrollIntoView()
  initTeams(gameInfo)
}


function startGame() {
  var posessionFh = $('input[name="fhPosession"]:checked').val();
  var directionFh = $('input[name="direction"]:checked').val();
  $('#refBall').text(posessionFh);
  $('#refDir').text(directionFh);

  Server.storeSetup(collectSetup());

  initDetails()
  document.body.scrollIntoView()
};

function collectSetup() {
  let setup = {}
  setup.scJudge = $('#scJudge').val();
  setup.referee = $('#referee').val();
  setup.linesman = $('#linesman').val();
  setup.fieldJudge = $('#fieldjudge').val();
  setup.sideJudge = $('#sidejudge').val();
  setup.homeTeam = $('#possHome').val();
  setup.awayTeam = $('#possAway').val();
  setup.startDate = $('#startDate').text();
  setup.htDate = $('#htDate').text();
  setup.endDate = $('#endDate').text();
  setup.gameDate = $('#gameDate').text();
  setup.fhPossession = $('input[name="ctWon"]:checked').val();
  setup.fhDirection = $('input[name="direction"]:checked').val();
  setup.ctResult = $('input[name="fhPosession"]:checked').val();
  setup.gameDayName = master.gameDayName;

  return setup

}