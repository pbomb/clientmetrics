describe 'RallyMetrics.Util', ->

  describe '#addEventHandler', ->
    describe 'with addEventListener', ->
      beforeEach ->
        @target =
          addEventListener: @stub()

      it 'should call addEventListener', ->
        callback = ->
        RallyMetrics.Util.addEventHandler @target, 'foo', callback, false
        expect(@target.addEventListener).to.have.been.calledWith 'foo', callback, false

    describe 'with attachEvent', ->
      beforeEach ->
        @target = 
          attachEvent: @stub()

      it 'should call attachEvent', ->
        callback = ->
        RallyMetrics.Util.addEventHandler @target, 'foo', callback, false
        expect(@target.attachEvent).to.have.been.calledWith 'onfoo', callback      

  describe '#removeEventHandler', ->
    describe 'with removeEventListener', ->
      beforeEach ->
        @target =
          removeEventListener: @stub()

      it 'should call removeEventListener', ->
        callback = ->
        RallyMetrics.Util.removeEventHandler @target, 'foo', callback
        expect(@target.removeEventListener).to.have.been.calledWith 'foo', callback

    describe 'with detachEvent', ->
      beforeEach ->
        @target = 
          detachEvent: @stub()

      it 'should call detachEvent', ->
        callback = ->
        RallyMetrics.Util.removeEventHandler @target, 'foo', callback
        expect(@target.detachEvent).to.have.been.calledWith 'onfoo', callback      

  describe '#removeFromDom', ->
    describe 'when element has remove()', ->
      beforeEach ->
        @element =
          remove: @stub()

      it 'should call remove()', ->
        RallyMetrics.Util.removeFromDom(@element)
        expect(@element.remove).to.have.been.called

    describe 'when element does not have remove()', ->
      beforeEach ->
        @element =
          parentNode:
            removeChild: @stub()

      it 'should remove via the parent', ->
        RallyMetrics.Util.removeFromDom(@element)
        expect(@element.parentNode.removeChild).to.have.been.calledWith @element
