window.expect = chai.expect;

export const once = (opts) => {
  if (opts.timeout == null) {
    opts.timeout = 3000;
  }
  if (opts.condition == null) {
    throw new Error('Condition attribute not specified');
  }
  const deferred = window.when.defer();
  const now = Date.now();
  const pollFn = () => {
    if (Date.now() - now > 3000) {
      deferred.reject("Timeout waiting for promise to resolve. " + opts.description || "");
      return true;
    }
    if (opts.condition()) {
      deferred.resolve();
      return true;
    } else {
      return false;
    }
  };
  window.when.poll(pollFn, 10);
  return deferred.promise;
};

const sinonSandboxSetUp = (spec) => {
  if (spec.__sandbox__) {
    return;
  }
  const config = sinon.getConfig(sinon.config);
  config.injectInto = config.injectIntoThis && spec || config.injectInto;
  config.useFakeTimers = false;
  spec.__sandbox__ = sinon.sandbox.create(config);
};

const sinonSandboxTearDown = (spec) => {
  spec.__sandbox__.verifyAndRestore();
  return delete spec.__sandbox__;
};

beforeEach(function() {
  return sinonSandboxSetUp(this);
});

afterEach(function() {
  return sinonSandboxTearDown(this);
});
