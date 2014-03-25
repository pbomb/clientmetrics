beforeEach ->
  _.each
    toStartWith: (text) ->
      notText = if @isNot then " not" else ""
      @message = ->
        "Expected #{@actual} to#{notText} start with #{text}"
      @actual.indexOf(text) == 0 
      
    toEndWith: (text) ->
      notText = if @isNot then " not" else ""
      @message = ->
        "Expected #{@actual} to#{notText} end with #{text}"
      @actual.indexOf(text, @actual.length - text.length) != -1
  , (fn, name) ->
    chai.Assertion.addMethod name, fn