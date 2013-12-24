(function() {
  var finishOnPromise, jasmineAsyncFunctionUsageErrorMsg, sinonSandboxSetUp, sinonSandboxTearDown, wrappedIt, __jasmineRuns__, __jasmineWaitsFor__, __jasmineWaits__;

  __jasmineWaitsFor__ = this.waitsFor;

  __jasmineWaits__ = this.waits;

  __jasmineRuns__ = this.runs;

  beforeEach(function() {
    var callback, resultSummaryHidden;
    document.title = jasmine.getEnv().currentSpec.getFullName();
    callback = sinon.stub();
    if (!resultSummaryHidden) {
      resultSummaryHidden = true;
      document.getElementsByClassName('summary')[0].style.display = 'none';
    }
    sinonSandboxSetUp(this);
    this.__windowKeys = _.keys(window);
    return this.__beforeKeys = _.keys(this);
  });

  afterEach(function() {
    var _this = this;
    window.onbeforeunload = null;
    try {

    } finally {
      _.each(_.difference(_.keys(window), this.__windowKeys), function(key) {
        return delete window[key];
      });
      _.each(_.difference(_.keys(this), this.__beforeKeys), function(key) {
        return delete _this[key];
      });
      delete this.__beforeKeys;
      sinonSandboxTearDown(this);
    }
  });

  jasmineAsyncFunctionUsageErrorMsg = "Do not use jasmine async functions (waits, waitsFor, runs).\nHave your 'it' test function take the parameter 'finish' and call it when you async test is finished.\nUse the 'once' function and deferreds/promises to wait on conditions.";

  this.waitsFor = function() {
    throw Error(jasmineAsyncFunctionUsageErrorMsg);
  };

  this.waits = function() {
    throw Error(jasmineAsyncFunctionUsageErrorMsg);
  };

  this.runs = function() {
    throw Error(jasmineAsyncFunctionUsageErrorMsg);
  };

  window.helpers = function(config) {
    return beforeEach(function() {
      return _.extend(this, config);
    });
  };

  wrappedIt = window.it;

  window.it = function(description, test) {
    return wrappedIt(description, function() {
      var callback, testResult;
      callback = this.stub();
      testResult = test.call(this);
      if ((testResult != null ? testResult.then : void 0) != null) {
        finishOnPromise.call(this, testResult, callback);
        return __jasmineWaitsFor__(function() {
          return callback.called;
        }, 'promise to resolve', 8000);
      }
    });
  };

  finishOnPromise = function(promise, callback) {
    var _this = this;
    return promise.then(function() {
      return typeof callback === "function" ? callback() : void 0;
    }, function(msg) {
      _this.fail(msg);
      return typeof callback === "function" ? callback() : void 0;
    });
  };

  window.once = function(opts) {
    var deferred, now, pollFn;
    if (opts.timeout == null) {
      opts.timeout = 3000;
    }
    if (opts.condition == null) {
      throw new Error('Condition attribute not specified');
    }
    deferred = window.when.defer();
    now = new Date().getTime();
    pollFn = function() {
      if (new Date().getTime() - now > 3000) {
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

  sinonSandboxSetUp = function(spec) {
    var config;
    config = sinon.getConfig(sinon.config);
    config.injectInto = config.injectIntoThis && spec || config.injectInto;
    return spec.__sandbox__ = sinon.sandbox.create(config);
  };

  sinonSandboxTearDown = function(spec) {
    return spec.__sandbox__.verifyAndRestore();
  };

}).call(this);
