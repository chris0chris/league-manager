QUnit.module("GameSetup Test", function (hooks) {
  var serverHalfetime = null;
  hooks.beforeEach(function (assert) {
    // wird für Halbzeit check benötigt
    // serverHalfetime = sinon.stub(Server, "halfetime");

    initOfficials(testdata3games());
    initSetupInfos(testdataGame());
  });

  hooks.afterEach(function (assert) {
    // serverHalfetime.restore();
  });

  QUnit.test("initSetup wird korrekt initialisiert", function (assert) {
    assert.dom("#displayGameInput").isNotVisible();
    assert.dom("#displayGameSetup").isVisible();
    assert.dom("#displayGameSelection").isNotVisible();
    assert.dom("#setupTitle").hasText("Feld 1: HOME vs AWAY");
    assert.dom("#possHome").hasValue("HOME");
    assert.equal(
      $("#possHome").next().text(),
      "HOME",
      "HomeTeam-Name korrekt gesetzt"
    );
    assert.dom("#possAway").hasValue("AWAY");
    assert.equal(
      $("#possAway").next().text(),
      "AWAY",
      "AwayTeam-Name korrekt gesetzt"
    );
    assert.dom("#ctAway").hasText("AWAY");
  });

  QUnit.test(
    "initOfficials mit vorhandenen Officials wird korrekt initialisiert",
    function (assert) {
      initOfficials(testdataOfficials());
      assert.dom("#displayGameInput").isNotVisible();
      assert.dom("#displayGameSetup").isVisible();
      assert.dom("#scJudge").hasValue("Scorecard Judge");
      assert.dom("#scJudge").hasAttribute("data-id", "1");
      assert.dom("#referee").hasValue("Referee");
      assert.dom("#referee").hasAttribute("data-id", "2");
      assert.dom("#linesman").hasValue("Linesman");
      assert.dom("#linesman").hasAttribute("data-id", "3");
      assert.dom("#fieldjudge").hasValue("Field Judge");
      assert.dom("#fieldjudge").hasAttribute("data-id", "4");
      assert.dom("#sidejudge").hasValue("Side Judge");
      assert.dom("#sidejudge").hasAttribute("data-id", "5");
    }
  );

  QUnit.test("gameSetup Server.saveSetup and save Officials wird aufgerufen", function (assert) {
    var done = assert.async();
    var apiSaveOfficials = sinon.stub(API, "saveOfficials");
    var apiSaveSetup = sinon.stub(API, "saveSetup");
    initGamesDropdown(testdata3games());
    $("#gameSelection").val(1).change();
    console.log("value", $("#gameSelection").val());

    $("#referee").val("Referee");
    $("#linesman").val("Linesman");
    $("#fieldjudge").val("FieldJudge");
    $("#sidejudge").val("SideJudge");
    $("#scJudge").val("ScorecardJudge");
    $($('input[name="ctWon"]')[0]).prop("checked", true);
    $($('input[name="direction"]')[0]).prop("checked", true);
    $($('input[name="fhPosession"]')[0]).prop("checked", true);
    $("#startGame").click();
    setTimeout(function () {
      assert.deepEqual(
        apiSaveOfficials.args[0][0][0],
        { gameinfo: "1", id: "", name: "ScorecardJudge", position: "scJudge" },
        "API.saveOfficials wurde aufgerufen"
      );
      assert.deepEqual(
        apiSaveSetup.args[0][0],
        {
          ctResult: "HOME",
          fhDirection: "arrow_forward",
          fhPossession: "won",
          gameinfo: "1",
        },
        "API.saveSetup wurde aufgerufen"
      );
      assert.dom("#displayGameSetup").isNotVisible();
      assert.dom("#displayGameInput").isVisible();
      apiSaveOfficials.restore();
      apiSaveSetup.restore();
      done();
    }, 10);
  });
});
