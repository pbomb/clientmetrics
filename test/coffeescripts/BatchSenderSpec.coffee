RallyMetrics.BatchSender.setClientMetricsUrl 'totallyfakeurl'

describe "RallyMetrics.BatchSender", ->
  helpers
    createSender: (config={}) ->
      new RallyMetrics.BatchSender(config)
      
    getData: (count) ->
      ({foo: i} for i in [0...count])
  
  describe 'config options', ->
    describe 'keysToIgnore', ->
      it "should strip out all keys in keysToIgnore", ->
        aKeyToIgnore = "testKey"
        anotherKeyToIgnore = "theOtherKey"

        sender = @createSender keysToIgnore: [aKeyToIgnore, anotherKeyToIgnore]

        data = foo: "bar"
        data[aKeyToIgnore] = "should ignore this one"
        data[anotherKeyToIgnore] = "this one too"
  
        sender.send [data]
  
        expect(data['foo.0']).toEqual "bar"
        expect(data).not.toHaveOwnProperty("#{aKeyToIgnore}.0")
        expect(data).not.toHaveOwnProperty("#{anotherKeyToIgnore}.0")

  describe '#send', ->
    it "should append indices to the keys so they don't get clobbered", ->
      data = @getData(10)
      @createSender().send data

      for d, i in data
        expect(d).toHaveOwnProperty("foo.#{i}")

    it "should not send a batch if the url length is shorter than the configured min length", ->
      sender = @createSender
        minLength: 1000
  
      requestSpy = @spy(sender, "_makeGetRequest")
      data = @getData(2)

      sender.send data
      expect(sender.getPendingEvents()).toEqual data
  
    it "should not send a batch that contains one event that is too big", ->
      sender = @createSender
        minLength: 0
        maxLength: 100

      longValue = ''
      for i in [0..120]
        longValue += 'a'

      data = [foo: longValue]

      sender.send data

      expect(sender.getPendingEvents()).toEqual data
      
    it "should send to the configured url", ->
      @spy document.body, 'appendChild'
      clientMetricsUrl = "http://localhost/testing"
      RallyMetrics.BatchSender.setClientMetricsUrl clientMetricsUrl
      
      sender = @createSender()
      data = @getData(2)

      sender.send data
  
      img = document.body.appendChild.args[0][0]
      expect(img.src).toBe "#{clientMetricsUrl}?foo.0=0&foo.1=1"
      