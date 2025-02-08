import 'regenerator-runtime/runtime';
import '@testing-library/jest-dom';
// fix error for jquery - ReferenceError: define is not defined
import $ from 'jquery/src/jquery';

// fix for TextEncoder not found in tests https://github.com/inrupt/solid-client-authn-js/issues/1676#issuecomment-1413620713
import { TextEncoder } from 'util';

global.TextEncoder = TextEncoder;

const modalMock = jest.fn();

jest.mock('jquery/src/jquery', () => jest.fn());
$.mockImplementation(() => {
  return { modal: modalMock };
});

