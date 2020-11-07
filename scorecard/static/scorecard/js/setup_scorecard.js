function initOfficials(officialsInfo) {
  for (index in officialsInfo) {
    $('#' + officialsInfo[index].position).val(officialsInfo[index].name)
    $('#' + officialsInfo[index].position).attr('data-id', officialsInfo[index].id)
  }
}

function initSetupInfos(gameInfo) {
  console.log('initSetupInfos')
  console.log(gameInfo)
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
  // initTeams(gameInfo)
}


function startGame() {
  var posessionFh = $('input[name="fhPosession"]:checked').val();
  var directionFh = $('input[name="direction"]:checked').val();
  $('#refBall').text(posessionFh);
  $('#refDir').text(directionFh);


  collectSetup()
  collectOfficials()

  initDetails()
  document.body.scrollIntoView()
};

function collectSetup() {
  let setup = {}
  setup.fhPossession = $('input[name="ctWon"]:checked').val();
  setup.fhDirection = $('input[name="direction"]:checked').val();
  setup.ctResult = $('input[name="fhPosession"]:checked').val();
  setup.gameinfo = $('#gameSelection').val()

  API.saveSetup(setup)
}

function collectOfficials() {
  let positions = ['scJudge', 'referee', 'linesman', 'fieldjudge', 'sidejudge']
  let officials = []
  let gameinfo = $('#gameSelection').val()
  for(let i in positions) {
    officials.push({
      "name": $('#' + positions[i]).val(),
      "position": positions[i],
      "gameinfo": gameinfo,
      "id": $('#' + positions[i]).data('id')
    })
  }
  console.log('officials')
  console.log(officials)
  API.saveOfficials(officials)
}