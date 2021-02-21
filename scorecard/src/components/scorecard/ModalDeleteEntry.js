import React from 'react';
import PropTypes from 'prop-types';
import {FaTimes, FaTrash} from 'react-icons/fa';
import {connect} from 'react-redux';
import {deleteLogEntry} from '../../actions/games';
import $ from 'jquery/src/jquery';

const ModalDeleteEntry = (props) => {
  const handleSubmit = (ev) => {
    ev.preventDefault();
    // eslint-disable-next-line no-unused-vars
    const {__html, ...entryToDelete} = props.deleteEntry;
    $('#modalDeleteEntry').modal('hide');
    props.deleteLogEntry(props.gameLog.gameId, entryToDelete);
  };
  return (
    <div>
      <div className="modal fade"
        id='modalDeleteEntry'
        data-bs-keyboard="false"
        tabIndex="-1">
        <div className="modal-dialog">
          <form className="modal-content" onSubmit={(ev) => handleSubmit(ev)}>
            <div className="modal-header">
              <h5 className="modal-title">Eintrag löschen?</h5>
            </div>
            <div className="modal-body">
              <table className='table table-sm table-striped text-center'>
                <thead>
                  <tr>
                    <th>Pkt:</th>
                    <th>6</th>
                    <th>2</th>
                    <th>1</th>
                  </tr>
                </thead>
                <tbody>
                  <tr dangerouslySetInnerHTML={props.deleteEntry} />
                </tbody>
              </table>
            </div>

            <div className="modal-footer row">
              <div className="col d-grid">
                <button type="button"
                  onClick={()=> {}}
                  className="btn btn-dark"
                  data-bs-dismiss="modal">
                  Abbrechen
                  <FaTimes className="ms-3" />
                </button>
              </div>
              <div className="col d-grid">
                <button type="submit"
                  className="btn btn-danger">
                  Löschen
                  <FaTrash className="ms-3" />
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

ModalDeleteEntry.propTypes = {
  gameLog: PropTypes.object.isRequired,
  deleteEntry: PropTypes.object.isRequired,
  deleteLogEntry: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  deleteEntry: state.gamesReducer.deleteEntry,
  gameLog: state.gamesReducer.gameLog,
});

export default connect(mapStateToProps, {deleteLogEntry})(ModalDeleteEntry);
