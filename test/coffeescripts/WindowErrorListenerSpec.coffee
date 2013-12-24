describe 'RallyMetrics.WindowErrorListener', ->
  helpers
    createListener: (supportsOnError) ->
      new RallyMetrics.WindowErrorListener(@aggregator, supportsOnError)

  beforeEach ->
    @originalOnError = window.onerror
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

    expect(@aggregator.recordError).toHaveBeenCalledWith "#{message}, #{file}:#{lineNum}"

  it 'should gracefully deal with no error message, file and line number', ->
    @createListener()

    window.onerror(undefined, undefined, undefined)

    errorInfo = @aggregator.recordError.args[0][0]
    expect(errorInfo).not.toContain('undefined')
    expect(errorInfo).toContain('?')

  it 'should not hook into onerror if not supported', ->
    dummyOnError = @spy()

    window.onerror = dummyOnError

    @createListener(false)
    expect(window.onerror).toBe dummyOnError

  it 'should maintain the existing window.onerror', ->
    existingOnError = @spy()
    window.onerror = existingOnError

    @createListener()
    window.onerror('uhoh', 'foo.js', 12)

    expect(@aggregator.recordError).toHaveBeenCalledWith('uhoh, foo.js:12')
    expect(existingOnError).toHaveBeenCalledWith('uhoh', 'foo.js', 12)
