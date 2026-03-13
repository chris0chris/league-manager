import React from 'react';
import {render, screen} from '@testing-library/react';
import TeamBox from '../TeamBox';


const setup = (imageUrl = null) => {
  render(<TeamBox img={imageUrl} name='teamName' />);
};

describe('TeamBox component', () => {
  it('should render correct with image', () => {
    setup('/path/to/image/url.png');
    expect(screen.getByRole('img')).toBeInTheDocument();
    expect(screen.getByText('teamName')).toBeInTheDocument();
  });
  it('should render correct without image', () => {
    setup();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('teamName')).toBeInTheDocument();
  });
});
