function testdata2gamedays() {
  return [
    {
      author: 2,
      date: "2020-07-21",
      format: "62",
      id: 0,
      name: "Test Gameday 0",
      start: "10:00",
    },
    {
      author: 2,
      date: "2020-07-21",
      format: "62",
      id: 1,
      name: "Test Gameday 1",
      start: "10:00",
    },
  ];
}

function testdata1gameday() {
  return [
    {
      author: 2,
      date: "2020-07-21",
      format: "62",
      id: 0,
      name: "Test Gameday 0",
      start: "10:00",
    },
  ];
}

function testdata3games() {
  return [
    {
      away: "Nieder",
      field: 1,
      gameFinished: "",
      gameHalftime: "",
      gameStarted: "11:00:00",
      gameday_id: 1,
      gameinfo_id: 52,
      home: "Iser",
      id: 1,
      id_away: 62,
      id_home: 61,
      officials: "OFFICIAL-TEAM 1",
      pin: 1,
      points_away: 25,
      points_home: 6,
      scheduled: "10:00:00",
      stage: "Vorrunde",
      standing: "Gruppe 1",
      status: "gestartet",
    },
    {
      away: "Iser",
      field: 1,
      gameFinished: "",
      gameHalftime: "",
      gameStarted: "",
      gameday_id: 1,
      gameinfo_id: 53,
      home: "Wesel",
      id: 2,
      id_away: 64,
      id_home: 63,
      officials: "OFFICIAL-TEAM 2",
      pin: "",
      points_away: 52,
      points_home: 25,
      scheduled: "11:10:00",
      stage: "Vorrunde",
      standing: "Gruppe 1",
      status: "",
    },
    {
      away: "Wesel",
      field: 1,
      gameFinished: "",
      gameHalftime: "",
      gameStarted: "",
      gameday_id: 1,
      gameinfo_id: 54,
      home: "Nieder",
      id: 54,
      id_away: 66,
      id_home: 65,
      officials: "Dort",
      pin: "",
      points_away: 6,
      points_home: 48,
      scheduled: "12:20:00",
      stage: "Vorrunde",
      standing: "Gruppe 1",
      status: "",
    },
  ];
}
