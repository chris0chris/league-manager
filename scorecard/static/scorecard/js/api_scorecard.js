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
  this.loadGames = function (id) {
      console.log("API loadGames")
      $.get( "/api/gameday/" + id + "/details?get=schedule", initGamesDropdown );
  }
  this.loadGameInformation = function (id) {
    console.log("API loadGameInformation")
    $.get( "/api/gameofficial/create?gameinfo=" + id, initGameSetup);
  };
  this.storeSetup = function (setup) {
    console.log("API ");
    google.script.run.storeSetup(setup);
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
