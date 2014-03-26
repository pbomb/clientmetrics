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
      
    it 'should flush on the specified interval', (done) ->
      @aggregator = @createAggregator
        flushInterval: 10

      start = new Date().getTime()

      once(
        condition: => @aggregator.sender.flush.callCount > 2
        description: 'waiting for flush to happen more than twice'
      ).done ->
        stop = new Date().getTime()
        expect(stop - start).to.be.greaterThan 20
        done()
      
  describe '#startSession', ->
    it "should start a new session", ->
      aggregator = @createAggregator()

      status = 'Navigation'
      defaultParams = foo: 'bar'
      
      @startSession aggregator, status, defaultParams

    it "should flush the sender", ->
      aggregator = @createAggregator()

      @startSession aggregator
      
      expect(aggregator.sender.flush).to.have.been.calledOnce

    it "should append defaultParams to events", ->
      aggregator = @createAggregator()

      hash = "/some/hash"
      defaultParams = hash: hash
      
      aggregator.startSession "Session 1", defaultParams
      @recordAction(aggregator)
  
      actionEvent = @findActionEvent()
      expect(actionEvent.hash).to.equal hash

  describe '#sendAllRemainingEvents', ->
    it 'should flush the sender', ->
      aggregator = @createAggregator()

      aggregator.sendAllRemainingEvents()

      expect(aggregator.sender.flush).to.have.been.calledOnce

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
      expect(dataEvent.url).to.equal expectedUrl
    
    it "should have the component hierarchy", ->
      aggregator = @createAggregatorAndRecordAction()
      requester = new Panel()

      metricsData = aggregator.beginDataRequest requester, "someUrl"
      aggregator.endDataRequest requester, @xhrFake, metricsData.requestId
      
      dataEvent = @findDataEvent()
      expect(dataEvent.cmpH).to.equal "Panel"
      
    it "returns ID properties for AJAX headers", ->
      aggregator = @createAggregatorAndRecordAction()
      requester = this

      metricsData = aggregator.beginDataRequest requester, "someUrl"
      aggregator.endDataRequest requester, @xhrFake, metricsData.requestId
      
      actionEvent = @findActionEvent()
      dataEvent = @findDataEvent()

      expect(metricsData.xhrHeaders).to.eql 'X-Parent-Id': dataEvent.eId, 'X-Trace-Id': actionEvent.eId
  
    it "does not return ID properties for AJAX headers when request is not instrumented", ->
      aggregator = @createAggregatorAndRecordAction()
      
      metricsData = aggregator.beginDataRequest null, "someUrl"
      
      expect(metricsData).to.be.undefined
      
    it "appends the rallyRequestId onto dataRequest events", ->
      aggregator = @createAggregatorAndRecordAction()

      xhr = new XMLHttpRequest()
      xhr.open('GET', 'someUrl', true)
      xhr.send('data')
      xhr.setResponseHeaders
        RallyRequestID: @rallyRequestId
      xhr.setResponseBody 'textual healing'

      metricsData = aggregator.beginDataRequest this, "someUrl"
      aggregator.endDataRequest this, xhr, metricsData.requestId

      dataEvent = @findDataEvent()
      expect(dataEvent.rallyRequestId).to.equal @rallyRequestId
    
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
      expect(@actionEvent.tId).to.be.a('string')
      expect(@actionEvent.eId).to.equal @actionEvent.tId

    it "should not set the parent id for the action event", ->
      expect(@actionEvent.pId).to.be.undefined

    it "should put the browser tab id on the events", ->
      expect(@actionEvent.tabId).to.equal @browserTabId
      expect(@loadEvent.tabId).to.equal @browserTabId

    it "should put the browser timestamp on the events", ->
      expect(@loadEvent.bts).to.be.a('number')
      expect(@actionEvent.bts).to.be.a('number')

    it "should put the app name on the events", ->
      expect(@loadEvent.appName).to.equal @appName
      expect(@actionEvent.appName).to.equal @appName

    it "should parent the load event to the action event", ->
      expect(@loadEvent.pId).to.be.a('string')
      expect(@loadEvent.pId).to.equal @actionEvent.eId

    it "should have a common trace id for all the events", ->
      expect(@loadEvent.tId).to.be.a('string')
      expect(@actionEvent.tId).to.be.a('string')
      expect(@actionEvent.tId).to.equal @loadEvent.tId

    it "should have a component type for the load event", ->
      expect(@loadEvent.cmpType).to.be.a('string')

    it "should put the component hierarchy on the events", ->
      expect(@actionEvent.cmpH).to.equal "Panel"
      expect(@loadEvent.cmpH).to.equal "Panel:Panel"

    it "puts start time on all events", ->
      expect(@actionEvent.start).to.be.a('number')
      expect(@loadEvent.start).to.be.a('number')

    it "puts stop time on the load event", ->
      expect(@loadEvent.stop).to.be.a('number')

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
  
      expect(loadEvent.pId).to.equal secondActionEvent.eId

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

      expect(parentLoadEvent.tId).to.equal actionEvent.eId
      expect(childPanel1LoadEvent.tId).to.equal actionEvent.eId
      expect(childPanel2LoadEvent.tId).to.equal actionEvent.eId
      
      # child 1 should parent to the parent panel because it happened while the parent was loading
      expect(childPanel1LoadEvent.pId).to.equal parentLoadEvent.eId
      
      # child 2 should not parent to the parent panel because it happened afer the parent was done
      expect(childPanel2LoadEvent.pId).to.equal actionEvent.eId

  describe 'miscData', ->
    it "should append miscData to an event and not overwrite known properties", ->
      aggregator = @createAggregatorAndRecordAction()
  
      miscData =
        eId: "this shouldnt clobeber the real eId"
        foo: "this should get through"

      cmp = @beginLoad(aggregator, null, "a load", miscData)
      @endLoad(aggregator, cmp)
  
      loadEvent = @findLoadEvent()

      expect(loadEvent.eId).to.be.a('string')
      expect(loadEvent.eId).not.to.equal miscData.eId
      expect(loadEvent.foo).to.equal miscData.foo

  describe '#recordError', ->
    it "sends an error event", ->
      aggregator = @createAggregator()

      @recordAction(aggregator)
      errorMessage = @recordError(aggregator)

      expect(@sentEvents.length).to.equal 2
      errorEvent = @sentEvents[1]
      expect(errorEvent.eType).to.equal "error"
      expect(errorEvent.error).to.equal errorMessage
  
    it "does not create an error event if the error limit has been reached", ->
      aggregator = @createAggregator(errorLimit: 3)
      @recordAction(aggregator)

      for i in [0...5]
        errorMessage = @recordError(aggregator)
      
      # one action plus three errors
      expect(@sentEvents.length).to.equal 4

      for errorEvent in @sentEvents[1..-1]
        expect(errorEvent.eType).to.equal "error"
        expect(errorEvent.error).to.equal errorMessage
  
    it "resets the error count whenever a new session starts", ->
      aggregator = @createAggregator()
      aggregator._errorCount = 2
      aggregator.startSession "newsession"
      expect(aggregator._errorCount).to.equal 0
  
    it "truncates long error info", ->
      errorMessage = ""
      for i in [1..1000]
        errorMessage += "uh oh"
        
      expect(errorMessage.length).to.be.greaterThan 2000
  
      aggregator = @createAggregator()
      @recordAction(aggregator)
      @recordError(aggregator, errorMessage)

      expect(@sentEvents.length).to.equal 2
      errorEvent = @sentEvents[1]
      expect(errorEvent.error.length).to.be.lessThan 2000

  describe "#recordComponentReady", ->
    beforeEach ->
      @aggregator = @createAggregator()
      @panel = new Panel()

    it "should not record a component ready if there is no session", ->
      @aggregator.recordComponentReady(component: @panel)
      expect(@sentEvents.length).to.equal 0

    it "should record component ready even if there is not a current trace", ->
      @startSession(@aggregator)
      @aggregator.recordComponentReady(component: @panel)
      expect(@sentEvents.length).to.equal 1
      expect(@sentEvents[0].tId).to.be.undefined
      expect(@sentEvents[0].componentReady).to.equal true

    it "should record the traceId if one is present", ->
      @startSession(@aggregator)
      @recordAction(@aggregator, @panel)
      @aggregator.recordComponentReady(component: @panel)
      expect(@sentEvents.length).to.equal 2

      actionEvent = @sentEvents[0]
      componentReadyEvent = @sentEvents[1]

      expect(actionEvent.tId).to.equal actionEvent.eId
      expect(componentReadyEvent.tId).to.equal actionEvent.eId
      expect(componentReadyEvent.componentReady).to.equal true

    it "should record a start time equal to the session start time", ->
      @startSession(@aggregator)

      @aggregator.recordComponentReady(component: @panel)

      expect(@sentEvents.length).to.equal 1
      componentReadyEvent = @sentEvents[0]

      expect(componentReadyEvent.start).to.be.a('number')
      expect(componentReadyEvent.start).to.equal(@aggregator._sessionStartTime)
      expect(componentReadyEvent.stop).to.be.a('number')
      expect(componentReadyEvent.componentReady).to.equal true

    it "should record a component as ready only once per session", ->
      @startSession(@aggregator)

      @aggregator.recordComponentReady(component: @panel)
      @aggregator.recordComponentReady(component: @panel)

      expect(@sentEvents.length).to.equal 1
      expect(@sentEvents[0].eType).to.equal "load"
      expect(@sentEvents[0].componentReady).to.equal true

    it "should ignore a second component's ready if it has the same hierarchy as the previous component", ->
      @startSession(@aggregator)

      @aggregator.recordComponentReady(component: @panel)
      @aggregator.recordComponentReady(component: new Panel())

      expect(@sentEvents.length).to.equal 1
      expect(@sentEvents[0].eType).to.equal "load"
      expect(@sentEvents[0].componentReady).to.equal true

    it "should record a component as ready a second time if a new session started", ->
      @startSession(@aggregator)

      @aggregator.recordComponentReady(component: @panel)
      @aggregator.recordComponentReady(component: @panel)

      @startSession(@aggregator)
      @aggregator.recordComponentReady(component: @panel)

      expect(@sentEvents.length).to.equal 2
      expect(@sentEvents[0].eType).to.equal "load"
      expect(@sentEvents[1].eType).to.equal "load"
      expect(@sentEvents[0].componentReady).to.equal true
      expect(@sentEvents[1].componentReady).to.equal true

  describe 'additional parameters', ->
    it "should append guiTestParams to events", ->
      aggregator = @createAggregator()
      aggregator._guiTestParams = foo: "bar"
      @recordAction(aggregator)
      
      actionEvent = @findActionEvent()
      expect(actionEvent.foo).to.equal "bar"

  describe "#_getRallyRequestId", ->
    it "should find the RallyRequestId on an object", ->
      aggregator = @createAggregator()

      response =
        getResponseHeader:
          RallyRequestID: "myrequestid"

      expect(aggregator._getRallyRequestId(response)).to.equal "myrequestid"

    it "should find the RallyRequestId from a function", ->
      aggregator = @createAggregator()

      response =
        getResponseHeader: @stub().returns("myrequestid")
        
      expect(aggregator._getRallyRequestId(response)).to.equal "myrequestid"   
      expect(response.getResponseHeader).to.have.been.calledWith("RallyRequestID")  

    it "should not find a RallyRequestId if there is no getResponseHeader", ->
      aggregator = @createAggregator()

      response = {}
        
      expect(aggregator._getRallyRequestId(response)).to.be.undefined

    it "should not find a RallyRequestId if there getResponseHeader is something else", ->
      aggregator = @createAggregator()

      response = getResponseHeader: 123
        
      expect(aggregator._getRallyRequestId(response)).to.be.undefined
