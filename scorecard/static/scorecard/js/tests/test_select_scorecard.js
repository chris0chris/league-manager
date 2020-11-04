QUnit.module("game*Selection Initialisierung Test", function (hooks) {
  hooks.beforeEach(function (assert) {
    console.log("beforeEach");
    apiLoadGamedays = sinon.stub(API, "loadGamedays");
    apiLoadGameInformation = sinon.stub(API, "loadGameInformation");

    // wird benötigt, da QUnit das Fixture clont und damit die Listener weg sind
    $("#gamedaySelection").change(function (e) {
      initGamesDropdown(testdata3games());
    });
    $("#gameSelection").change(updatePinInput);
  });
  hooks.afterEach(function (assert) {
    apiLoadGamedays.restore();
    apiLoadGameInformation.restore();
    assert.dom("#displayGameInput").isNotVisible();
    assert.dom("#displayGameSetup").isNotVisible();
  });

  QUnit.test(
    "initGamedaysDropdown mit mehreren Spieltagen wid korrekt initialisiert",
    function (assert) {
      initGamedaysDropdown(testdata2gamedays());
      assert.dom("#pin").isNotVisible();
      assert.dom("#errorMessagePin").isNotVisible();
      assert.dom("#gamedaySelection").isVisible();
      assert.equal(
        $("#gamedaySelection option:selected").val(),
        "",
        '"Bitte Spieltag auswählen" ist ausgewählt'
      );
      assert.dom($("#gamedaySelection option")[0]).isDisabled();
      assert
        .dom($("#gamedaySelection option")[0])
        .hasText("Bitte einen Spieltag auswählen");
      assert.dom($("#gamedaySelection option")[1]).hasValue("0");
      assert.dom($("#gamedaySelection option")[1]).hasText("Test Gameday 0");
      assert.dom($("#gamedaySelection option")[2]).hasValue("1");
      assert.dom($("#gamedaySelection option")[2]).hasText("Test Gameday 1");
      assert.dom("#gameSelection").isDisabled();
      assert.dom("#displayGameInput").isNotVisible();
      assert.dom("#displayGameSetup").isNotVisible();
    }
  );

  QUnit.test("initGameDropdown Initialisierung bei einem Spieltag", function (
    assert
  ) {
    initGamedaysDropdown(testdata1gameday());
    var done = assert.async();
    setTimeout(function () {
      assert.dom("#gameSelection").isNotDisabled();
      assert.equal(
        $("#gamedaySelection option:selected").val(),
        0,
        "Korrekter Spieltag ausgewählt"
      );
      done();
    }, 1);
  });

  QUnit.test(
    "initGameDropdown Initialisierung bei Auswahl mehrere Spieltage",
    function (assert) {
      initGamedaysDropdown(testdata2gamedays());
      assert.dom("#gameSelection").isDisabled();
      $("#gamedaySelection").val(1).change();
      $("#gamedaySelection").val(0).change();
      assert.dom("#gameSelection").isNotDisabled();
      assert.equal(
        $("#gameSelection option").length,
        4,
        "Anzahl GameDropdown-Optionen stimmt"
      );
      assert.dom("#pin").isNotVisible();
      assert.dom("#errorMessagePin").isNotVisible();
      assert.dom($("#gameSelection option")[0]).isDisabled();
      assert
        .dom($("#gameSelection option")[0])
        .hasText("Bitte ein Spiel auswählen");
      assert
        .dom($("#gameSelection option")[1])
        .hasAttribute("data-haspin", "true");
      assert.dom($("#gameSelection option")[1]).hasValue("1");
      assert
        .dom($("#gameSelection option")[1])
        .hasText("10:00:00 - Feld 1: OFFICIAL-TEAM 1");
      assert
        .dom($("#gameSelection option")[2])
        .hasAttribute("data-haspin", "false");
      assert
        .dom($("#gameSelection option")[2])
        .hasText("11:10:00 - Feld 1: OFFICIAL-TEAM 2");
      assert.dom($("#gameSelection option")[2]).hasValue("2");
      assert.dom("#displayGameInput").isNotVisible();
      assert.dom("#displayGameSetup").isNotVisible();
      assert
        .dom($("#gamedaySelection option")[2])
        .hasText("Test Gameday 1");
      assert.dom("#displayGameInput").isNotVisible();
      assert.dom("#displayGameSetup").isNotVisible();
    }
  );
});

