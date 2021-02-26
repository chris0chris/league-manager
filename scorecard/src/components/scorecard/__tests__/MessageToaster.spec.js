/* eslint-disable max-len */
import React from 'react';
import {render, screen} from '@testing-library/react';
import {GAME_LOG_COMPLETE_GAME} from '../../../__tests__/testdata/gameLogData';
import MessageToaster from '../MessageToaster';
import {testStore} from '../../../__tests__/Utils';

const setup = (status = 200) => {
  const initialState = {
    messageReducer: {
      msg: {},
      status: status,
    },
  };
  const store = testStore(initialState);
  render(<MessageToaster store={store} />);
};

describe('MessageToaster component', () => {
  it('should render correct', () => {
    setup();
    expect(screen.getByText('Eintrag gespeichert')).toBeInTheDocument();
  });
});
