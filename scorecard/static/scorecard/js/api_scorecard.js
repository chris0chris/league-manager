var API = new (function () {
  this.loadGamedays = function () {
    console.log("API loadingGames");
    $.get("/api/gameday/list", initGamedaysDropdown);
  };
  this.updatePin = function (id, pin) {
    console.log("API updatePin");
    $.ajax({
      type: "put",
      url: "/api/gameinfo/" + id + "/",
      data: { "pin": pin },
      success: "",
      dataType: "json",
    });
  };
  this.saveOfficials = function (id, officials) {
    console.log("API saveOfficials");
    // ToDo Url anpassen und data checken
    // $.ajax({
    //   type: "put",
    //   url: "/api/gameofficial/" + id + "/",
    //   data: { officials },
    //   success: "",
    //   dataType: "json",
    // });
  };

  this.loadGames = function (id) {
      console.log("API loadGames")
      $.get( "/api/gameday/" + id + "/details?get=schedule", initGamesDropdown );
  }
  this.loadGameInformation = function (id) {
    console.log("API loadGameInformation")
    $.get( "/api/gameofficial/create?gameinfo=" + id, initOfficials);
    initSetupInfos({
      'id': 1,
      'gameday_id': 1,
      'scheduled': '10:00:00',
      'field': 1,
      'officials': 'officials',
      'status': 'beendet',
      'pin': '',
      'gameStarted': '',
      'gameHalftime': '',
      'gameFinished': '',
      'stage': 'Vorrunde',
      'standing': 'Gruppe 1',
      'gameinfo_id': 1,
      'id_home': 1,
      'home': 'A1',
      'points_home': 3,
      'points_away': 2,
      'away': 'A2',
      'id_away': 2
  })
    // ToDo @Nik - einkommentieren, wenn in der API angepasst und oberen aufruf löschen
    // $.get("/api/gameinfo/" + id, initSetupInfos)
  };
  this.saveSetup = function (setup) {
    console.log("API saveSetup");
    // ToDo Url anpassen und data checken
    // $.ajax({
    //   type: "put",
    //   url: "/api/gamesetup/" + id + "/",
    //   data: { setup },
    //   success: "",
    //   dataType: "json",
    // });
  };
  this.saveScore = function (master, text) {
    console.log("API ");
    console.log("saving score ...");
    google.script.run.saveScore(master, text);
  };
  this.finalizeGame = function (finalScore) {
    console.log("API ");
    google.script.run.withFailureHandler(onFailure).finalizeGame(finalScore);
  };
  this.halfetime = function (master) {
    console.log("API ");
    google.script.run.halfetime(master);
  };
})();
