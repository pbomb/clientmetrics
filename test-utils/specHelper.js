import sinon from 'sinon';
import sinonMatchers from './sinonMatchers';

expect.extend(sinonMatchers);

let sandbox = null;

const sinonSandboxSetUp = (spec) => {
  sandbox = sinon.sandbox.create({
    useFakeServer: false,
    useFakeTimers: false
  });
};

const sinonSandboxTearDown = (spec) => {
  sandbox.restore();
  sandbox = null;
};

export const stub = (...args) => {
  if (args.length === 0) {
    return sinon.stub();
  }
  if (!sandbox) {
    throw TypeError('Cannot call stub function of sinonSandbox outside of an individual test');
  }
  return sandbox.stub(...args);
};

export const useFakeTimers = () => sandbox.useFakeTimers();
export const useFakeXMLHttpRequest = () => sandbox.useFakeXMLHttpRequest();

beforeEach(function() {
  return sinonSandboxSetUp(this);
});

afterEach(function() {
  return sinonSandboxTearDown(this);
});
