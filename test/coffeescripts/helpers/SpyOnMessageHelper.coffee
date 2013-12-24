beforeEach ->
  @spyOnMessage = (message) ->
    spy = @spy()
    Rally.environment.getMessageBus().subscribe(message, spy)
    spy

  @spyOnEvent = (observable, event, opts = {}) ->
    spy = @spy()
    observable.on event, spy, opts
    spy