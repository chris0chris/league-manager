import 'regenerator-runtime/runtime';
import '@testing-library/jest-dom';
import $ from 'jquery/src/jquery';
const modalMock = jest.fn();
jest.mock('jquery/src/jquery', () => jest.fn());
$.mockImplementation(() => {
  return {modal: modalMock};
});
