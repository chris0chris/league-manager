import axios from 'axios';

export const apiGet = (url, successType) => async (dispatch) => {
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
      );
};
