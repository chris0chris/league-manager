import React from 'react';
import {render, screen} from '@testing-library/react';
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
  it('should render for error status', () => {
    setup(400);
    expect(screen.getByText('Fehler')).toBeInTheDocument();
  });
});
