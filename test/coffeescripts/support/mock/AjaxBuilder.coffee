
###*
* Helps mock out HTML and WSAPI Ajax requests for testing components without a running server.
* RallyTestCase automatically creates an instance for each test and can be found
* in the TestCase as *this.ajax*.
*
* Example of mocking out WSAPI queries
*
*     @example
*     this.ajax.whenQuerying('userstory').respondWith([{
*         ObjectID: 12345,
*         _ref: '/hierarchicalrequirement/12345',
*         Name: 'As a user, the site should be awesome, so that I can get my job done'
*     }])
*
*     var dataStore = Ext.create('Rally.data.wsapi.Store', {
*         model: 'userstory',
*         autoLoad: true
*     })
*     Assert.areEqual(1, dataStore.getCount())
*     Assert.areEqual(12345, dataStore.first.get('ObjectID')
###
Rally.mock ?= {}
Rally.mock.AjaxBuilder = class AjaxBuilder
  # mixins:
  #   snapshot: 'Rally.mock.SnapshotAjaxBuilder'


  constructor: (@ajaxInterceptor) ->
    @type = undefined
    @url = undefined
    @verb = undefined
    @objectID = undefined
    @singleObjectResponse = false
    @notWsapi = false
    @allowedValues = false

  ###*
  * Returns the stubbed AjaxInterceptor request function
  * @return {sinon.stub}
  ###
  getStub: -> @ajaxInterceptor.stub

  applyType: (value) -> @_coerceType(value)

  applyUrl: (value) -> @_coerceType(value)

  ###*
  * Creates a new instance of an AjaxBuilder setup to mock WSAPI queries
  * @param {String} type The name of a Rally WSAPI model type (e.g. 'userstory')
  * @return {Rally.mock.AjaxBuilder} A new instance configured to mock WSAPI queries for the given type
  ###
  whenQuerying: (type) ->
    @_when(type, 'query')

  ###*
  * Creates a new instance of an AjaxBuilder setup to mock WSAPI queries
  * @param {String} type The name of a Rally WSAPI model type (e.g. 'userstory')
  * @param {String} fieldName The name of the collection field
  * @return {AjaxBuilder} A new instance configured to mock WSAPI queries for the given type
  ###
  whenQueryingCollection: (type, fieldName) ->
    @_when(type, 'query', fieldName)

  ###*
  * Creates a new instance of an AjaxBuilder setup to mock WSAPI AllowedValue queries
  * @param {String/Rally.domain.WsapiField} type The name of a Rally WSAPI model type (e.g. 'userstory')
  *   or the field
  * @param {String} [fieldName] The name of the field if the first param is the model type
  * @return {AjaxBuilder} A new instance configured to mock WSAPI queries for the given type
  ###
  whenQueryingAllowedValues: (type, fieldName) ->
    builder = @_when(type, 'query', fieldName)
    builder.allowedValues = true
    builder

  ###*
  * Creates a new instance of an AjaxBuilder setup to mock endpoint GET requests.
  * These requests are not tied to models and the responses can be of any shape.
  * @param {String} type The endpoint URL
  * @return {Rally.mock.AjaxBuilder} A new instance configured to mock endpoint GET requests
  ###
  whenQueryingEndpoint: (type, wsapiResponse = false) ->
    builder = @_when(type, 'queryEndpoint')
    builder.notWsapi = !wsapiResponse
    builder

  ###*
  * Creates a new instance of an AjaxBuilder setup to mock WSAPI reads for single object
  * @param {String} type The name of a Rally WSAPI model type (e.g. 'userstory')
  * @param {String/Number} objectID The unique identifier for the object to be read
  * @return {Rally.mock.AjaxBuilder} A new instance configured to mock WSAPI reads for the given type
  ###
  whenReading: (type, objectID) ->
    builder = @_when(type, 'read')
    builder.objectID = objectID
    builder.singleObjectResponse = true
    builder

  ###*
  * Creates a new instance of an AjaxBuilder setup to mock endpoint GET requests.
  * These requests are not tied to models and the responses can be of any shape.
  * @param {String} type The endpoint URL
  * @return {Rally.mock.AjaxBuilder} A new instance configured to mock endpoint GET requests
  ###
  whenReadingEndpoint: (type, wsapiResponse = false) ->
    builder = @_when(type, 'readEndpoint')
    builder.notWsapi = !wsapiResponse
    builder

  ###*
  * Creates a new instance of an AjaxBuilder setup to mock WSAPI creates
  * @param {String} type The name of a Rally WSAPI model type (e.g. 'userstory')
  * @return {Rally.mock.AjaxBuilder} A new instance configured to mock WSAPI creates for the given type
  ###
  whenCreating: (type, wsapiResponse = true) ->
    builder = @_when(type, 'create')
    builder.singleObjectResponse = true
    builder.notWsapi = !wsapiResponse
    builder

  ###*
  * Creates a new instance of an AjaxBuilder setup to mock WSAPI updates of a single object
  * @param {String} type The name of a Rally WSAPI model type (e.g. 'userstory')
  * @param {String/Number} objectID The unique identifier for the object to be updated
  * @return {Rally.mock.AjaxBuilder} A new instance configured to mock WSAPI updates for the given type
  ###
  whenUpdating: (type, objectID, wsapiResponse = true) ->
    throw new Error 'AjaxBuilder.whenUpdating, objectID parameter is required' unless objectID?

    builder = @_when(type, 'update')
    builder.objectID = objectID
    builder.singleObjectResponse = true
    builder.notWsapi = !wsapiResponse
    builder

  ###*
  * Creates a new instance of an AjaxBuilder setup to mock WSAPI batch updates
  * @return {Rally.mock.AjaxBuilder} A new instance configured to mock WSAPI batch updates
  ###
  whenBatchUpdating: () ->
    builder = @_when('hierarchicalrequirement', 'batchUpdate', '/batch')
    builder.notWsapi = true
    builder

  ###*
  * Creates a new instance of an AjaxBuilder setup to mock WSAPI updates to a collection field of a single object
  * @param {String} type The name of a Rally WSAPI model type (e.g. 'userstory')
  * @param {String/Number} objectID The unique identifier for the object to be updated
  * @param {String} fieldName The name of the collection field
  * @param {String} endpoint The name of the endpoint (add/remove)
  * @return {Rally.mock.AjaxBuilder} A new instance configured to mock WSAPI updates for the given type
  ###
  whenUpdatingCollection: (type, objectID, fieldName, endpoint = 'add') ->
    throw new Error 'AjaxBuilder.whenUpdatingCollection, objectID parameter is required' unless objectID?

    builder = @_when(type, 'updateCollection', fieldName)
    builder.endpoint = endpoint
    builder.objectID = objectID
    builder.singleObjectResponse = true
    builder

  ###*
  * Creates a new instance of an AjaxBuilder setup to mock WSAPI deletes of single object
  * @param {String} type The name of a Rally WSAPI model type (e.g. 'userstory')
  * @param {String/Number} objectID The unique identifier for the object to be deleted
  * @return {Rally.mock.AjaxBuilder} A new instance configured to mock WSAPI deletes for the given type
  ###
  whenDeleting: (type, objectID, wsapiResponse = true) ->
    throw new Error 'AjaxBuilder.whenDeleting, objectID parameter is required' unless objectID?

    builder = @_when(type, 'delete')
    builder.objectID = objectID
    builder.notWsapi = !wsapiResponse
    builder

  ###*
  * Provides a successful response for the mocked-out Ajax request
  * @param {Array/Object} [results] Objects to be returned in the response.
  * For queries, this should be an Array and defaults to an empty Array.
  * For reads and updates, this should be a single Object and defaults to an empty Object.
  * For deletes, this parameter should not be used
  * @param {Object} [options]
  * @param {Object} [options.schema] Supply this value to be included as the Schema property of the QueryResult in the response
  * @return {sinon.stub} The stub  for returning this mocked response
  ###
  respondWith: (results = [], options = {}) ->
    if (_.isObject(results) && !@getNotWsapi())
      results = [results]
    options.values = results
    count = results.length

    if @getSingleObjectResponse()
      count = 1

    @respondWithCount(count, options)

  neverRespond: ->
    @_respondWith(null, neverRespond: true)

  respondWithCount: (count, options = {}) ->
    me = this
    type = @getType()
    modelType = type
    url = @getUrl()
    results

    if (@getNotWsapi() || url.indexOf?('user:current/permissions/all') > -1)
      results = options.values
    else if @getAllowedValues()
      modelType = 'AllowedAttributeValue'
      field = if type.getAllowedValuesRef? then type else Rally.mock.data.WsapiModelFactory.getModel(type).getField(url)
      @setUrl(field.getAllowedValuesRef())

      options.withRefs = field.attributeDefinition.AllowedValueType
      
      if options.values
        options.values = _.map(options.values, (value) -> if _.isObject(value) then value else StringValue: value)
      
      results = Rally.mock.ModelObjectMother.getData(modelType, _.extend({
        count: count
      }, options))
    else
      if (url != type)
        attributeDefinition = Rally.mock.data.WsapiModelFactory.getModel(type).getField(Ext.String.capitalize(url)).attributeDefinition
        modelType = attributeDefinition.AllowedValueType?._refObjectName || attributeDefinition.SchemaType

      objectID = @getObjectID()
      if objectID?
        if !(options.values?.length)
          options.values = [{}]

        @_setIdAndRef(type, options.values[0], objectID)

      results = Rally.mock.ModelObjectMother.getData(modelType, _.extend({
        count: count
      }, options))

    if @getSingleObjectResponse()
      results = results[0]

    mock = @_respondWith(results, options)
    mock.data = results
    if !@getNotWsapi()
      mock.getRecord = (index = 0) ->
        Model = Rally.mock.data.WsapiModelFactory.getModel(type)
        result = if me.getSingleObjectResponse() then results else results[index]
        new Model(result)
      mock.getRecords = ->
        Model = Rally.mock.data.WsapiModelFactory.getModel(type)
        _.map results, (result) -> new Model(result)
    mock

  ###*
  * Provides an unsuccessful response for the mocked-out Ajax request
  * @param {Array/String} errors One or more errors to be returned in the response
  * @return {sinon.stub} The stub  for returning this mocked response
  ###
  errorWith: (errors) ->
    errors = [errors] if _.isString(errors)
    @_respondWith([], errors: errors)

  _respondWith: (results, options = {}) ->
    wsapiVersion = Rally.mock.data.WsapiModelFactory.getModelClassVersion(options.version)
    url = @getUrl()
    objectID = @getObjectID()
    urlSuffix = if wsapiVersion == 'v2.x' then '' else '.js'
    switch @getVerb()
      when 'query'
        if url?
          options.url = "#{url}#{urlSuffix}"
        options.method = 'GET'
        interceptorFn = 'respondWithQueryResult'

      when 'read'
        options.url = url
        if objectID?
          options.url += '/' + objectID
        options.url += urlSuffix
        options.method = 'GET'
        interceptorFn = 'respondWithReadResult'

      when 'create'
        options.url = "#{url}/create#{urlSuffix}"
        options.method = 'PUT'
        interceptorFn = 'respondWithCreateResult'

      when 'update'
        options.url = "#{url}/#{objectID}#{urlSuffix}"
        options.method = 'POST'
        interceptorFn = 'respondWithUpdateResult'

      when 'updateCollection'
        type = @getType()
        endpoint = @endpoint

        options.url = "#{type}/#{objectID}/#{url}/#{endpoint}#{urlSuffix}"
        options.method = 'POST'
        interceptorFn = 'respondWithUpdateResult'

      when 'delete'
        options.url = "#{url}/#{objectID}#{urlSuffix}"
        options.method = 'DELETE'
        results = options # delete doesn't have results array, just options param
        interceptorFn = 'respondWithDeleteResult'

      when 'queryEndpoint'
        options.url = url
        options.method = 'GET'
        options.urlMatcher = (url1, url2) -> (url2||'').toLowerCase().indexOf((url1||'').toLowerCase()) != -1
        interceptorFn = 'respondWithQueryResult'

      when 'readEndpoint'
        options.url = url
        options.method = 'GET'
        options.urlMatcher = (url1, url2) -> (url2||'').toLowerCase().indexOf((url1||'').toLowerCase()) != -1
        interceptorFn = 'respondWithReadResult'

      when 'batchUpdate'
        options.url = url
        options.method = 'POST'
        options.urlMatcher = (url1, url2) -> (url2||'').toLowerCase().indexOf((url1||'').toLowerCase()) != -1
        interceptorFn = 'respondWithJson'

    @ajaxInterceptor[interceptorFn](results, options)

  ###*
  * Directly responds with an HTML response
  * @param {String} html The HTML response to be returned
  * @param {Object} [options] Optional options to configure aspects about the request/response
  * @param {Boolean} [options.success=true] Whether the query request should be considered successful
  * @param {String} [options.url] Supply a value, only if this response should only be used for requests that contain this
  * @param {String} [options.method='GET'] The HTTP request method verb to use. Possible values include: GET, POST, PUT, DELETE
  * @return {*}
  ###
  respondWithHtml: (html, options) -> @ajaxInterceptor.respondWithHtml(html, options)

  _when: (type, verb, url = type) ->
    builder = new Rally.mock.AjaxBuilder(@ajaxInterceptor)
    builder.type = type
    builder.url = url
    builder.verb = verb
    builder

  _setIdAndRef: (type, obj, id) ->
    obj.ObjectID = id
    obj._ref = "/#{type}/#{id}"

  _coerceType: (value = '') ->
    if (value.toLowerCase?() == 'userstory') then 'hierarchicalrequirement' else value
