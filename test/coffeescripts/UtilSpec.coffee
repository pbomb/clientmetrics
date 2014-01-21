describe 'RallyMetrics.Util', ->

  describe 'with addEventListener', ->
    beforeEach ->
      @target = {}
      @target.addEventListener = @stub()

    it 'should call addEventListener', ->
      callback = ->
      RallyMetrics.Util.addEvent @target, 'foo', callback, false
      expect(@target.addEventListener).toHaveBeenCalledWith 'foo', callback, false

  describe 'with attachEvent', ->
    beforeEach ->
      @target = {}
      @target.attachEvent = @stub()

    it 'should call attachEvent', ->
      callback = ->
      RallyMetrics.Util.addEvent @target, 'foo', callback, false
      expect(@target.attachEvent).toHaveBeenCalledWith 'onfoo', callback      