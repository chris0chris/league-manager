$(document).ready(function () {
    API.loadGamedays()
    $('#gamedaySelection').change(function () {
        API.loadGames($(this).val())
    });
    $('#gameSelection').change(function () {
        console.log('updatePinInput');
        updatePinInput();
    });
});

function initGamedaysDropdown(gamedays) {
    console.log('initGamedaysDropdown');
    console.log(gamedays)
    this.gamedays = Object.assign({}, gamedays);
    // Initialen Text ersetzen
    $('#gamedaySelection').empty().append('<option value="" disabled selected>Bitte einen Spieltag auswählen</option>')
    for (let i = 0; i < gamedays.length; i++) {
      var newOption = document.createElement("option");
      $(newOption).val(gamedays[i].id);
      $(newOption).html(gamedays[i].name);
      $('#gamedaySelection').append(newOption);
    }
    $('#gamedaySelection').prop('disabled', false);
    if(gamedays.length == 1) {
        setTimeout(function() {$('#gamedaySelection').val(gamedays[0].id).change()}, 1)
    }
    //          $('select').formSelect();
 }

function initGamesDropdown(games) {
    console.log('games')
    console.log(games)
    $('#gameSelection').empty();
    $('#gameSelection').append('<option value="" disabled selected>Bitte ein Spiel auswählen</option>')
    for (const i in games) {
        let newOption = document.createElement("option");
        let name = games[i].scheduled + " - Feld " + games[i].field + ": " + games[i].officials;
        $(newOption).val(games[i].id);
        $(newOption).html(name);
        $(newOption).attr('data-haspin', games[i].pin == '' ? 'false' :  'true');
        $('#gameSelection').append(newOption);
    }
    $('#gameSelection').prop('disabled', false);
}

function loadGameInfo() {
    if ($('#gameSelection').children('option:selected').data('haspin')) {
      // PIN stimmt
      if (true) {// TODO fixme - wenn klar ist, wie mit Passwort umgegangen wird megamedays[$('#gamedaySelection').val()].games[$('#gameSelection').prop('selectedIndex') - 1].pin == $('#pin').val()) {

        // PIN stimmt nicht
      } else {
        $('#errorMessagePin').show();
        return;
      }
    } else {
        API.updatePin($('#gameSelection').val(), $('#pin').val())
    }
    API.loadGameInformation($('#gameSelection').val())
    $('#selectGame').prop('disabled', true)
    $('#selectGame').text('Spiel wird geladen...')
    $('#errorMessagePin').hide()
}

function updatePinInput() {
    if ($('#gameSelection').children('option:selected').data('haspin')) {
        $('#pin').next().text('Korrekten PIN für Spiel eingeben');
    } else {
        $('#pin').next().text('Bitte PIN vergeben');
    }
    $('#pin').show();
    setTimeout(function () { $('#pin').focus(); }, 10);
}

