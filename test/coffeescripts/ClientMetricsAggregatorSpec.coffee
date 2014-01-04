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

class AjaxProvider
  constructor: (@spec) ->
    @events = {}

  request: (options) ->
    @spec.connection = this
    _.extend(this, options)
    @fireEvent "beforerequest", this, options
    response = getResponseHeader: RallyRequestID: @spec.rallyRequestId
    @fireEvent "requestcomplete", this, response, options

  on: (event, fn, scope) ->
    @events[event] = { fn, scope }

  fireEvent: (event) ->
    ev = @events[event]
    if ev
      ev.fn.apply(ev.scope || this, _.toArray(arguments).slice(1))

describe "RallyMetrics.ClientMetricsAggregator", ->
  beforeEach ->
    # @ajaxProvider = new Ext.data.Connection()
    @ajaxProvider = new AjaxProvider(this)
    @rallyRequestId = 123456
    @spy(@ajaxProvider, "request")
    
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

    startSession: (aggregator, status="a status", defaultParams = {}) ->
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
        ajaxProviders: [@ajaxProvider]
  
      new RallyMetrics.ClientMetricsAggregator(aggregatorConfig)

    createSender: ->
      @sentEvents = []
      me = this
      send: (events) ->
        me.sentEvents = me.sentEvents.concat(events)

    setupAggregator: ->
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
      sendEventsSpy = @spy(RallyMetrics.ClientMetricsAggregator::, 'sendAllRemainingEvents')
      
      start = new Date().getTime()
      @aggregator = @createAggregator
        flushInterval: 10

      once(
        condition: -> sendEventsSpy.callCount > 2
        description: 'waiting for flush to happen more than twice'
      ).then ->
        stop = new Date().getTime()
        expect(stop - start).toBeGreaterThan 20
      
  describe 'startSession message', ->
    it "should start a new session", ->
      aggregator = @createAggregator()
      startSessionStub = @stub(aggregator, "startSession")

      status = 'a status'
      defaultParams = foo: 'bar'
      
      @startSession aggregator, status, defaultParams
      expect(startSessionStub).toHaveBeenCalledWith status, defaultParams

  describe 'data requests', ->
    it "should trim the request url correctly", ->
      @setupAggregator()
      
      expectedUrl = "3.14/Foo.js"
      entireUrl = "http://localhost/testing/webservice/#{expectedUrl}?bar=baz&boo=buzz"
  
      @ajaxProvider.request
        requester: this
        url: entireUrl

      dataEvent = @findDataEvent()
      expect(dataEvent.url).toEqual expectedUrl
    
    it "should have the component hierarchy", ->
      @setupAggregator()
      @ajaxProvider.request
        requester: new Panel()
      
      dataEvent = @findDataEvent()
      expect(dataEvent.cmpH).toEqual "Panel"
      
    it "appends ID properties to AJAX headers", ->
      @setupAggregator()
      @ajaxProvider.request
        requester: this

      actionEvent = @findActionEvent()
      dataEvent = @findDataEvent()

      expect(@connection.defaultHeaders['X-Parent-Id']).toEqual dataEvent.eId
      expect(@connection.defaultHeaders['X-Trace-Id']).toEqual actionEvent.eId
  
    it "does not append ID properties to AJAX headers when request is not instrumented", ->
      @setupAggregator()
      @ajaxProvider.request {}
  
      expect(@connection.defaultHeaders['X-Parent-Id']).toBeUndefined()
      expect(@connection.defaultHeaders['X-Trace-Id']).toBeUndefined()
      
    it "appends the rallyRequestId onto dataRequest events", ->
      @setupAggregator()
      @ajaxProvider.request
        requester: this

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
      aggregator = @setupAggregator()
  
      miscData =
        eId: "this shouldnt clobeber the real eId"
        foo: "this should get through"

      cmp = @beginLoad(aggregator, null, "a load", miscData)
      @endLoad(aggregator, cmp)
  
      loadEvent = @findLoadEvent()

      expect(loadEvent.eId).toBeAString()
      expect(loadEvent.eId).not.toEqual miscData.eId
      expect(loadEvent.foo).toEqual miscData.foo


  describe 'error', ->
    it "creates an error event for error messages", ->
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
  
    it "should append defaultParams to events", ->
      aggregator = @createAggregator()

      hash = "/some/hash"
      defaultParams = hash: hash
      
      aggregator.startSession { status: "Session 1", defaultParams }
      @recordAction(aggregator)
  
      actionEvent = @findActionEvent()
      expect(actionEvent.hash).toEqual hash

  describe "legacy messages", ->
    helpers
      recordActionWithCmpOptions: (aggregator, cmp, description="an action") ->
        aggregator.recordAction cmp,
          description: description 
        
        return cmp

      beginLoadWithCmpOptions: (aggregator, cmp, description='an action', miscData={}) ->
        aggregator.beginLoad cmp,
          description: description
          miscData: miscData

        return cmp

      recordActionWithCmpUserActionMiscData: (aggregator, cmp, description="an action", miscData={}) ->
        aggregator.recordAction cmp, description, miscData
        return cmp

      beginLoadWithCmpUserActionMiscData: (aggregator, cmp, description='an action', miscData={}) ->
        aggregator.beginLoad cmp, description, miscData
        return cmp

      endLoadWithCmp: (aggregator, cmp) ->
        # since endLoad is so simple, it's only had two formats: [cmp], and [options.component]
        aggregator.endLoad cmp

        return cmp

    describe "messages that have component and options params", ->    
      beforeEach ->
        panel = new Panel()
        aggregator = @createAggregator()

        @recordActionWithCmpOptions(aggregator, panel)
        @beginLoadWithCmpOptions(aggregator, panel)
        @endLoadWithCmp(aggregator, panel)
        
        @actionEvent = @sentEvents[0]
        @loadEvent = @sentEvents[1]

      describe "action", ->
        it "should record the action correctly", ->
          expect(@actionEvent.bts).toBeANumber()
          expect(@actionEvent.tId).toBeAString()
          expect(@actionEvent.eId).toEqual @actionEvent.tId

        it "should record the load correctly", ->
          expect(@loadEvent.bts).toBeANumber()
          expect(@loadEvent.eId).toBeAString()
          expect(@loadEvent.tId).toBeAString()
          expect(@loadEvent.pId).toBeAString()
          expect(@loadEvent.pId).toEqual @actionEvent.eId

    describe "messages that have component, description and miscData params", ->    
      beforeEach ->
        panel = new Panel()
        aggregator = @createAggregator()

        @recordActionWithCmpUserActionMiscData(aggregator, panel)
        @beginLoadWithCmpUserActionMiscData(aggregator, panel)
        @endLoadWithCmp(aggregator, panel)
        
        @actionEvent = @sentEvents[0]
        @loadEvent = @sentEvents[1]

      describe "action", ->
        it "should record the action correctly", ->
          expect(@actionEvent.bts).toBeANumber()
          expect(@actionEvent.tId).toBeAString()
          expect(@actionEvent.eId).toEqual @actionEvent.tId

        it "should record the load correctly", ->
          expect(@loadEvent.bts).toBeANumber()
          expect(@loadEvent.eId).toBeAString()
          expect(@loadEvent.tId).toBeAString()
          expect(@loadEvent.pId).toBeAString()
          expect(@loadEvent.pId).toEqual @actionEvent.eId          
