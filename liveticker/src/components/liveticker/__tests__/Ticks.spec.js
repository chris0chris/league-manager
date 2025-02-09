import React from 'react';
import {render, screen} from '@testing-library/react';
import Ticks from '../Ticks';
import {LIVETICKER_DATA} from '../../../__tests__/testdata/livetickerData';


const setup = () => {
  const ticks = LIVETICKER_DATA[0].ticks;
  render(<Ticks entries={ticks} gameStatus={LIVETICKER_DATA[0].status}/>);
};

describe('Ticks component', () => {
  it('should render correct', () => {
    setup();
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByText('Turnover')).toBeInTheDocument();
    expect(screen.getByText(new RegExp('12:05'))).toBeInTheDocument();
  });
});
