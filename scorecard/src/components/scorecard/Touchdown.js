import React, {useEffect, useState} from 'react';
import PropTypes from 'prop-types';

// eslint-disable-next-line max-len
const Touchdown = ( {resetRequested, setResetRequested, update}) => {
  const [tdInput, setTdInput] = useState('');
  const [patInput, setPatInput] = useState('');
  const [patRadio, setPatRadio] = useState('pat1');
  const [pat1Selected, setPat1Selected] = useState(true);
  useEffect(() => {
    if (resetRequested) {
      setTdInput('');
      setPatInput('');
      setPatRadio('pat1');
      setPat1Selected(true);
      setResetRequested(false);
    }
  }, [resetRequested]);

  update({'td': tdInput, [patRadio]: patInput});

  return (
    <><div className="input-group mt-2">
      <div className="input-group-text" id="btnGroupAddon">#TD&nbsp;</div>
      <input type="number"
        className="form-control" placeholder="Trikotnummer TD"
        aria-label="touchdown number" aria-describedby="btnGroupAddon"
        onChange={(ev) => setTdInput(ev.target.value)} required
        value={tdInput} />
    </div>
    <div className="row mt-1" role="toolbar" aria-label="PATbar">
      <div className="col-9">
        <div className="input-group">
          <div className="input-group-text" id="btnGroupAddon">#PAT</div>
          <input type="number"
            className="form-control" placeholder="Trikotnummer PAT"
            aria-label="PAT number" aria-describedby="btnGroupAddon"
            onChange={(ev) => setPatInput(ev.target.value)}
            value={patInput} />
        </div>
      </div>
      <div className="col-3 d-grid">
        <div className="btn-group" role="group" aria-label="PAT group">
          <input type="radio" id='pat1' name="pat" className="btn-check"
            onChange={(ev) => {
              setPatRadio(ev.target.value); setPat1Selected(!pat1Selected);
            }}
            defaultValue='pat1' checked={pat1Selected} />
          <label className="btn btn-outline-warning" htmlFor='pat1'>1</label>
          <input type="radio" id='pat2' name="pat"
            className="btn-check" defaultValue='pat2' checked={!pat1Selected}
            onChange={(ev) => {
              setPatRadio(ev.target.value); setPat1Selected(!pat1Selected);
            }}/>
          <label className="btn btn-outline-warning" htmlFor='pat2'>2</label>
        </div>
      </div>
    </div>
    </>
  );
};

Touchdown.propTypes = {
  update: PropTypes.func.isRequired,
  resetRequested: PropTypes.bool.isRequired,
  setResetRequested: PropTypes.func.isRequired,
};

export default Touchdown;
