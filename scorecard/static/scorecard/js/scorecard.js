$(document).ready(function () {
    $.get( "/api/gameday/list", initGamedaysDropdown );
    $('#gamedaySelection').change(function () {
        console.log($(this));
      $.get( "/api/gameday/" + $(this).val() + "/details?get=schedule", initGamesDropdown );
    });
});

function initGamedaysDropdown(gamedays) {
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
      setTimeout(function() {$('#gamedaySelection').val(0).change()}, 1)
    }
    //          $('select').formSelect();
 }

function initGamesDropdown(index) {
    console.log(index);
    let gameday = this.gamedays[index]
    $('#gameSelection').empty();
    $('#gameSelection').append('<option value="" disabled selected>Bitte ein Spiel auswählen</option>')
    for (var i = 0; i < gameday.games.length; i++) {
      let newOption = document.createElement("option");
      let name = gameday.games[i].gameTime + " - " + "Feld " + gameday.games[i].field + ": " + gameday.games[i].refTeam;
      $(newOption).val(gameday.games[i].gameRow);
      $(newOption).html(name);
      $(newOption).attr('data-haspin', gameday.games[i].pin == '' ? 'false' : 'true');
      $('#gameSelection').append(newOption);
    }
    $('#gameSelection').prop('name', gameday.id);
    $('#gameSelection').prop('disabled', false);
}
