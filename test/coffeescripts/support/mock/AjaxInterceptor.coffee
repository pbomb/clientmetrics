# Ext2 = (typeof window.Ext4 != 'undefined') && window.Ext
# Ext = window.Ext4 || window.Ext

###*
* Provides an easy way to mock out an AJAX response when you don't have
* access to the object making the request (in that case, use MockAjaxProvider).
*
* To use:
*
*    TestCase('SomeCoolTest', {
*      setUp: function() {
*        this.data = [
*          {Name: 'Feature', _ref: '/typedefinition/0'},
*          {Name: 'Theme', _ref: '/typedefinition/1'}
*        ]
*        Ext.create('Rally.mock.AjaxInterceptor', this).respondWithQueryResult(this.data)
*      }
*      ...
*
*
###
Rally.mock ?= {}
Rally.mock.AjaxInterceptor = class AjaxInterceptor
  ###
   * @property stub A stub of the Ext.Ajax.request function
  ###

  ###
   * @property ext2stub A stub of the Ext2 Ext.lib.Ajax.request function
  ###

  ###
   * @constructor
   * @param testCase The TestCase instance to mock Ajax requests for.
   * This Test Case must have the sinon.sandbox methods injected into it
  ###
  constructor: (@testCase) ->
    @_mockResponses = []

    # if Ext.data.Connection.prototype.request.getCall?
    #   Ext.data.Connection.prototype.request.restore()
    # if Ext.data.JsonP.request.getCall?
    #   Ext.data.JsonP.request.restore()
    # if Ext2 && Ext2.lib.Ajax.request.getCall?
    #   Ext2.lib.Ajax.request.restore()

  statics:
    emptyResponses:
      'GET':
        "QueryResult":
          "TotalResultCount": 0
          "StartIndex": 1
          "PageSize": 200
          "Results": []
          "Errors": []
          "Warnings": []
      'POST':
        "OperationResult":
          "_rallyAPIMajor": "1"
          "_rallyAPIMinor": "34"
          "Errors": []
          "Warnings": []
          "Object": {}
      'DELETE':
        "OperationResult":
          "_rallyAPIMajor": "1"
          "_rallyAPIMinor": "34"
          "Errors": []
          "Warnings": []
      'PUT':
        "CreateResult":
          "_rallyAPIMajor": "1"
          "_rallyAPIMinor": "34"
          "Errors": []
          "Warnings": []
          "Object": {}

  ###
   * Sets up a mock Ajax response returning HTML
   * @param {String} html The HTML to be returned
   * @param {Object} [options] Optional options to configure aspects about the request/response
   * @param {Boolean} [options.success=true] Whether the query request should be considered successful
   * @param {String} [options.url] Supply a value, only if this response should only be used for requests that contain this
   * @param {String} [options.method='GET'] The HTTP request method verb to use. Possible values include: GET, POST, PUT, DELETE
   * @return {sinon.stub} The stub function for returning this mocked response
  ###
  respondWithHtml: (html, options = {}) ->
    @_mock(html, options.success, options, options.method || 'GET')

  ###
   * Sets up a mock Ajax response returning JSON
   * @param {Object} json The JSON to be returned
   * @param {Object} [options] Optional options to configure aspects about the request/response
   * @param {Boolean} [options.success=true] Whether the query request should be considered successful
   * @param {String} [options.url] Supply a value, only if this response should only be used for requests that contain this
   * @param {String} [options.method='GET'] The HTTP request method verb to use. Possible values include: GET, POST, PUT, DELETE
   * @return {sinon.stub} The stub function for returning this mocked response
  ###
  respondWithJson: (json, options = {}) ->
    @_mock(json, options.success, options, options.method || 'GET')

  ###
   * Sets up a mock response to a WSAPI GET request expecting a collection in return
   * @param {Object} [data=[]] Models and their fields to be returned in the response results
   * @param {Object} [options] Optional options to configure aspects about the request/response
   * @param {Array} [options.errors=[]] Errors to be returned due to unsuccessful query
   * @param {Array} [options.warnings=[]] Warnings to be returned despite successful query
   * @param {Boolean} [options.success=true] Whether the query request should be considered successful
   * @param {String} [options.url] Supply a value, only if this response should only be used for requests that contain this
   * @param {Object} [options.schema] Supply this value to be included as the Schema property of the QueryResult in the response
   * @param {Number} [options.totalResultCount] Supply this value to set the TotalResultCount in the response
   * @return {sinon.stub} The stub function for returning this mocked response
  ###
  respondWithQueryResult: (data = [], options = {}) ->
    response =
      "QueryResult":
        "TotalResultCount": options.totalResultCount || data.length
        "StartIndex": 1
        "PageSize": 200
        "Results": data
        "Errors": options.errors || []
        "Warnings": options.warnings || []
    if options.schema
      response.QueryResult.Schema = options.schema

    success = @_getSuccess(options)
    @_mock(response, success, options, 'GET')

  ###
   * Sets up a mock response to a WSAPI POST request to update a single object
   * @param {Object} [data={}] Fields to be returned as the updated model
   * @param {Object} [options] Optional options to configure aspects about the request/response
   * @param {Array} [options.errors=[]] Errors to be returned due to unsuccessful update
   * @param {Array} [options.warnings=[]] Warnings to be returned despite successful update
   * @param {Boolean} [options.success=true] Whether the update should be considered successful
   * @param {String} [options.url] Supply a value, only if this response should only be used for requests that contain this
   * @return {sinon.stub} The stub function for returning this mocked response
  ###
  respondWithUpdateResult: (data = {}, options = {}) ->
    response =
      "OperationResult":
        "_rallyAPIMajor": "1"
        "_rallyAPIMinor": "34"
        "Errors": options.errors || []
        "Warnings": options.warnings || []
        "Object": data
    
    success = @_getSuccess(options)
    @_mock(response, success, options, 'POST')

  ###
   * Sets up a mock response to a WSAPI DELETE request to delete a single object
   * @param {Object} [options] Optional options to configure aspects about the request/response
   * @param {Array} [options.errors=[]] Errors to be returned due to unsuccessful delete
   * @param {Array} [options.warnings=[]] Warnings to be returned despite successful delete
   * @param {Boolean} [options.success=true] Whether the delete should be considered successful
   * @param {String} [options.url] Supply a value, only if this response should only be used for requests that contain this
   * @return {sinon.stub} The stub function for returning this mocked response
  ###
  respondWithDeleteResult: (options = {}) ->
    response =
      "OperationResult":
        "_rallyAPIMajor": "1"
        "_rallyAPIMinor": "34"
        "Errors": options.errors || []
        "Warnings": options.warnings || []
    
    success = @_getSuccess(options)
    @_mock(response, success, options, 'DELETE')

  ###
   * Sets up a mock response to a WSAPI PUT create request
   * @param {Object} [data={}] Fields to be returned as the created model
   * @param {Object} [options] Optional options to configure aspects about the request/response
   * @param {Array} [options.errors=[]] Errors to be returned due to unsuccessful save
   * @param {Array} [options.warnings=[]] Warnings to be returned despite successful save
   * @param {Boolean} [options.success=true] Whether the create should be considered successful
   * @param {String} [options.url] Supply a value, only if this response should only be used for requests that contain this
   * @return {sinon.stub} The stub function for returning this mocked response
  ###
  respondWithCreateResult: (data = {}, options = {}) ->
    response =
      "CreateResult":
        "_rallyAPIMajor": "1"
        "_rallyAPIMinor": "34"
        "Errors": options.errors || []
        "Warnings": options.warnings || []
        "Object": data
    
    success = @_getSuccess(options)
    @_mock(response, success, options, 'PUT')

  ###
   * Sets up a mock response to a WSAPI GET request to read a single object
   * @param {Object} [data={}] Fields to be returned as the read model
   * @param {Object} [options] Optional options to configure aspects about the request/response
   * @param {Array} [options.errors=[]] Errors to be returned due to unsuccessful save
   * @param {Array} [options.warnings=[]] Warnings to be returned despite successful save
   * @param {Boolean} [options.success=true] Whether the create should be considered successful
   * @param {String} [options.url] Supply a value, only if this response should only be used for requests that contain this
   * @return {sinon.stub} The stub function for returning this mocked response
  ###
  respondWithReadResult: (data = {}, options = {}) ->
    data = Ext.apply({
      Errors: options.errors || [],
      Warnings: options.warnings || []
    }, data)
    @_mock([data], options.success, options, 'GET')

  _mock: (response, success = true, options = {}, method, queryParams) ->
    _mockResponses = @_mockResponses

    mockConfig =
      url: options.url
      method: method
      queryParams: queryParams
      urlMatcher: options.urlMatcher
      neverRespond: options.neverRespond

    mock = @_findExistingMock mockConfig

    if mock
      mock.reinitialize(@testCase, success, response, mockConfig)
    else
      mock = new MockResponse(@testCase, success, response, mockConfig)
      @_addMockResponse mock

    sendResponse = (config, ext2Options) =>
      config.method ||= 'GET'
      mockResponse = @_getMockResponseForRequest(config)

      if mockResponse?
        responseText = mockResponse.getResponse config
        success = mockResponse.success
      else
        responseText = @_getEmptyResponse config.method

      response =
        responseText: responseText
        argument:
          options: ext2Options

      callbackMethod = if success then config.success else config.failure
      callbackMethod.apply(config.scope, [response, config]) unless mockResponse?.neverRespond

      if !ext2Options
        success = if mockResponse then mockResponse.success else true
        config.callback.apply(config.scope, [config, success, response]) unless mockResponse?.neverRespond

    if !@ext4Stub
      @stub = @ext4Stub = @testCase.stub(Ext.data.Connection.prototype, 'request', sendResponse)
      if Ext2
        @ext2Stub = @testCase.stub(Ext2.lib.Ajax, 'request', (method, url, options, params, o) ->
          sendResponse.apply this, [_.extend({
            method: method,
            url: url,
            params: params
          }, options), o], 1
        )
    # @ext4JsonPStub ?= @testCase.stub(Ext.data.JsonP, 'request', sendResponse)

    mock.getResponse

  restoreStub: ->
    @ext4Stub?.restore()
    @ext4Stub = null
    @ext4JsonPStub?.restore()
    @ext4JsonPStub = null
    @ext2Stub?.restore()
    @ext2Stub = null
    @removeAllMockResponses()

  removeAllMockResponses: ->
    @_mockResponses = []

  removeMockResponse: (config) ->
    _.each(@_mockResponses, (_mockResponse, i) ->
      if _mockResponse.matchesRequest(config)
        @_mockResponses.splice(i, 1)
        false
    , this)

  _findExistingMock: (mock) ->
    _.find(@_mockResponses, (response) -> response.url == mock.url && response.method == mock.method)

  _addMockResponse: (mock) ->
    @_mockResponses.push mock
    @_mockResponses.sort (a, b) ->
      b.url.length - a.url.length

  _getMockResponseForRequest: (config) ->
    mockResponse = null
    _.each(@_mockResponses, (_mockResponse) ->
      if _mockResponse.matchesRequest(config)
        mockResponse = _mockResponse
        false
    )
    mockResponse

  _getEmptyResponse: (method) ->
    JSON.stringify(Rally.mock.AjaxInterceptor.emptyResponses[method])

  _getSuccess: (options) ->
    if options.success? then options.success else !_.isArray(options.errors)

class MockResponse
  constructor: (testCase, success, response, config = {}) ->
    @reinitialize(testCase, success, response, config)

  reinitialize: (testCase, success, response, config = {}) ->
    @success = success
    @url = config.url
    @method = config.method
    @queryParams = config.queryParams
    @urlMatcher = config.urlMatcher
    @getResponse = testCase.stub().returns(if _.isString(response) then response else JSON.stringify(response))
    @neverRespond = config.neverRespond

  matchesRequest: (config) ->
    @_matchesUrl(config.url) && @_matchesMethod(config.method)

  _matchesUrl: (url) ->
    if @urlMatcher then return @urlMatcher(@url, url)
    !!(url.split('?')[0]).toLowerCase().match new RegExp(@url.toLowerCase() + 's*(\.js)?$')

  _matchesMethod: (method) ->
    @method == method

