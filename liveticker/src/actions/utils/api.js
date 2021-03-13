import axios from 'axios';

export const apiGet = (url, successType) => async (dispatch, getState) => {
  await axios
      .get(url)
      .then((res) => {
        dispatch({
          type: successType,
          payload: res.data,
        });
      })
      .catch((err) =>
        console.error('ups ...', err),
      // ToDo DeleteMe
      dispatch({
        type: successType,
        payload: [
          {
            status: '1. Halbzeit',
            time: '11:30',
            home: {
              name: 'Baltic Blue Stars Rostock',
              score: '12',
            },
            away: {
              name: 'Munich Mules',
              score: '0',
            },
            ticks: [
              {text: 'Turnover', isHome: true, time: '12:05'},
              {text: 'Touchdown: #19 Extra-Punkt: #7', isHome: true, time: '12:10'},
              {text: 'Auszeit - 12:00', isHome: false, time: '12:12'},
              {text: 'Safety: #12', isHome: true, time: '13:10'},
              {text: 'Touchdown: #7 Extra-Punkt: -', isHome: false, time: '13:20'},
            ],
          },
          {
            status: '2. Halbzeit',
            time: '11:30',
            home: {
              name: 'Munich Mules',
              img: 'https://dffl.flag-coaching.info/dffl/wp-content/uploads/2018/03/Logo-Munich-Mules.png',
              score: '0',
            },
            away: {
              name: 'Team Deutschland',
              img: 'https://dffl.flag-coaching.info/dffl/wp-content/uploads/2018/02/TD-FlagFootball-Logo-Kopie.png',
              score: '12',
            },
            ticks: [
              {text: 'Turnover [12:00]', isHome: false, time: '13:00'},
              {text: '[12:05] Touchdown: #19 Extra-Punkt: #7', isHome: true, time: '13:05'},
              {text: '[12:12] Auszeit - 12:00', isHome: true, time: '13:30'},
              {text: '[12:59] Safety: #12', isHome: true, time: '13:31'},
              {text: 'Extra-Punkt: - Touchdown: #7 [13:10]', isHome: false, time: '13:59'},
            ],
          },
        ],
      }),
      );
};