// QUnit.module("gameSelection Test", function (hooks) {
//   hooks.beforeEach(function (assert) {
//     // wird benötigt, da QUnit das Fixture clont und damit die Listener weg sind
//     $("#gamedaySelection").change(function (e) {
//       initGamesDropdown($(this).val());
//     });
//     $("#gameSelection").change(updatePinInput);

//     initGamedaysDropdown(testdata2gamedays());
//     $("#gamedaySelection").val(0).change();
//   });
//   hooks.afterEach(function (assert) {
//     assert.dom("#displayGameInput").isNotVisible();
//     assert.dom("#displayGameSetup").isNotVisible();
//   });

//   QUnit.test("gameSelection -> vorhandenen PIN Text überprüfen", function (
//     assert
//   ) {
//     $("#gameSelection").val("1").trigger("change");
//     assert.dom("#pin").isVisible();
//     assert.equal(
//       $("#pin").next().text(),
//       "Korrekten PIN für Spiel eingeben",
//       "korrekter Text für vergebenenen PIN wird angezeigt"
//     );
//   });

//   QUnit.test("gameSelection -> nicht vergebenen PIN Text überprüfen", function (
//     assert
//   ) {
//     $("#gameSelection").val("2").trigger("change");
//     assert.dom("#pin").isVisible();
//     assert.equal(
//       $("#pin").next().text(),
//       "Bitte PIN vergeben",
//       "korrekter Text für vorhandenen PIN wird angezeigt"
//     );
//   });

//   QUnit.test("gameSelection -> vorhandenen PIN fehlerhaft eingeben", function (
//     assert
//   ) {
//     var done = assert.async();
//     assert.dom("#errorMessagePin").isNotVisible();
//     $("#gameSelection").val("1").trigger("change");
//     $("#pin").val("-0");
//     $("#selectGame").click();
//     setTimeout(function () {
//       assert.dom("#errorMessagePin").isVisible();
//       done();
//     }, 10);
//   });

//   QUnit.test("gameSelection -> PIN Feld leer und abschicken", function (
//     assert
//   ) {
//     var done = assert.async();
//     assert.dom("#errorMessagePin").isNotVisible();
//     $("#gameSelection").val("1").trigger("change");
//     $("#selectGame").click();
//     setTimeout(function () {
//       assert.dom("#errorMessagePin").isNotVisible();
//       done();
//     }, 10);
//   });
// });

// var serverLoadGameInformation = null;
// var serverUpdatePin = null;

// QUnit.module("gameSelection korrekte Auswahl", function (hooks) {
//   hooks.beforeEach(function (assert) {
//     // wird benötigt, da QUnit das Fixture clont und damit die Listener weg sind
//     $("#gamedaySelection").change(function (e) {
//       initGamesDropdown($(this).val());
//     });
//     $("#gameSelection").change(updatePinInput);

//     initGamedaysDropdown(testdata2gamedays());
//     $("#gamedaySelection").val(0).change();

//     serverLoadGameInformation = sinon.stub(Server, "loadGameInformation");
//     serverUpdatePin = sinon.stub(Server, "updatePin");
//   });
//   hooks.afterEach(function (assert) {
//     assert.dom("#displayGameInput").isNotVisible();
//     assert.dom("#displayGameSetup").isNotVisible();
//     assert.dom("#errorMessagePin").isNotVisible();
//     serverLoadGameInformation.restore();
//     serverUpdatePin.restore();
//   });
//   QUnit.test(
//     "gameSelection -> nicht vergebener PIN, neuer PIN wird eingegeben und abgeschickt",
//     function (assert) {
//       var done = assert.async();
//       $("#gameSelection").val("2").change();
//       $("#pin").val("123");
//       $("#selectGame").click();
//       setTimeout(function () {
//         assert.deepEqual(
//           serverUpdatePin.args,
//           [["123", "123456789", "2"]],
//           "PIN Update funktioniert"
//         );
//         assert.deepEqual(
//           serverLoadGameInformation.args,
//           [["123456789", "2"]],
//           "loadGameInformation wurde erfolgreich an Server übergeben"
//         );
//         done();
//       }, 10);
//     }
//   );
//   QUnit.test(
//     "gameSelection -> vergebene PIN wird korrekt eingegeben und abgeschickt",
//     function (assert) {
//       var done = assert.async();
//       $("#gameSelection").val("1").trigger("change");
//       $("#pin").val("1");
//       $("#selectGame").click();
//       setTimeout(function () {
//         assert.deepEqual(
//           serverLoadGameInformation.args,
//           [["123456789", "1"]],
//           "loadGameInformation wurde erfolgreich an Server übergeben"
//         );
//         done();
//       }, 10);
//     }
//   );
// });
