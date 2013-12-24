notText = (matcher) -> if matcher.isNot then " not" else ""

beforeEach ->
  @addMatchers
    toHaveOwnProperty: (property) ->
      @message = ->
        ownProperties = _.keys(@actual)
        "Expected object#{notText(this)} to have own property \"#{property}\". Its properties are: #{ownProperties}"
      @actual.hasOwnProperty(property)

    toBeANumber: ->
      @message = -> "Expected object#{notText(this)} to be a number. It is actually #{typeof @actual}"
      _.isNumber(@actual)

    toBeAString: ->
      @message = -> "Expected object#{notText(this)} to be a string. It is actually #{typeof @actual}"
      _.isString(@actual)

    toBeAFunction: ->
      @message = -> "Expected object#{notText(this)} to be a function. It is actually #{typeof @actual}"
      _.isFunction(@actual)

    toBeWithin: (lower, upper) ->
      @message = -> "Expected #{@actual}#{notText(this)} to be within #{lower} and #{upper}"
      lower <= @actual && upper >= @actual
      