describe "RallyMetrics.BatchSender", ->
  helpers
    createSender: (config={}) ->
      new RallyMetrics.BatchSender _.defaults(config, beaconUrl: 'totallyfakeurl', minLength: 0)
      
    getData: (count) ->
      ({foo: i} for i in [0...count])

  beforeEach ->
    @spy document.body, 'appendChild'
  
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
  
        img = document.body.appendChild.args[0][0]
        expect(img.src).toContain "foo.0=bar"
        expect(img.src).not.toContain "#{aKeyToIgnore}.0"
        expect(img.src).not.toContain "#{anotherKeyToIgnore}.0"

  describe '#send', ->
    it "should append indices to the keys so they don't get clobbered", ->
      data = @getData(10)
      @createSender().send data

      img = document.body.appendChild.args[0][0]
      for d, i in data
        expect(img.src).toContain "foo.#{i}=#{i}"

    it "should not send a batch if the url length is shorter than the configured min length", ->
      sender = @createSender
        minLength: 1000
  
      data = @getData(2)

      sender.send data
      expect(sender.getPendingEvents()).toEqual data
      expect(document.body.appendChild).not.toHaveBeenCalled()
  
    it "should not send a batch that contains one event that is too big", ->
      sender = @createSender
        minLength: 0
        maxLength: 100

      longValue = ''
      for i in [0..101]
        longValue += 'a'

      data = [foo: longValue]

      sender.send data

      expect(sender.getPendingEvents()).toEqual data
      expect(document.body.appendChild).not.toHaveBeenCalled()
      
    it "should send to the configured url", ->
      clientMetricsUrl = "http://localhost/testing"
      
      sender = @createSender(beaconUrl: clientMetricsUrl)
      data = @getData(2)

      sender.send data
  
      img = document.body.appendChild.args[0][0]
      expect(img.src).toBe "#{clientMetricsUrl}?foo.0=0&foo.1=1"
      