$(document).ready(function () {
    $.get( "/api/gameday/list", initGamedaysDropdown );
    $('#gamedaySelection').change(function () {
        console.log($(this));
      $.get( "/api/gameday/" + $(this).val() + "/details?get=schedule", initGamesDropdown );
    });
});

function initGamedaysDropdown(gamedays) {
    console.log('initGamedaysDropdown');
    this.gamedays = Object.assign({}, gamedays);
    console.log(gamedays);
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
    console.log(games)
    console.log(games.length);

    $('#gameSelection').empty();
    $('#gameSelection').append('<option value="" disabled selected>Bitte ein Spiel auswählen</option>')
    for (var i = 0 in games) {
      console.log(games[i]);
      let newOption = document.createElement("option");
      let name = games[i].scheduled + " - Feld " + games[i].field + ": " + games[i].officials;
      $(newOption).val(games[i].id);
      $(newOption).html(name);
      $(newOption).attr('data-haspin', /*games.data[i].pin == '' ? 'false' : */ 'true');
      $('#gameSelection').append(newOption);
    }
//    $('#gameSelection').prop('name', gameday.id);
    $('#gameSelection').prop('disabled', false);
}
