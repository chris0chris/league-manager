var master = {};
var homeLog;
var awayLog;
var interval;

function startTimer(duration) {
  var start = Date.now(),
    diff,
    minutes,
    seconds;
  function timer() {
    // get the number of seconds that have elapsed since
    // startTimer() was called
    diff = duration - (((Date.now() - start) / 1000) | 0);

    // does the same job as parseInt truncates the float
    minutes = (diff / 60) | 0;
    seconds = diff % 60 | 0;

    minutes = minutes < 10 && minutes >= 0 ? "0" + minutes : minutes;
    seconds = seconds < 10 && seconds >= 0 ? "0" + seconds : seconds;

    $("#minutes").html(minutes + "<span>Minuten</span>");
    $("#seconds").html(seconds + "<span>Sekunden</span>");
  }
  // we don't want to wait a full second before the timer starts
  timer();
  interval = setInterval(timer, 1000);
}

$(document).ready(function () {
  $(".modal").modal({
    onCloseStart: function () {
      clearInterval(interval);
    },
    dismissible: false,
  });
  $("#htBtn").click(timer);
  $("[name=timeout]").click(timer);
  $("#finalBtn").click(summarize);
  $("#homeTeam").click(function () {
    $("#scoreEntry").show();
    $("#tdNumber").focus();
  });
  $("#awayTeam").click(function () {
    $("#scoreEntry").show();
    $("#tdNumber").focus();
  });
  $("#manualBtn").click(function () {
    $("#tdEntry").hide();
    $("#manualEntry").show();
    $("#manualNumber").focus();
    $("#tdNumber").prop("required", false);
  });
  $("#tdBtn").click(function () {
    $("#tdEntry").show();
    $("#manualEntry").hide();
    $("#tdNumber").focus();
    $("#tdNumber").prop("required", true);
  });
});

function initTeams(gameInfo) {
  master = Object.assign({}, gameInfo);

  master.counter = 0;
  master.sTime = $("#startDate").text();

  $("#homeTeam").val(gameInfo.home);
  $("#homeTeam").next().text(gameInfo.home);
  $("#awayTeam").val(gameInfo.away);
  $("#awayTeam").next().text(gameInfo.away);

  homeLog = $("#fhHomeLog tr:first");
  awayLog = $("#fhAwayLog tr:first");

  checkHalfetime(gameInfo);

  master.scoreHome = gameInfo.scoreHome == "" ? 0 : gameInfo.scoreHome;
  master.scoreAway = gameInfo.scoreAway == "" ? 0 : gameInfo.scoreAway;

  updateScore();
}

function initDetails() {
  $("#displayGameSetup").hide();
  $("#displayGameSelection").hide();
  $("#displayGameInput").show();
}

function checkHalfetime(gameInfo) {
  if (gameInfo.fhHome !== "") {
    master.scoreHome = gameInfo.fhHome;
    master.scoreAway = gameInfo.fhAway;
    halfetime();
  }
}

function halfetime() {
  var htDate = new Date();
  let minutes = (htDate.getMinutes() < 10 ? "0" : "") + htDate.getMinutes();
  var htTime = htDate.getHours() + ":" + minutes;
  $("#htDate").append(htTime);

  master.halfetime = true;
  master.hTime = htTime;

  master.fhHome = master.scoreHome;
  master.fhAway = master.scoreAway;
  $("#htScoreHome").text(master.scoreHome);
  $("#htScoreAway").text(master.scoreAway);

  homeLog = $("#shHomeLog tr:first");
  awayLog = $("#shAwayLog tr:first");

  Server.halfetime(master);

  $("[name=shShow]").show();
  $("[name=shHide]").hide();
  $("[name=timeout]").prop("disabled", false);
  $("#mtMins").prop("required", true);
  $("#mtSecs").prop("required", true);
  $("[name=timeout]").html('<i class="material-icons middle">timer</i>');
}

function timer() {
  $("#modalTimer").modal("open");
  if (this.id.startsWith("to")) {
    $("li").first().show();
    $("#mtMins").val("");
    $("#mtSecs").val("");
    $("#timerTitle").html("Timeout " + master[this.id.split(/[0-9]/)[1]]);
    $("#mtMins").focus();
  } else {
    $("#timerTitle").html("Halbzeit");
    $("li").first().hide();
    $("#mtMins").prop("required", false);
    $("#mtSecs").prop("required", false);
  }
  startTimer($(this).data("timer"));
  $("#saveMatchTime").val(this.id);
}

