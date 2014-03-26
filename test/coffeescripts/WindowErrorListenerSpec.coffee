describe 'RallyMetrics.WindowErrorListener', ->
  helpers
    createListener: (supportsOnError) ->
      new RallyMetrics.WindowErrorListener(@aggregator, supportsOnError)

  beforeEach ->
    @originalOnError = window.onerror
    window.onerror = null
    @aggregator =
      recordError: @stub()

  afterEach ->
    window.onerror = @originalOnError

  it 'should record the error message, file and line number', ->
    @createListener()

    message = 'uhoh'
    file = 'someCode.js'
    lineNum = 22

    window.onerror(message, file, lineNum)

    expect(@aggregator.recordError).to.have.been.calledWith "#{message}, #{file}:#{lineNum}"

  it 'should gracefully deal with no error message, file and line number', ->
    @createListener()

    window.onerror(undefined, undefined, undefined)

    errorInfo = @aggregator.recordError.args[0][0]
    expect(errorInfo).not.to.have.string('undefined')
    expect(errorInfo).to.have.string('?')

  it 'should not hook into onerror if not supported', ->
    dummyOnError = @spy()

    window.onerror = dummyOnError

    @createListener(false)
    expect(window.onerror).to.equal dummyOnError

  it 'should maintain the existing window.onerror', ->
    existingOnError = @spy()
    window.onerror = existingOnError

    @createListener()
    window.onerror('uhoh', 'foo.js', 12)

    expect(@aggregator.recordError).to.have.been.calledWith('uhoh, foo.js:12')
    expect(existingOnError).to.have.been.calledWith('uhoh', 'foo.js', 12)
