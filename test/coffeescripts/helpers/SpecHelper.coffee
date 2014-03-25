# chai.use(sinonChai)
window.expect = chai.expect

# Applies a config object to a spec.
# Must be called before any 'beforeEach' functions
# where config attributes are used.
window.helpers = (config) ->
  beforeEach ->
    _.extend this, config

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
  return if spec.__sandbox__
  config = sinon.getConfig(sinon.config)
  config.injectInto = config.injectIntoThis && spec || config.injectInto
  spec.__sandbox__ = sinon.sandbox.create(config)

sinonSandboxTearDown = (spec) ->
  spec.__sandbox__.verifyAndRestore()
  delete spec.__sandbox__

beforeEach ->
  document.title = this.test.ctx.currentTest.fullTitle()
  sinonSandboxSetUp(this)

afterEach ->
  sinonSandboxTearDown(this)
