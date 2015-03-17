describe 'RallyMetrics.WindowErrorListener', ->
  helpers
    createListener: (supportsOnError, config) ->
      new RallyMetrics.WindowErrorListener(@aggregator, supportsOnError, config)

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

  it 'should pass column number and stack trace if available', ->
    @createListener()

    columnNum = 13
    window.onerror('message', 'file.js', 22, columnNum)
    expect(@aggregator.recordError.getCall(0).args[1]).to.deep.equal {columnNumber: columnNum}

    stack = 'stack trace'
    window.onerror('message', 'file.js', 22, columnNum, stack: stack)
    expect(@aggregator.recordError.getCall(1).args[1]).to.deep.equal {columnNumber: columnNum, stack: stack}

  it 'should not trim stack by default', ->
    @createListener()
    stack = _.map(_.range(1000), -> 'this is a very long stack trace that should be preserved').join('\n')
    window.onerror('message', 'file.js', 22, 13, stack: stack)
    expect(@aggregator.recordError.getCall(0).args[1].stack).to.equal stack

  it 'should trim stack if configured', ->
    stackLimit = 10
    @createListener(true, stackLimit: stackLimit)
    stack = _.map(_.range(1000), -> 'this is a very long stack trace that should be preserved').join('\n')
    window.onerror('message', 'file.js', 22, 13, stack: stack)
    expect(@aggregator.recordError.getCall(0).args[1].stack).to.equal _.take(stack.split('\n'), stackLimit).join('\n')

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