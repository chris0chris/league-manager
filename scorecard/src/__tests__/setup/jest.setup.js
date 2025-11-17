// Vitest setup file
import '@testing-library/jest-dom';
import { vi } from 'vitest';
// fix error for jquery - ReferenceError: define is not defined
import $ from 'jquery/src/jquery';

// fix for TextEncoder not found in tests https://github.com/inrupt/solid-client-authn-js/issues/1676#issuecomment-1413620713
import { TextEncoder } from 'util';

global.TextEncoder = TextEncoder;

const modalMock = vi.fn();

vi.mock('jquery/src/jquery', () => ({ default: vi.fn() }));
$.mockImplementation(() => {
  return { modal: modalMock };
});

