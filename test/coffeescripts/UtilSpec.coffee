describe 'RallyMetrics.Util', ->

  describe '#addEventHandler', ->
    describe 'with addEventListener', ->
      beforeEach ->
        @target =
          addEventListener: @stub()

      it 'should call addEventListener', ->
        callback = ->
        RallyMetrics.Util.addEventHandler @target, 'foo', callback, false
        expect(@target.addEventListener).toHaveBeenCalledWith 'foo', callback, false

    describe 'with attachEvent', ->
      beforeEach ->
        @target = 
          attachEvent: @stub()

      it 'should call attachEvent', ->
        callback = ->
        RallyMetrics.Util.addEventHandler @target, 'foo', callback, false
        expect(@target.attachEvent).toHaveBeenCalledWith 'onfoo', callback      

  describe '#removeEventHandler', ->
    describe 'with removeEventListener', ->
      beforeEach ->
        @target =
          removeEventListener: @stub()

      it 'should call removeEventListener', ->
        callback = ->
        RallyMetrics.Util.removeEventHandler @target, 'foo', callback
        expect(@target.removeEventListener).toHaveBeenCalledWith 'foo', callback

    describe 'with detachEvent', ->
      beforeEach ->
        @target = 
          detachEvent: @stub()

      it 'should call detachEvent', ->
        callback = ->
        RallyMetrics.Util.removeEventHandler @target, 'foo', callback
        expect(@target.detachEvent).toHaveBeenCalledWith 'onfoo', callback      

  describe '#removeFromDom', ->
    describe 'when element has remove()', ->
      beforeEach ->
        @element =
          remove: @stub()

      it 'should call remove()', ->
        RallyMetrics.Util.removeFromDom(@element)
        expect(@element.remove).toHaveBeenCalled()

    describe 'when element does not have remove()', ->
      beforeEach ->
        @element =
          parentNode:
            removeChild: @stub()

      it 'should remove via the parent', ->
        RallyMetrics.Util.removeFromDom(@element)
        expect(@element.parentNode.removeChild).toHaveBeenCalledWith @element
