$(document).ready(function () {
    $.get( "/api/gameday/list", initGamedaysDropdown );
    $('#gamedaySelection').change(function () {
      $.get( "/api/gameday/" + $(this).val() + "/details?get=schedule", initGamesDropdown );
    });
    $('#gameSelection').change(function () {
        console.log('updatePinInput');
        updatePinInput();
    });
});

function initGamedaysDropdown(gamedays) {
    console.log('initGamedaysDropdown');
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
    $('#gameSelection').empty();
    $('#gameSelection').append('<option value="" disabled selected>Bitte ein Spiel auswählen</option>')
    for (const i in games) {
        console.log(games[i])
        let newOption = document.createElement("option");
        let name = games[i].scheduled + " - Feld " + games[i].field + ": " + games[i].officials;
        $(newOption).val(games[i].id);
        $(newOption).html(name);
        console.log(games[i].pin)
        console.log(games[i].pin == '')
        $(newOption).attr('data-haspin', games[i].pin == '' ? 'false' :  'true');
        $('#gameSelection').append(newOption);
    }
    $('#gameSelection').prop('disabled', false);
}

function loadGameInfo() {
    if ($('#gameSelection').children('option:selected').data('haspin')) {
      // PIN stimmt
      if (gamedays[$('#gamedaySelection').val()].games[$('#gameSelection').prop('selectedIndex') - 1].pin == $('#pin').val()) {

        // PIN stimmt nicht
      } else {
        $('#errorMessagePin').show();
        return;
      }
    } else {
        $.ajax({
            type: 'put',
            url: "/api/gameinfo/" + $('#gameSelection').val() + "/",
            data: {"pin": $('#pin').val()},
            success: '',
            dataType: 'json'
        });
//        $.get("/api/gameinfo/" + $('#gameSelection').val(), {"pin": $('#pin').val()})
    }

    $.get( "/api/gameofficial/create?gameinfo=" + $('#gameSelection').val(), initGameSetup);
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

