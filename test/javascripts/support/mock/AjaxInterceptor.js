/**
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
*/


(function() {
  var AjaxInterceptor, MockResponse;

  if (Rally.mock == null) {
    Rally.mock = {};
  }

  Rally.mock.AjaxInterceptor = AjaxInterceptor = (function() {
    /*
     * @property stub A stub of the Ext.Ajax.request function
    */

    /*
     * @property ext2stub A stub of the Ext2 Ext.lib.Ajax.request function
    */

    /*
     * @constructor
     * @param testCase The TestCase instance to mock Ajax requests for.
     * This Test Case must have the sinon.sandbox methods injected into it
    */

    function AjaxInterceptor(testCase) {
      this.testCase = testCase;
      this._mockResponses = [];
    }

    AjaxInterceptor.prototype.statics = {
      emptyResponses: {
        'GET': {
          "QueryResult": {
            "TotalResultCount": 0,
            "StartIndex": 1,
            "PageSize": 200,
            "Results": [],
            "Errors": [],
            "Warnings": []
          }
        },
        'POST': {
          "OperationResult": {
            "_rallyAPIMajor": "1",
            "_rallyAPIMinor": "34",
            "Errors": [],
            "Warnings": [],
            "Object": {}
          }
        },
        'DELETE': {
          "OperationResult": {
            "_rallyAPIMajor": "1",
            "_rallyAPIMinor": "34",
            "Errors": [],
            "Warnings": []
          }
        },
        'PUT': {
          "CreateResult": {
            "_rallyAPIMajor": "1",
            "_rallyAPIMinor": "34",
            "Errors": [],
            "Warnings": [],
            "Object": {}
          }
        }
      }
    };

    /*
     * Sets up a mock Ajax response returning HTML
     * @param {String} html The HTML to be returned
     * @param {Object} [options] Optional options to configure aspects about the request/response
     * @param {Boolean} [options.success=true] Whether the query request should be considered successful
     * @param {String} [options.url] Supply a value, only if this response should only be used for requests that contain this
     * @param {String} [options.method='GET'] The HTTP request method verb to use. Possible values include: GET, POST, PUT, DELETE
     * @return {sinon.stub} The stub function for returning this mocked response
    */


    AjaxInterceptor.prototype.respondWithHtml = function(html, options) {
      if (options == null) {
        options = {};
      }
      return this._mock(html, options.success, options, options.method || 'GET');
    };

    /*
     * Sets up a mock Ajax response returning JSON
     * @param {Object} json The JSON to be returned
     * @param {Object} [options] Optional options to configure aspects about the request/response
     * @param {Boolean} [options.success=true] Whether the query request should be considered successful
     * @param {String} [options.url] Supply a value, only if this response should only be used for requests that contain this
     * @param {String} [options.method='GET'] The HTTP request method verb to use. Possible values include: GET, POST, PUT, DELETE
     * @return {sinon.stub} The stub function for returning this mocked response
    */


    AjaxInterceptor.prototype.respondWithJson = function(json, options) {
      if (options == null) {
        options = {};
      }
      return this._mock(json, options.success, options, options.method || 'GET');
    };

    /*
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
    */


    AjaxInterceptor.prototype.respondWithQueryResult = function(data, options) {
      var response, success;
      if (data == null) {
        data = [];
      }
      if (options == null) {
        options = {};
      }
      response = {
        "QueryResult": {
          "TotalResultCount": options.totalResultCount || data.length,
          "StartIndex": 1,
          "PageSize": 200,
          "Results": data,
          "Errors": options.errors || [],
          "Warnings": options.warnings || []
        }
      };
      if (options.schema) {
        response.QueryResult.Schema = options.schema;
      }
      success = this._getSuccess(options);
      return this._mock(response, success, options, 'GET');
    };

    /*
     * Sets up a mock response to a WSAPI POST request to update a single object
     * @param {Object} [data={}] Fields to be returned as the updated model
     * @param {Object} [options] Optional options to configure aspects about the request/response
     * @param {Array} [options.errors=[]] Errors to be returned due to unsuccessful update
     * @param {Array} [options.warnings=[]] Warnings to be returned despite successful update
     * @param {Boolean} [options.success=true] Whether the update should be considered successful
     * @param {String} [options.url] Supply a value, only if this response should only be used for requests that contain this
     * @return {sinon.stub} The stub function for returning this mocked response
    */


    AjaxInterceptor.prototype.respondWithUpdateResult = function(data, options) {
      var response, success;
      if (data == null) {
        data = {};
      }
      if (options == null) {
        options = {};
      }
      response = {
        "OperationResult": {
          "_rallyAPIMajor": "1",
          "_rallyAPIMinor": "34",
          "Errors": options.errors || [],
          "Warnings": options.warnings || [],
          "Object": data
        }
      };
      success = this._getSuccess(options);
      return this._mock(response, success, options, 'POST');
    };

    /*
     * Sets up a mock response to a WSAPI DELETE request to delete a single object
     * @param {Object} [options] Optional options to configure aspects about the request/response
     * @param {Array} [options.errors=[]] Errors to be returned due to unsuccessful delete
     * @param {Array} [options.warnings=[]] Warnings to be returned despite successful delete
     * @param {Boolean} [options.success=true] Whether the delete should be considered successful
     * @param {String} [options.url] Supply a value, only if this response should only be used for requests that contain this
     * @return {sinon.stub} The stub function for returning this mocked response
    */


    AjaxInterceptor.prototype.respondWithDeleteResult = function(options) {
      var response, success;
      if (options == null) {
        options = {};
      }
      response = {
        "OperationResult": {
          "_rallyAPIMajor": "1",
          "_rallyAPIMinor": "34",
          "Errors": options.errors || [],
          "Warnings": options.warnings || []
        }
      };
      success = this._getSuccess(options);
      return this._mock(response, success, options, 'DELETE');
    };

    /*
     * Sets up a mock response to a WSAPI PUT create request
     * @param {Object} [data={}] Fields to be returned as the created model
     * @param {Object} [options] Optional options to configure aspects about the request/response
     * @param {Array} [options.errors=[]] Errors to be returned due to unsuccessful save
     * @param {Array} [options.warnings=[]] Warnings to be returned despite successful save
     * @param {Boolean} [options.success=true] Whether the create should be considered successful
     * @param {String} [options.url] Supply a value, only if this response should only be used for requests that contain this
     * @return {sinon.stub} The stub function for returning this mocked response
    */


    AjaxInterceptor.prototype.respondWithCreateResult = function(data, options) {
      var response, success;
      if (data == null) {
        data = {};
      }
      if (options == null) {
        options = {};
      }
      response = {
        "CreateResult": {
          "_rallyAPIMajor": "1",
          "_rallyAPIMinor": "34",
          "Errors": options.errors || [],
          "Warnings": options.warnings || [],
          "Object": data
        }
      };
      success = this._getSuccess(options);
      return this._mock(response, success, options, 'PUT');
    };

    /*
     * Sets up a mock response to a WSAPI GET request to read a single object
     * @param {Object} [data={}] Fields to be returned as the read model
     * @param {Object} [options] Optional options to configure aspects about the request/response
     * @param {Array} [options.errors=[]] Errors to be returned due to unsuccessful save
     * @param {Array} [options.warnings=[]] Warnings to be returned despite successful save
     * @param {Boolean} [options.success=true] Whether the create should be considered successful
     * @param {String} [options.url] Supply a value, only if this response should only be used for requests that contain this
     * @return {sinon.stub} The stub function for returning this mocked response
    */


    AjaxInterceptor.prototype.respondWithReadResult = function(data, options) {
      if (data == null) {
        data = {};
      }
      if (options == null) {
        options = {};
      }
      data = Ext.apply({
        Errors: options.errors || [],
        Warnings: options.warnings || []
      }, data);
      return this._mock([data], options.success, options, 'GET');
    };

    AjaxInterceptor.prototype._mock = function(response, success, options, method, queryParams) {
      var mock, mockConfig, sendResponse, _mockResponses,
        _this = this;
      if (success == null) {
        success = true;
      }
      if (options == null) {
        options = {};
      }
      _mockResponses = this._mockResponses;
      mockConfig = {
        url: options.url,
        method: method,
        queryParams: queryParams,
        urlMatcher: options.urlMatcher,
        neverRespond: options.neverRespond
      };
      mock = this._findExistingMock(mockConfig);
      if (mock) {
        mock.reinitialize(this.testCase, success, response, mockConfig);
      } else {
        mock = new MockResponse(this.testCase, success, response, mockConfig);
        this._addMockResponse(mock);
      }
      sendResponse = function(config, ext2Options) {
        var callbackMethod, mockResponse, responseText;
        config.method || (config.method = 'GET');
        mockResponse = _this._getMockResponseForRequest(config);
        if (mockResponse != null) {
          responseText = mockResponse.getResponse(config);
          success = mockResponse.success;
        } else {
          responseText = _this._getEmptyResponse(config.method);
        }
        response = {
          responseText: responseText,
          argument: {
            options: ext2Options
          }
        };
        callbackMethod = success ? config.success : config.failure;
        if (!(mockResponse != null ? mockResponse.neverRespond : void 0)) {
          callbackMethod.apply(config.scope, [response, config]);
        }
        if (!ext2Options) {
          success = mockResponse ? mockResponse.success : true;
          if (!(mockResponse != null ? mockResponse.neverRespond : void 0)) {
            return config.callback.apply(config.scope, [config, success, response]);
          }
        }
      };
      if (!this.ext4Stub) {
        this.stub = this.ext4Stub = this.testCase.stub(Ext.data.Connection.prototype, 'request', sendResponse);
        if (Ext2) {
          this.ext2Stub = this.testCase.stub(Ext2.lib.Ajax, 'request', function(method, url, options, params, o) {
            return sendResponse.apply(this, [
              _.extend({
                method: method,
                url: url,
                params: params
              }, options), o
            ], 1);
          });
        }
      }
      return mock.getResponse;
    };

    AjaxInterceptor.prototype.restoreStub = function() {
      var _ref, _ref1, _ref2;
      if ((_ref = this.ext4Stub) != null) {
        _ref.restore();
      }
      this.ext4Stub = null;
      if ((_ref1 = this.ext4JsonPStub) != null) {
        _ref1.restore();
      }
      this.ext4JsonPStub = null;
      if ((_ref2 = this.ext2Stub) != null) {
        _ref2.restore();
      }
      this.ext2Stub = null;
      return this.removeAllMockResponses();
    };

    AjaxInterceptor.prototype.removeAllMockResponses = function() {
      return this._mockResponses = [];
    };

    AjaxInterceptor.prototype.removeMockResponse = function(config) {
      return _.each(this._mockResponses, function(_mockResponse, i) {
        if (_mockResponse.matchesRequest(config)) {
          this._mockResponses.splice(i, 1);
          return false;
        }
      }, this);
    };

    AjaxInterceptor.prototype._findExistingMock = function(mock) {
      return _.find(this._mockResponses, function(response) {
        return response.url === mock.url && response.method === mock.method;
      });
    };

    AjaxInterceptor.prototype._addMockResponse = function(mock) {
      this._mockResponses.push(mock);
      return this._mockResponses.sort(function(a, b) {
        return b.url.length - a.url.length;
      });
    };

    AjaxInterceptor.prototype._getMockResponseForRequest = function(config) {
      var mockResponse;
      mockResponse = null;
      _.each(this._mockResponses, function(_mockResponse) {
        if (_mockResponse.matchesRequest(config)) {
          mockResponse = _mockResponse;
          return false;
        }
      });
      return mockResponse;
    };

    AjaxInterceptor.prototype._getEmptyResponse = function(method) {
      return JSON.stringify(Rally.mock.AjaxInterceptor.emptyResponses[method]);
    };

    AjaxInterceptor.prototype._getSuccess = function(options) {
      if (options.success != null) {
        return options.success;
      } else {
        return !_.isArray(options.errors);
      }
    };

    return AjaxInterceptor;

  })();

  MockResponse = (function() {
    function MockResponse(testCase, success, response, config) {
      if (config == null) {
        config = {};
      }
      this.reinitialize(testCase, success, response, config);
    }

    MockResponse.prototype.reinitialize = function(testCase, success, response, config) {
      if (config == null) {
        config = {};
      }
      this.success = success;
      this.url = config.url;
      this.method = config.method;
      this.queryParams = config.queryParams;
      this.urlMatcher = config.urlMatcher;
      this.getResponse = testCase.stub().returns(_.isString(response) ? response : JSON.stringify(response));
      return this.neverRespond = config.neverRespond;
    };

    MockResponse.prototype.matchesRequest = function(config) {
      return this._matchesUrl(config.url) && this._matchesMethod(config.method);
    };

    MockResponse.prototype._matchesUrl = function(url) {
      if (this.urlMatcher) {
        return this.urlMatcher(this.url, url);
      }
      return !!(url.split('?')[0]).toLowerCase().match(new RegExp(this.url.toLowerCase() + 's*(\.js)?$'));
    };

    MockResponse.prototype._matchesMethod = function(method) {
      return this.method === method;
    };

    return MockResponse;

  })();

}).call(this);