function saveMatchTime() {
  let buttonId = "#" + $("#saveMatchTime").val();
  if (buttonId.startsWith("#to")) {
    $(buttonId).prop("disabled", true);
    $(buttonId).html($("#mtMins").val() + ":" + $("#mtSecs").val());
    master.event = {};
    master.event.title = $("#timerTitle").html().split(" ")[1];
    master.event.action = "Auszeit - Restspielzeit " + $(buttonId).html();
    Server.saveScore(master);
  } else {
    halfetime();
  }
  $("#modalTimer").modal("close");
}

function saveEntry() {
  var result = {};
  master.counter = master.counter + 1;
  master.event = {};
  switch ($("input[name='entryGroup']:checked").val()) {
    case "Touchdown":
      let patNr = $("#patNumber").val();
      result = handlePoints($("input[name='group2']:checked").val(), patNr);
      result.td = handlePoints("6", $("#tdNumber").val()).td;
      result.score = patNr == "" ? 6 : result.score + 6;
      let td = getNumber(result.td);
      let pat =
        getNumber(result.pt1) == ""
          ? getNumber(result.pt2)
          : getNumber(result.pt1);
      master.event.action = "Touchdown: " + td + " Extra-Punkt: " + pat;
      break;
    case "Manuell":
      result = handlePoints(
        $("input[name='manualPointsGroup']:checked").val(),
        $("#manualNumber").val()
      );
      let manual;
      if (getNumber(result.td) != "") {
        manual = getNumber(result.td);
      } else {
        manual =
          getNumber(result.pt1) == ""
            ? getNumber(result.pt2)
            : getNumber(result.pt1);
      }
      master.event.action = "Andere Punkte: " + manual;
      break;
    default:
      console.log("irgendwas anderes");
  }
  switch ($("input[name='teamname']:checked").attr("id")) {
    case "homeTeam":
      master.scoreHome = master.scoreHome + result.score;
      master.event.title = master.home;
      addEntryToLog(homeLog, result);
      break;
    default:
      master.event.title = master.away;
      master.scoreAway = master.scoreAway + result.score;
      addEntryToLog(awayLog, result);
  }

  Server.saveScore(master);

  updateScore();
  //scoreEntryCleanup
  $("#tdNumber").val("");
  $("#patNumber").val("");
  $("#manualNumber").val("");
  $("input[name='teamname']:checked").prop("checked", false);
  $("#tdBtn").click();

  $("#pat1").prop("checked", true);
  $("[name=manualPointsGroup][value=2]").prop("checked", true);

  $("#scoreEntry").hide();
  document.body.scrollIntoView();
}

function summarize() {
  $("#refInfo").hide();
  var endDate = new Date();
  let minutes = (endDate.getMinutes() < 10 ? "0" : "") + endDate.getMinutes();
  var endTime = endDate.getHours() + ":" + minutes;
  $("#endDate").append(endTime);
  master.eTime = endTime;

  initFinalize();
}

function updateScore() {
  $("#scoreHome").text(master.scoreHome);
  $("#scoreAway").text(master.scoreAway);
}

function addEntryToLog(table, result) {
  let pat2 = getNumber(result.pt2);
  let pat1 = getNumber(result.pt1);
  let td = getNumber(result.td);
  let newEntry =
    "<tr>" +
    '<td style="font-size: smaller;">' +
    master.counter +
    ":</td>" +
    "<td>" +
    td +
    "</td>" +
    "<td>" +
    pat2 +
    "</td>" +
    "<td>" +
    pat1 +
    "</td>" +
    "</tr>";
  table.after(newEntry);
}

function saveTouchdownDrive(result) {
  console.log(result);
}

function handlePoints(point, number) {
  let pt = parseInt(point);
  let score = pt;
  if (pt > 0 && number == "" && !point.startsWith("+")) {
    // PAT ist nicht gut
    score = 0;
  }
  switch (Math.abs(pt)) {
    case 6:
      return { score: score, td: getNumberString(number, point) };
    case 1:
      return getResultObject(score, getNumberString(number, point), "");
    case 2:
      return getResultObject(score, "", getNumberString(number, point));
  }
}

function getNumberString(number, pt) {
  return number == "" ? pt + "#-" : pt + "#" + number;
}

function getResultObject(point, number1, number2) {
  return { score: point, pt1: number1, pt2: number2 };
}

function getNumber(number) {
  if (number === undefined) return "";
  let splitter = number.split("#");
  if (splitter[0].startsWith("+") || splitter[0] < 0) {
    if (splitter[1] == "-") {
      return splitter[0];
    } else {
      return splitter[0] + " (#" + splitter[1] + ")";
    }
  } else if (splitter[0] > 0) {
    if (splitter[1] == "-") {
      return "-";
    } else {
      return "#" + splitter[1];
    }
  }
  return "";
}