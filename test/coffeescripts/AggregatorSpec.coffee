class Panel
  constructor: (@parent) ->
    @children = []
    @name = 'Panel'

  add: (config) ->
    child = new Panel(this)
    @children.push(child)
    child

  getComponentHierarchy: ->
    hierarchy = [this]
    cmp = this
    while cmp.parent
      cmp = cmp.parent
      hierarchy.push(cmp)

    hierarchy

describe "RallyMetrics.Aggregator", ->
  beforeEach ->
    @rallyRequestId = 123456
    
  helpers
    recordAction: (aggregator, cmp, description="an action") ->
      cmp ?= new Panel()
      aggregator.recordAction(component: cmp, description: description )
      return cmp
  
    beginLoad: (aggregator, cmp, description='an action', miscData={}) ->
      cmp ?= new Panel()
      aggregator.beginLoad(component: cmp, description: description, miscData: miscData )
      return cmp
  
    endLoad: (aggregator, cmp) ->
      cmp ?= new Panel()
      aggregator.endLoad(component: cmp)
      return cmp
  
    recordError: (aggregator, errorMessage='an error') ->
      aggregator.recordError(errorMessage)
      return errorMessage

    startSession: (aggregator, status="Navigation", defaultParams = {}) ->
      aggregator.startSession(status, defaultParams)
      return { status, defaultParams }
      
    createAggregator: (config={}) ->
      handler =
        getAppName: @stub().returns('testAppName')
        getComponentType: (cmp) ->
          if cmp.name then cmp.name else false
        getComponentHierarchy: (cmp) ->
          if _.isFunction(cmp.getComponentHierarchy) then cmp.getComponentHierarchy() else false

      aggregatorConfig = _.defaults config,
        sender: @createSender()
        handlers: [handler]
  
      new RallyMetrics.Aggregator(aggregatorConfig)

    createSender: ->
      @sentEvents = []

      send: (events) =>
        @sentEvents = @sentEvents.concat(events)
      getMaxLength: -> 2000
      flush: @stub()

    createAggregatorAndRecordAction: ->
      aggregator = @createAggregator()
      @recordAction(aggregator)
      aggregator

    findActionEvent: -> _.find(@sentEvents, eType: 'action')
    findLoadEvent: -> _.find(@sentEvents, eType: 'load')
    findDataEvent: -> _.find(@sentEvents, eType: 'dataRequest')

  describe 'flushInterval', ->
    afterEach ->
      @aggregator?.destroy()
      
    it 'should flush on the specified interval', ->
      @aggregator = @createAggregator
        flushInterval: 10

      start = new Date().getTime()

      once(
        condition: => @aggregator.sender.flush.callCount > 2
        description: 'waiting for flush to happen more than twice'
      ).then ->
        stop = new Date().getTime()
        expect(stop - start).toBeGreaterThan 20
      
  describe '#startSession', ->
    it "should start a new session", ->
      aggregator = @createAggregator()

      status = 'Navigation'
      defaultParams = foo: 'bar'
      
      @startSession aggregator, status, defaultParams

    it "should flush the sender", ->
      aggregator = @createAggregator()

      @startSession aggregator
      
      expect(aggregator.sender.flush).toHaveBeenCalledOnce()

    it "should conclude pending events", ->
      aggregator = @createAggregatorAndRecordAction()

      @sentEvents = []

      @beginLoad aggregator
      @beginLoad aggregator

      expect(aggregator.sender.send).not.toHaveBeenCalled()

      @startSession aggregator

      expect(@sentEvents.length).toBe 2
      for event in @sentEvents
        expect(event.status).toBe "Navigation"
  
    it "should append defaultParams to events", ->
      aggregator = @createAggregator()

      hash = "/some/hash"
      defaultParams = hash: hash
      
      aggregator.startSession "Session 1", defaultParams
      @recordAction(aggregator)
  
      actionEvent = @findActionEvent()
      expect(actionEvent.hash).toBe hash

  describe '#sendAllRemainingEvents', ->
    it 'should flush the sender', ->
      aggregator = @createAggregator()

      aggregator.sendAllRemainingEvents()

      expect(aggregator.sender.flush).toHaveBeenCalledOnce()

  describe 'data requests', ->
    beforeEach ->
      @xhrFake = sinon.useFakeXMLHttpRequest()

    afterEach ->
      @xhrFake.restore()

    it "should trim the request url correctly", ->
      aggregator = @createAggregatorAndRecordAction()
      
      expectedUrl = "3.14/Foo.js"
      entireUrl = "http://localhost/testing/webservice/#{expectedUrl}?bar=baz&boo=buzz"

      metricsData = aggregator.beginDataRequest this, entireUrl
      aggregator.endDataRequest this, @xhrFake, metricsData.requestId

      dataEvent = @findDataEvent()
      expect(dataEvent.url).toEqual expectedUrl
    
    it "should have the component hierarchy", ->
      aggregator = @createAggregatorAndRecordAction()
      requester = new Panel()

      metricsData = aggregator.beginDataRequest requester, "someUrl"
      aggregator.endDataRequest requester, @xhrFake, metricsData.requestId
      
      dataEvent = @findDataEvent()
      expect(dataEvent.cmpH).toEqual "Panel"
      
    it "returns ID properties for AJAX headers", ->
      aggregator = @createAggregatorAndRecordAction()
      requester = this

      metricsData = aggregator.beginDataRequest requester, "someUrl"
      aggregator.endDataRequest requester, @xhrFake, metricsData.requestId
      
      actionEvent = @findActionEvent()
      dataEvent = @findDataEvent()

      expect(metricsData.xhrHeaders).toEqual 'X-Parent-Id': dataEvent.eId, 'X-Trace-Id': actionEvent.eId
  
    it "does not return ID properties for AJAX headers when request is not instrumented", ->
      aggregator = @createAggregatorAndRecordAction()
      
      metricsData = aggregator.beginDataRequest null, "someUrl"
      
      expect(metricsData).toBeUndefined()
      
    it "appends the rallyRequestId onto dataRequest events", ->
      aggregator = @createAggregatorAndRecordAction()

      request = null

      @xhrFake.onCreate = (xhr) =>
        request = xhr
        xhr.setResponseHeaders
          RallyRequestID: @rallyRequestId
        xhr.setResponseBody 'textual healing'

      xhr = new XMLHttpRequest()
      
      
      metricsData = aggregator.beginDataRequest this, "someUrl"
      aggregator.endDataRequest this, request, metricsData.requestId

      dataEvent = @findDataEvent()
      expect(dataEvent.rallyRequestId).toEqual @rallyRequestId
    
  describe 'client metric event properties', ->
    beforeEach ->
      @appName = "testAppName"

      parentPanel = new Panel()
      childPanel = parentPanel.add(xtype: "panel")

      aggregator = @createAggregator()

      @recordAction(aggregator, parentPanel)
      @beginLoad(aggregator, childPanel)
      @endLoad(aggregator, childPanel)
      
      @actionEvent = @sentEvents[0]
      @loadEvent = @sentEvents[1]
      @browserTabId = aggregator._browserTabId
      
    it "should have trace id and event id for the action event", ->
      expect(@actionEvent.tId).toBeAString()
      expect(@actionEvent.eId).toEqual @actionEvent.tId

    it "should not set the parent id for the action event", ->
      expect(@actionEvent.pId).toBeUndefined()

    it "should put the browser tab id on the events", ->
      expect(@actionEvent.tabId).toEqual @browserTabId
      expect(@loadEvent.tabId).toEqual @browserTabId

    it "should put the browser timestamp on the events", ->
      expect(@loadEvent.bts).toBeANumber()
      expect(@actionEvent.bts).toBeANumber()

    it "should put the app name on the events", ->
      expect(@loadEvent.appName).toEqual @appName
      expect(@actionEvent.appName).toEqual @appName

    it "should parent the load event to the action event", ->
      expect(@loadEvent.pId).toBeAString()
      expect(@loadEvent.pId).toEqual @actionEvent.eId

    it "should have a common trace id for all the events", ->
      expect(@loadEvent.tId).toBeAString()
      expect(@actionEvent.tId).toBeAString()
      expect(@actionEvent.tId).toEqual @loadEvent.tId

    it "should have a component type for the load event", ->
      expect(@loadEvent.cmpType).toBeAString()

    it "should put the component hierarchy on the events", ->
      expect(@actionEvent.cmpH).toEqual "Panel"
      expect(@loadEvent.cmpH).toEqual "Panel:Panel"

    it "puts start time on all events", ->
      expect(@actionEvent.start).toBeANumber()
      expect(@loadEvent.start).toBeANumber()

    it "puts stop time on the load event", ->
      expect(@loadEvent.stop).toBeANumber()

  describe 'finding traceIDs', ->
    it "should find the correct traceId", ->
      aggregator = @createAggregator()
      handler = aggregator.handlers[0]
      
      parentPanel = new Panel()
      childPanel = parentPanel.add(xtype: "panel")
      @stub(handler, "getComponentHierarchy").returns [childPanel, parentPanel]
  
      @recordAction(aggregator, parentPanel)
      @recordAction(aggregator, parentPanel)
      @beginLoad(aggregator, childPanel)
      @endLoad(aggregator, childPanel)
      
      secondActionEvent = @sentEvents[1]
      loadEvent = @sentEvents[2]
  
      expect(loadEvent.pId).toEqual secondActionEvent.eId

    it "should not parent to an event that has completed", ->
      aggregator = @createAggregator()
      handler = aggregator.handlers[0]
      parentPanel = new Panel()
      childPanel1 = parentPanel.add(xtype: "panel")
      childPanel2 = parentPanel.add(xtype: "panel")
      @stub handler, "getComponentHierarchy", (cmp) ->
        [cmp, parentPanel]

      @recordAction(aggregator, parentPanel)

      @beginLoad(aggregator, parentPanel)
      @beginLoad(aggregator, childPanel1)
      @endLoad(aggregator, childPanel1)
      @endLoad(aggregator, parentPanel)

      @beginLoad(aggregator, childPanel2)
      @endLoad(aggregator, childPanel2)
      
      # action, childPanel1, parentPanel1, childPanel2
      actionEvent = @sentEvents[0]
      parentLoadEvent = @sentEvents[2]
      childPanel1LoadEvent = @sentEvents[1]
      childPanel2LoadEvent = @sentEvents[3]

      expect(parentLoadEvent.tId).toEqual actionEvent.eId
      expect(childPanel1LoadEvent.tId).toEqual actionEvent.eId
      expect(childPanel2LoadEvent.tId).toEqual actionEvent.eId
      
      # child 1 should parent to the parent panel because it happened while the parent was loading
      expect(childPanel1LoadEvent.pId).toEqual parentLoadEvent.eId
      
      # child 2 should not parent to the parent panel because it happened afer the parent was done
      expect(childPanel2LoadEvent.pId).toEqual actionEvent.eId

  describe 'miscData', ->
    it "should append miscData to an event and not overwrite known properties", ->
      aggregator = @createAggregatorAndRecordAction()
  
      miscData =
        eId: "this shouldnt clobeber the real eId"
        foo: "this should get through"

      cmp = @beginLoad(aggregator, null, "a load", miscData)
      @endLoad(aggregator, cmp)
  
      loadEvent = @findLoadEvent()

      expect(loadEvent.eId).toBeAString()
      expect(loadEvent.eId).not.toEqual miscData.eId
      expect(loadEvent.foo).toEqual miscData.foo

  describe '#recordError', ->
    it "sends an error event", ->
      aggregator = @createAggregator()

      @recordAction(aggregator)
      errorMessage = @recordError(aggregator)

      expect(@sentEvents.length).toBe 2
      errorEvent = @sentEvents[1]
      expect(errorEvent.eType).toBe "error"
      expect(errorEvent.error).toBe errorMessage
  
    it "does not create an error event if the error limit has been reached", ->
      aggregator = @createAggregator(errorLimit: 3)
      @recordAction(aggregator)

      for i in [0...5]
        errorMessage = @recordError(aggregator)
      
      # one action plus three errors
      expect(@sentEvents.length).toBe 4

      for errorEvent in @sentEvents[1..-1]
        expect(errorEvent.eType).toBe "error"
        expect(errorEvent.error).toBe errorMessage
  
    it "resets the error count whenever a new session starts", ->
      aggregator = @createAggregator()
      aggregator._errorCount = 2
      aggregator.startSession "newsession"
      expect(aggregator._errorCount).toBe 0
  
    it "truncates long error info", ->
      errorMessage = ""
      for i in [1..1000]
        errorMessage += "uh oh"
        
      expect(errorMessage.length).toBeGreaterThan 2000
  
      aggregator = @createAggregator()
      @recordAction(aggregator)
      @recordError(aggregator, errorMessage)

      expect(@sentEvents.length).toBe 2
      errorEvent = @sentEvents[1]
      expect(errorEvent.error.length).toBeLessThan 2000

  describe 'additional parameters', ->
    it "should append guiTestParams to events", ->
      aggregator = @createAggregator()
      aggregator._guiTestParams = foo: "bar"
      @recordAction(aggregator)
      
      actionEvent = @findActionEvent()
      expect(actionEvent.foo).toEqual "bar"

  describe "#_getRallyRequestId", ->
    it "should find the RallyRequestId on an object", ->
      aggregator = @createAggregator()

      response =
        getResponseHeader:
          RallyRequestID: "myrequestid"

      expect(aggregator._getRallyRequestId(response)).toBe "myrequestid"

    it "should find the RallyRequestId from a function", ->
      aggregator = @createAggregator()

      response =
        getResponseHeader: @stub().returns("myrequestid")
        
      expect(aggregator._getRallyRequestId(response)).toBe "myrequestid"   
      expect(response.getResponseHeader).toHaveBeenCalledWith("RallyRequestID")  

    it "should not find a RallyRequestId if there is no getResponseHeader", ->
      aggregator = @createAggregator()

      response = {}
        
      expect(aggregator._getRallyRequestId(response)).toBeUndefined()

    it "should not find a RallyRequestId if there getResponseHeader is something else", ->
      aggregator = @createAggregator()

      response = getResponseHeader: 123
        
      expect(aggregator._getRallyRequestId(response)).toBeUndefined()
