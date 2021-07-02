/* eslint-disable max-len */
import React, {useState} from 'react';
import PropTypes from 'prop-types';

const Safety = (props) => {
  const {update} = props;
  const [pointsInput, setPointsInput] = useState('');
  const [pointsRadio, setPointsRadio] = useState('Safety (+2)');
  const [twoPointsSelected, setTwoPointsSelected] = useState(true);

  update({
    event: [{name: pointsRadio, player: pointsInput}],
  }, true);

  return (
    <>
      <div className='row mt-2'>
        <div className='col text-muted text-center'>
          (Punkte bekommt gegnerisches Team)
        </div>
      </div>
      <div className='row' role='toolbar' aria-label='pointsbar'>
        <div className='col-9'>
          <div className='input-group'>
            <div className='input-group-text' id='btnGroupAddon'>
              #
            </div>
            <input
              type='number'
              className='form-control'
              placeholder='Trikotnummer'
              aria-label='number'
              aria-describedby='btnGroupAddon'
              onChange={(ev) => setPointsInput(ev.target.value)}
              required
              value={pointsInput}
            />
          </div>
        </div>
        <div className='col-3 d-grid'>
          <div className='btn-group' role='group' aria-label='points group'>
            <input
              type='radio'
              id='point1'
              name='Safety'
              className='btn-check'
              onChange={(ev) => {
                setPointsRadio(ev.target.value);
                setTwoPointsSelected(!twoPointsSelected);
              }}
              defaultValue='Safety (+1)'
              checked={!twoPointsSelected}
            />
            <label className='btn btn-outline-warning' htmlFor='point1'>
              1
            </label>
            <input
              type='radio'
              id='point2'
              name='Safety'
              className='btn-check'
              defaultValue='Safety (+2)'
              checked={twoPointsSelected}
              onChange={(ev) => {
                setPointsRadio(ev.target.value);
                setTwoPointsSelected(!twoPointsSelected);
              }}
            />
            <label className='btn btn-outline-warning' htmlFor='point2'>
              2
            </label>
          </div>
        </div>
      </div>
    </>
  );
};

Safety.propTypes = {
  update: PropTypes.func.isRequired,
};

export default Safety;
