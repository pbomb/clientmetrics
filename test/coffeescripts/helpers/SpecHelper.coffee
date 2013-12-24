# These jasmine async functions are kept around so that they can be used here, in the test framework code,
# to run properly in jasmine. Actual test code should not use these functions as we don't think they are
# the best way to write asynchronous tests.
__jasmineWaitsFor__ = @waitsFor
__jasmineWaits__ = @waits
__jasmineRuns__ = @runs

beforeEach ->
  document.title = jasmine.getEnv().currentSpec.getFullName()
  callback = sinon.stub()

  unless resultSummaryHidden
      resultSummaryHidden = true
      document.getElementsByClassName('summary')[0].style.display = 'none'

  # Rally.env.MockGlobal.setup this

  sinonSandboxSetUp this

  # Rally.state.SessionStorage.initialize(Math.random().toString(), true)

  @__windowKeys = _.keys(window)
  @__beforeKeys = _.keys(this)

  # @ajax = window.ajax = new Rally.mock.AjaxBuilder(new Rally.mock.AjaxInterceptor(this))

afterEach ->
  window.onbeforeunload = null
  try
    # Rally.environment.getMessageBus().clearListeners()
  finally
    _.each(_.difference(_.keys(window), @__windowKeys), (key) => delete window[key])
    _.each(_.difference(_.keys(this), @__beforeKeys), (key) => delete @[key])

    delete @__beforeKeys

    sinonSandboxTearDown this

jasmineAsyncFunctionUsageErrorMsg = """
  Do not use jasmine async functions (waits, waitsFor, runs).
  Have your 'it' test function take the parameter 'finish' and call it when you async test is finished.
  Use the 'once' function and deferreds/promises to wait on conditions.
"""
@waitsFor = -> throw Error(jasmineAsyncFunctionUsageErrorMsg)
@waits = -> throw Error(jasmineAsyncFunctionUsageErrorMsg)
@runs = -> throw Error(jasmineAsyncFunctionUsageErrorMsg)

# Applies a config object to a spec.
# Must be called before any 'beforeEach' functions
# where config attributes are used.
window.helpers = (config) ->
  beforeEach ->
    _.extend this, config

wrappedIt = window.it

window.it = (description, test) ->
  wrappedIt description, ->
    callback = @stub()
    testResult = test.call this

    if testResult?.then? # promise
      finishOnPromise.call this, testResult, callback
      __jasmineWaitsFor__ ->
        callback.called
      , 'promise to resolve', 8000

finishOnPromise = (promise, callback) ->
  promise.then =>
    callback?()
  , (msg) =>
    @fail msg
    callback?()

# resultSummaryHidden = false

window.once = (opts) ->
  unless opts.timeout?
    opts.timeout = 3000

  unless opts.condition?
    throw new Error('Condition attribute not specified')

  deferred = window.when.defer()

  now = new Date().getTime()

  pollFn = ->
    if (new Date().getTime() - now > 3000)
      deferred.reject("Timeout waiting for promise to resolve. " + opts.description || "")
      return true

    if opts.condition()
      deferred.resolve()
      true
    else
      false

  window.when.poll(pollFn, 10)

  deferred.promise

sinonSandboxSetUp = (spec) ->
  config = sinon.getConfig(sinon.config)
  config.injectInto = config.injectIntoThis && spec || config.injectInto
  spec.__sandbox__ = sinon.sandbox.create(config)

sinonSandboxTearDown = (spec) ->
  spec.__sandbox__.verifyAndRestore()
