/**
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
*/


(function() {
  var AjaxBuilder;

  if (Rally.mock == null) {
    Rally.mock = {};
  }

  Rally.mock.AjaxBuilder = AjaxBuilder = (function() {
    function AjaxBuilder(ajaxInterceptor) {
      this.ajaxInterceptor = ajaxInterceptor;
      this.type = void 0;
      this.url = void 0;
      this.verb = void 0;
      this.objectID = void 0;
      this.singleObjectResponse = false;
      this.notWsapi = false;
      this.allowedValues = false;
    }

    /**
    * Returns the stubbed AjaxInterceptor request function
    * @return {sinon.stub}
    */


    AjaxBuilder.prototype.getStub = function() {
      return this.ajaxInterceptor.stub;
    };

    AjaxBuilder.prototype.applyType = function(value) {
      return this._coerceType(value);
    };

    AjaxBuilder.prototype.applyUrl = function(value) {
      return this._coerceType(value);
    };

    /**
    * Creates a new instance of an AjaxBuilder setup to mock WSAPI queries
    * @param {String} type The name of a Rally WSAPI model type (e.g. 'userstory')
    * @return {Rally.mock.AjaxBuilder} A new instance configured to mock WSAPI queries for the given type
    */


    AjaxBuilder.prototype.whenQuerying = function(type) {
      return this._when(type, 'query');
    };

    /**
    * Creates a new instance of an AjaxBuilder setup to mock WSAPI queries
    * @param {String} type The name of a Rally WSAPI model type (e.g. 'userstory')
    * @param {String} fieldName The name of the collection field
    * @return {AjaxBuilder} A new instance configured to mock WSAPI queries for the given type
    */


    AjaxBuilder.prototype.whenQueryingCollection = function(type, fieldName) {
      return this._when(type, 'query', fieldName);
    };

    /**
    * Creates a new instance of an AjaxBuilder setup to mock WSAPI AllowedValue queries
    * @param {String/Rally.domain.WsapiField} type The name of a Rally WSAPI model type (e.g. 'userstory')
    *   or the field
    * @param {String} [fieldName] The name of the field if the first param is the model type
    * @return {AjaxBuilder} A new instance configured to mock WSAPI queries for the given type
    */


    AjaxBuilder.prototype.whenQueryingAllowedValues = function(type, fieldName) {
      var builder;
      builder = this._when(type, 'query', fieldName);
      builder.allowedValues = true;
      return builder;
    };

    /**
    * Creates a new instance of an AjaxBuilder setup to mock endpoint GET requests.
    * These requests are not tied to models and the responses can be of any shape.
    * @param {String} type The endpoint URL
    * @return {Rally.mock.AjaxBuilder} A new instance configured to mock endpoint GET requests
    */


    AjaxBuilder.prototype.whenQueryingEndpoint = function(type, wsapiResponse) {
      var builder;
      if (wsapiResponse == null) {
        wsapiResponse = false;
      }
      builder = this._when(type, 'queryEndpoint');
      builder.notWsapi = !wsapiResponse;
      return builder;
    };

    /**
    * Creates a new instance of an AjaxBuilder setup to mock WSAPI reads for single object
    * @param {String} type The name of a Rally WSAPI model type (e.g. 'userstory')
    * @param {String/Number} objectID The unique identifier for the object to be read
    * @return {Rally.mock.AjaxBuilder} A new instance configured to mock WSAPI reads for the given type
    */


    AjaxBuilder.prototype.whenReading = function(type, objectID) {
      var builder;
      builder = this._when(type, 'read');
      builder.objectID = objectID;
      builder.singleObjectResponse = true;
      return builder;
    };

    /**
    * Creates a new instance of an AjaxBuilder setup to mock endpoint GET requests.
    * These requests are not tied to models and the responses can be of any shape.
    * @param {String} type The endpoint URL
    * @return {Rally.mock.AjaxBuilder} A new instance configured to mock endpoint GET requests
    */


    AjaxBuilder.prototype.whenReadingEndpoint = function(type, wsapiResponse) {
      var builder;
      if (wsapiResponse == null) {
        wsapiResponse = false;
      }
      builder = this._when(type, 'readEndpoint');
      builder.notWsapi = !wsapiResponse;
      return builder;
    };

    /**
    * Creates a new instance of an AjaxBuilder setup to mock WSAPI creates
    * @param {String} type The name of a Rally WSAPI model type (e.g. 'userstory')
    * @return {Rally.mock.AjaxBuilder} A new instance configured to mock WSAPI creates for the given type
    */


    AjaxBuilder.prototype.whenCreating = function(type, wsapiResponse) {
      var builder;
      if (wsapiResponse == null) {
        wsapiResponse = true;
      }
      builder = this._when(type, 'create');
      builder.singleObjectResponse = true;
      builder.notWsapi = !wsapiResponse;
      return builder;
    };

    /**
    * Creates a new instance of an AjaxBuilder setup to mock WSAPI updates of a single object
    * @param {String} type The name of a Rally WSAPI model type (e.g. 'userstory')
    * @param {String/Number} objectID The unique identifier for the object to be updated
    * @return {Rally.mock.AjaxBuilder} A new instance configured to mock WSAPI updates for the given type
    */


    AjaxBuilder.prototype.whenUpdating = function(type, objectID, wsapiResponse) {
      var builder;
      if (wsapiResponse == null) {
        wsapiResponse = true;
      }
      if (objectID == null) {
        throw new Error('AjaxBuilder.whenUpdating, objectID parameter is required');
      }
      builder = this._when(type, 'update');
      builder.objectID = objectID;
      builder.singleObjectResponse = true;
      builder.notWsapi = !wsapiResponse;
      return builder;
    };

    /**
    * Creates a new instance of an AjaxBuilder setup to mock WSAPI batch updates
    * @return {Rally.mock.AjaxBuilder} A new instance configured to mock WSAPI batch updates
    */


    AjaxBuilder.prototype.whenBatchUpdating = function() {
      var builder;
      builder = this._when('hierarchicalrequirement', 'batchUpdate', '/batch');
      builder.notWsapi = true;
      return builder;
    };

    /**
    * Creates a new instance of an AjaxBuilder setup to mock WSAPI updates to a collection field of a single object
    * @param {String} type The name of a Rally WSAPI model type (e.g. 'userstory')
    * @param {String/Number} objectID The unique identifier for the object to be updated
    * @param {String} fieldName The name of the collection field
    * @param {String} endpoint The name of the endpoint (add/remove)
    * @return {Rally.mock.AjaxBuilder} A new instance configured to mock WSAPI updates for the given type
    */


    AjaxBuilder.prototype.whenUpdatingCollection = function(type, objectID, fieldName, endpoint) {
      var builder;
      if (endpoint == null) {
        endpoint = 'add';
      }
      if (objectID == null) {
        throw new Error('AjaxBuilder.whenUpdatingCollection, objectID parameter is required');
      }
      builder = this._when(type, 'updateCollection', fieldName);
      builder.endpoint = endpoint;
      builder.objectID = objectID;
      builder.singleObjectResponse = true;
      return builder;
    };

    /**
    * Creates a new instance of an AjaxBuilder setup to mock WSAPI deletes of single object
    * @param {String} type The name of a Rally WSAPI model type (e.g. 'userstory')
    * @param {String/Number} objectID The unique identifier for the object to be deleted
    * @return {Rally.mock.AjaxBuilder} A new instance configured to mock WSAPI deletes for the given type
    */


    AjaxBuilder.prototype.whenDeleting = function(type, objectID, wsapiResponse) {
      var builder;
      if (wsapiResponse == null) {
        wsapiResponse = true;
      }
      if (objectID == null) {
        throw new Error('AjaxBuilder.whenDeleting, objectID parameter is required');
      }
      builder = this._when(type, 'delete');
      builder.objectID = objectID;
      builder.notWsapi = !wsapiResponse;
      return builder;
    };

    /**
    * Provides a successful response for the mocked-out Ajax request
    * @param {Array/Object} [results] Objects to be returned in the response.
    * For queries, this should be an Array and defaults to an empty Array.
    * For reads and updates, this should be a single Object and defaults to an empty Object.
    * For deletes, this parameter should not be used
    * @param {Object} [options]
    * @param {Object} [options.schema] Supply this value to be included as the Schema property of the QueryResult in the response
    * @return {sinon.stub} The stub  for returning this mocked response
    */


    AjaxBuilder.prototype.respondWith = function(results, options) {
      var count;
      if (results == null) {
        results = [];
      }
      if (options == null) {
        options = {};
      }
      if (_.isObject(results) && !this.getNotWsapi()) {
        results = [results];
      }
      options.values = results;
      count = results.length;
      if (this.getSingleObjectResponse()) {
        count = 1;
      }
      return this.respondWithCount(count, options);
    };

    AjaxBuilder.prototype.neverRespond = function() {
      return this._respondWith(null, {
        neverRespond: true
      });
    };

    AjaxBuilder.prototype.respondWithCount = function(count, options) {
      var attributeDefinition, field, me, mock, modelType, objectID, results, type, url, _ref, _ref1;
      if (options == null) {
        options = {};
      }
      me = this;
      type = this.getType();
      modelType = type;
      url = this.getUrl();
      results;
      if (this.getNotWsapi() || (typeof url.indexOf === "function" ? url.indexOf('user:current/permissions/all') : void 0) > -1) {
        results = options.values;
      } else if (this.getAllowedValues()) {
        modelType = 'AllowedAttributeValue';
        field = type.getAllowedValuesRef != null ? type : Rally.mock.data.WsapiModelFactory.getModel(type).getField(url);
        this.setUrl(field.getAllowedValuesRef());
        options.withRefs = field.attributeDefinition.AllowedValueType;
        if (options.values) {
          options.values = _.map(options.values, function(value) {
            if (_.isObject(value)) {
              return value;
            } else {
              return {
                StringValue: value
              };
            }
          });
        }
        results = Rally.mock.ModelObjectMother.getData(modelType, _.extend({
          count: count
        }, options));
      } else {
        if (url !== type) {
          attributeDefinition = Rally.mock.data.WsapiModelFactory.getModel(type).getField(Ext.String.capitalize(url)).attributeDefinition;
          modelType = ((_ref = attributeDefinition.AllowedValueType) != null ? _ref._refObjectName : void 0) || attributeDefinition.SchemaType;
        }
        objectID = this.getObjectID();
        if (objectID != null) {
          if (!((_ref1 = options.values) != null ? _ref1.length : void 0)) {
            options.values = [{}];
          }
          this._setIdAndRef(type, options.values[0], objectID);
        }
        results = Rally.mock.ModelObjectMother.getData(modelType, _.extend({
          count: count
        }, options));
      }
      if (this.getSingleObjectResponse()) {
        results = results[0];
      }
      mock = this._respondWith(results, options);
      mock.data = results;
      if (!this.getNotWsapi()) {
        mock.getRecord = function(index) {
          var Model, result;
          if (index == null) {
            index = 0;
          }
          Model = Rally.mock.data.WsapiModelFactory.getModel(type);
          result = me.getSingleObjectResponse() ? results : results[index];
          return new Model(result);
        };
        mock.getRecords = function() {
          var Model;
          Model = Rally.mock.data.WsapiModelFactory.getModel(type);
          return _.map(results, function(result) {
            return new Model(result);
          });
        };
      }
      return mock;
    };

    /**
    * Provides an unsuccessful response for the mocked-out Ajax request
    * @param {Array/String} errors One or more errors to be returned in the response
    * @return {sinon.stub} The stub  for returning this mocked response
    */


    AjaxBuilder.prototype.errorWith = function(errors) {
      if (_.isString(errors)) {
        errors = [errors];
      }
      return this._respondWith([], {
        errors: errors
      });
    };

    AjaxBuilder.prototype._respondWith = function(results, options) {
      var endpoint, interceptorFn, objectID, type, url, urlSuffix, wsapiVersion;
      if (options == null) {
        options = {};
      }
      wsapiVersion = Rally.mock.data.WsapiModelFactory.getModelClassVersion(options.version);
      url = this.getUrl();
      objectID = this.getObjectID();
      urlSuffix = wsapiVersion === 'v2.x' ? '' : '.js';
      switch (this.getVerb()) {
        case 'query':
          if (url != null) {
            options.url = "" + url + urlSuffix;
          }
          options.method = 'GET';
          interceptorFn = 'respondWithQueryResult';
          break;
        case 'read':
          options.url = url;
          if (objectID != null) {
            options.url += '/' + objectID;
          }
          options.url += urlSuffix;
          options.method = 'GET';
          interceptorFn = 'respondWithReadResult';
          break;
        case 'create':
          options.url = "" + url + "/create" + urlSuffix;
          options.method = 'PUT';
          interceptorFn = 'respondWithCreateResult';
          break;
        case 'update':
          options.url = "" + url + "/" + objectID + urlSuffix;
          options.method = 'POST';
          interceptorFn = 'respondWithUpdateResult';
          break;
        case 'updateCollection':
          type = this.getType();
          endpoint = this.endpoint;
          options.url = "" + type + "/" + objectID + "/" + url + "/" + endpoint + urlSuffix;
          options.method = 'POST';
          interceptorFn = 'respondWithUpdateResult';
          break;
        case 'delete':
          options.url = "" + url + "/" + objectID + urlSuffix;
          options.method = 'DELETE';
          results = options;
          interceptorFn = 'respondWithDeleteResult';
          break;
        case 'queryEndpoint':
          options.url = url;
          options.method = 'GET';
          options.urlMatcher = function(url1, url2) {
            return (url2 || '').toLowerCase().indexOf((url1 || '').toLowerCase()) !== -1;
          };
          interceptorFn = 'respondWithQueryResult';
          break;
        case 'readEndpoint':
          options.url = url;
          options.method = 'GET';
          options.urlMatcher = function(url1, url2) {
            return (url2 || '').toLowerCase().indexOf((url1 || '').toLowerCase()) !== -1;
          };
          interceptorFn = 'respondWithReadResult';
          break;
        case 'batchUpdate':
          options.url = url;
          options.method = 'POST';
          options.urlMatcher = function(url1, url2) {
            return (url2 || '').toLowerCase().indexOf((url1 || '').toLowerCase()) !== -1;
          };
          interceptorFn = 'respondWithJson';
      }
      return this.ajaxInterceptor[interceptorFn](results, options);
    };

    /**
    * Directly responds with an HTML response
    * @param {String} html The HTML response to be returned
    * @param {Object} [options] Optional options to configure aspects about the request/response
    * @param {Boolean} [options.success=true] Whether the query request should be considered successful
    * @param {String} [options.url] Supply a value, only if this response should only be used for requests that contain this
    * @param {String} [options.method='GET'] The HTTP request method verb to use. Possible values include: GET, POST, PUT, DELETE
    * @return {*}
    */


    AjaxBuilder.prototype.respondWithHtml = function(html, options) {
      return this.ajaxInterceptor.respondWithHtml(html, options);
    };

    AjaxBuilder.prototype._when = function(type, verb, url) {
      var builder;
      if (url == null) {
        url = type;
      }
      builder = new Rally.mock.AjaxBuilder(this.ajaxInterceptor);
      builder.type = type;
      builder.url = url;
      builder.verb = verb;
      return builder;
    };

    AjaxBuilder.prototype._setIdAndRef = function(type, obj, id) {
      obj.ObjectID = id;
      return obj._ref = "/" + type + "/" + id;
    };

    AjaxBuilder.prototype._coerceType = function(value) {
      if (value == null) {
        value = '';
      }
      if ((typeof value.toLowerCase === "function" ? value.toLowerCase() : void 0) === 'userstory') {
        return 'hierarchicalrequirement';
      } else {
        return value;
      }
    };

    return AjaxBuilder;

  })();

}).call(this);
