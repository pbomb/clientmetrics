(function() {
  var AjaxProvider, Panel;

  Panel = (function() {
    function Panel(parent) {
      this.parent = parent;
      this.children = [];
      this.name = 'Panel';
    }

    Panel.prototype.add = function(config) {
      var child;
      child = new Panel(this);
      this.children.push(child);
      return child;
    };

    Panel.prototype.getComponentHierarchy = function() {
      var cmp, hierarchy;
      hierarchy = [this];
      cmp = this;
      while (cmp.parent) {
        cmp = cmp.parent;
        hierarchy.push(cmp);
      }
      return hierarchy;
    };

    return Panel;

  })();

  AjaxProvider = (function() {
    function AjaxProvider(spec) {
      this.spec = spec;
      this.events = {};
    }

    AjaxProvider.prototype.request = function(options) {
      var response;
      this.spec.connection = this;
      _.extend(this, options);
      this.fireEvent("beforerequest", this, options);
      response = {
        getResponseHeader: {
          RallyRequestID: this.spec.rallyRequestId
        }
      };
      return this.fireEvent("requestcomplete", this, response, options);
    };

    AjaxProvider.prototype.on = function(event, fn, scope) {
      return this.events[event] = {
        fn: fn,
        scope: scope
      };
    };

    AjaxProvider.prototype.fireEvent = function(event) {
      var ev;
      ev = this.events[event];
      if (ev) {
        return ev.fn.apply(ev.scope || this, _.toArray(arguments).slice(1));
      }
    };

    return AjaxProvider;

  })();

  describe("RallyMetrics.ClientMetricsAggregator", function() {
    beforeEach(function() {
      this.ajaxProvider = new AjaxProvider(this);
      this.rallyRequestId = 123456;
      return this.spy(this.ajaxProvider, "request");
    });
    helpers({
      recordAction: function(aggregator, cmp, description) {
        if (description == null) {
          description = "an action";
        }
        if (cmp == null) {
          cmp = new Panel();
        }
        aggregator.recordAction({
          component: cmp,
          description: description
        });
        return cmp;
      },
      beginLoad: function(aggregator, cmp, description, miscData) {
        if (description == null) {
          description = 'an action';
        }
        if (miscData == null) {
          miscData = {};
        }
        if (cmp == null) {
          cmp = new Panel();
        }
        aggregator.beginLoad({
          component: cmp,
          description: description,
          miscData: miscData
        });
        return cmp;
      },
      endLoad: function(aggregator, cmp) {
        if (cmp == null) {
          cmp = new Panel();
        }
        aggregator.endLoad({
          component: cmp
        });
        return cmp;
      },
      recordError: function(aggregator, errorMessage) {
        if (errorMessage == null) {
          errorMessage = 'an error';
        }
        aggregator.recordError(errorMessage);
        return errorMessage;
      },
      startSession: function(aggregator, status, defaultParams) {
        if (status == null) {
          status = "a status";
        }
        if (defaultParams == null) {
          defaultParams = {};
        }
        aggregator.startSession(status, defaultParams);
        return {
          status: status,
          defaultParams: defaultParams
        };
      },
      createAggregator: function(config) {
        var aggregatorConfig, handler;
        if (config == null) {
          config = {};
        }
        handler = {
          getAppName: this.stub().returns('testAppName'),
          getComponentType: function(cmp) {
            if (cmp.name) {
              return cmp.name;
            } else {
              return false;
            }
          },
          getComponentHierarchy: function(cmp) {
            if (_.isFunction(cmp.getComponentHierarchy)) {
              return cmp.getComponentHierarchy();
            } else {
              return false;
            }
          }
        };
        aggregatorConfig = _.defaults(config, {
          sender: this.createSender(),
          handlers: [handler],
          ajaxProviders: [this.ajaxProvider]
        });
        return new RallyMetrics.ClientMetricsAggregator(aggregatorConfig);
      },
      createSender: function() {
        var me;
        this.sentEvents = [];
        me = this;
        return {
          send: function(events) {
            return me.sentEvents = me.sentEvents.concat(events);
          }
        };
      },
      setupAggregator: function() {
        var aggregator;
        aggregator = this.createAggregator();
        this.recordAction(aggregator);
        return aggregator;
      },
      findActionEvent: function() {
        return _.find(this.sentEvents, {
          eType: 'action'
        });
      },
      findLoadEvent: function() {
        return _.find(this.sentEvents, {
          eType: 'load'
        });
      },
      findDataEvent: function() {
        return _.find(this.sentEvents, {
          eType: 'dataRequest'
        });
      }
    });
    describe('flushInterval', function() {
      afterEach(function() {
        var _ref;
        return (_ref = this.aggregator) != null ? _ref.destroy() : void 0;
      });
      return it('should flush on the specified interval', function() {
        var sendEventsSpy, start;
        sendEventsSpy = this.spy(RallyMetrics.ClientMetricsAggregator.prototype, 'sendAllRemainingEvents');
        start = new Date().getTime();
        this.aggregator = this.createAggregator({
          flushInterval: 10
        });
        return once({
          condition: function() {
            return sendEventsSpy.callCount > 2;
          },
          description: 'waiting for flush to happen more than twice'
        }).then(function() {
          var stop;
          stop = new Date().getTime();
          return expect(stop - start).toBeGreaterThan(20);
        });
      });
    });
    describe('startSession message', function() {
      return it("should start a new session", function() {
        var aggregator, defaultParams, startNewSessionStub, status;
        aggregator = this.createAggregator();
        startNewSessionStub = this.stub(aggregator, "startNewSession");
        status = 'a status';
        defaultParams = {
          foo: 'bar'
        };
        this.startSession(aggregator, status, defaultParams);
        return expect(startNewSessionStub).toHaveBeenCalledWith(status, defaultParams);
      });
    });
    describe('data requests', function() {
      it("should trim the request url correctly", function() {
        var dataEvent, entireUrl, expectedUrl;
        this.setupAggregator();
        expectedUrl = "3.14/Foo.js";
        entireUrl = "http://localhost/testing/webservice/" + expectedUrl + "?bar=baz&boo=buzz";
        this.ajaxProvider.request({
          requester: this,
          url: entireUrl
        });
        dataEvent = this.findDataEvent();
        return expect(dataEvent.url).toEqual(expectedUrl);
      });
      it("should have the component hierarchy", function() {
        var dataEvent;
        this.setupAggregator();
        this.ajaxProvider.request({
          requester: new Panel()
        });
        dataEvent = this.findDataEvent();
        return expect(dataEvent.cmpH).toEqual("Panel");
      });
      it("appends ID properties to AJAX headers", function() {
        var actionEvent, dataEvent;
        this.setupAggregator();
        this.ajaxProvider.request({
          requester: this
        });
        actionEvent = this.findActionEvent();
        dataEvent = this.findDataEvent();
        expect(this.connection.defaultHeaders['X-Parent-Id']).toEqual(dataEvent.eId);
        return expect(this.connection.defaultHeaders['X-Trace-Id']).toEqual(actionEvent.eId);
      });
      it("does not append ID properties to AJAX headers when request is not instrumented", function() {
        this.setupAggregator();
        this.ajaxProvider.request({});
        expect(this.connection.defaultHeaders['X-Parent-Id']).toBeUndefined();
        return expect(this.connection.defaultHeaders['X-Trace-Id']).toBeUndefined();
      });
      return it("appends the rallyRequestId onto dataRequest events", function() {
        var dataEvent;
        this.setupAggregator();
        this.ajaxProvider.request({
          requester: this
        });
        dataEvent = this.findDataEvent();
        return expect(dataEvent.rallyRequestId).toEqual(this.rallyRequestId);
      });
    });
    describe('client metric event properties', function() {
      beforeEach(function() {
        var aggregator, childPanel, parentPanel;
        this.appName = "testAppName";
        parentPanel = new Panel();
        childPanel = parentPanel.add({
          xtype: "panel"
        });
        aggregator = this.createAggregator();
        this.recordAction(aggregator, parentPanel);
        this.beginLoad(aggregator, childPanel);
        this.endLoad(aggregator, childPanel);
        this.actionEvent = this.sentEvents[0];
        this.loadEvent = this.sentEvents[1];
        return this.browserTabId = aggregator._browserTabId;
      });
      it("should have trace id and event id for the action event", function() {
        expect(this.actionEvent.tId).toBeAString();
        return expect(this.actionEvent.eId).toEqual(this.actionEvent.tId);
      });
      it("should not set the parent id for the action event", function() {
        return expect(this.actionEvent.pId).toBeUndefined();
      });
      it("should put the browser tab id on the events", function() {
        expect(this.actionEvent.tabId).toEqual(this.browserTabId);
        return expect(this.loadEvent.tabId).toEqual(this.browserTabId);
      });
      it("should put the browser timestamp on the events", function() {
        expect(this.loadEvent.bts).toBeANumber();
        return expect(this.actionEvent.bts).toBeANumber();
      });
      it("should put the app name on the events", function() {
        expect(this.loadEvent.appName).toEqual(this.appName);
        return expect(this.actionEvent.appName).toEqual(this.appName);
      });
      it("should parent the load event to the action event", function() {
        expect(this.loadEvent.pId).toBeAString();
        return expect(this.loadEvent.pId).toEqual(this.actionEvent.eId);
      });
      it("should have a common trace id for all the events", function() {
        expect(this.loadEvent.tId).toBeAString();
        expect(this.actionEvent.tId).toBeAString();
        return expect(this.actionEvent.tId).toEqual(this.loadEvent.tId);
      });
      it("should have a component type for the load event", function() {
        return expect(this.loadEvent.cmpType).toBeAString();
      });
      it("should put the component hierarchy on the events", function() {
        expect(this.actionEvent.cmpH).toEqual("Panel");
        return expect(this.loadEvent.cmpH).toEqual("Panel:Panel");
      });
      it("puts start time on all events", function() {
        expect(this.actionEvent.start).toBeANumber();
        return expect(this.loadEvent.start).toBeANumber();
      });
      return it("puts stop time on the load event", function() {
        return expect(this.loadEvent.stop).toBeANumber();
      });
    });
    describe('finding traceIDs', function() {
      it("should find the correct traceId", function() {
        var aggregator, childPanel, handler, loadEvent, parentPanel, secondActionEvent;
        aggregator = this.createAggregator();
        handler = aggregator.handlers[0];
        parentPanel = new Panel();
        childPanel = parentPanel.add({
          xtype: "panel"
        });
        this.stub(handler, "getComponentHierarchy").returns([childPanel, parentPanel]);
        this.recordAction(aggregator, parentPanel);
        this.recordAction(aggregator, parentPanel);
        this.beginLoad(aggregator, childPanel);
        this.endLoad(aggregator, childPanel);
        secondActionEvent = this.sentEvents[1];
        loadEvent = this.sentEvents[2];
        return expect(loadEvent.pId).toEqual(secondActionEvent.eId);
      });
      return it("should not parent to an event that has completed", function() {
        var actionEvent, aggregator, childPanel1, childPanel1LoadEvent, childPanel2, childPanel2LoadEvent, handler, parentLoadEvent, parentPanel;
        aggregator = this.createAggregator();
        handler = aggregator.handlers[0];
        parentPanel = new Panel();
        childPanel1 = parentPanel.add({
          xtype: "panel"
        });
        childPanel2 = parentPanel.add({
          xtype: "panel"
        });
        this.stub(handler, "getComponentHierarchy", function(cmp) {
          return [cmp, parentPanel];
        });
        this.recordAction(aggregator, parentPanel);
        this.beginLoad(aggregator, parentPanel);
        this.beginLoad(aggregator, childPanel1);
        this.endLoad(aggregator, childPanel1);
        this.endLoad(aggregator, parentPanel);
        this.beginLoad(aggregator, childPanel2);
        this.endLoad(aggregator, childPanel2);
        actionEvent = this.sentEvents[0];
        parentLoadEvent = this.sentEvents[2];
        childPanel1LoadEvent = this.sentEvents[1];
        childPanel2LoadEvent = this.sentEvents[3];
        expect(parentLoadEvent.tId).toEqual(actionEvent.eId);
        expect(childPanel1LoadEvent.tId).toEqual(actionEvent.eId);
        expect(childPanel2LoadEvent.tId).toEqual(actionEvent.eId);
        expect(childPanel1LoadEvent.pId).toEqual(parentLoadEvent.eId);
        return expect(childPanel2LoadEvent.pId).toEqual(actionEvent.eId);
      });
    });
    describe('miscData', function() {
      return it("should append miscData to an event and not overwrite known properties", function() {
        var aggregator, cmp, loadEvent, miscData;
        aggregator = this.setupAggregator();
        miscData = {
          eId: "this shouldnt clobeber the real eId",
          foo: "this should get through"
        };
        cmp = this.beginLoad(aggregator, null, "a load", miscData);
        this.endLoad(aggregator, cmp);
        loadEvent = this.findLoadEvent();
        expect(loadEvent.eId).toBeAString();
        expect(loadEvent.eId).not.toEqual(miscData.eId);
        return expect(loadEvent.foo).toEqual(miscData.foo);
      });
    });
    describe('error', function() {
      it("creates an error event for error messages", function() {
        var aggregator, errorEvent, errorMessage;
        aggregator = this.createAggregator();
        this.recordAction(aggregator);
        errorMessage = this.recordError(aggregator);
        expect(this.sentEvents.length).toBe(2);
        errorEvent = this.sentEvents[1];
        expect(errorEvent.eType).toBe("error");
        return expect(errorEvent.error).toBe(errorMessage);
      });
      it("does not create an error event if the error limit has been reached", function() {
        var aggregator, errorEvent, errorMessage, i, _i, _j, _len, _ref, _results;
        aggregator = this.createAggregator({
          errorLimit: 3
        });
        this.recordAction(aggregator);
        for (i = _i = 0; _i < 5; i = ++_i) {
          errorMessage = this.recordError(aggregator);
        }
        expect(this.sentEvents.length).toBe(4);
        _ref = this.sentEvents.slice(1);
        _results = [];
        for (_j = 0, _len = _ref.length; _j < _len; _j++) {
          errorEvent = _ref[_j];
          expect(errorEvent.eType).toBe("error");
          _results.push(expect(errorEvent.error).toBe(errorMessage));
        }
        return _results;
      });
      it("resets the error count whenever a new session starts", function() {
        var aggregator;
        aggregator = this.createAggregator();
        aggregator._errorCount = 2;
        aggregator.startNewSession("newsession");
        return expect(aggregator._errorCount).toBe(0);
      });
      return it("truncates long error info", function() {
        var aggregator, errorEvent, errorMessage, i, _i;
        errorMessage = "";
        for (i = _i = 1; _i <= 1000; i = ++_i) {
          errorMessage += "uh oh";
        }
        expect(errorMessage.length).toBeGreaterThan(2000);
        aggregator = this.createAggregator();
        this.recordAction(aggregator);
        this.recordError(aggregator, errorMessage);
        expect(this.sentEvents.length).toBe(2);
        errorEvent = this.sentEvents[1];
        return expect(errorEvent.error.length).toBeLessThan(2000);
      });
    });
    describe('additional parameters', function() {
      it("should append guiTestParams to events", function() {
        var actionEvent, aggregator;
        aggregator = this.createAggregator();
        aggregator._guiTestParams = {
          foo: "bar"
        };
        this.recordAction(aggregator);
        actionEvent = this.findActionEvent();
        return expect(actionEvent.foo).toEqual("bar");
      });
      return it("should append defaultParams to events", function() {
        var actionEvent, aggregator, defaultParams, hash;
        aggregator = this.createAggregator();
        hash = "/some/hash";
        defaultParams = {
          hash: hash
        };
        aggregator.startNewSession({
          status: "Session 1",
          defaultParams: defaultParams
        });
        this.recordAction(aggregator);
        actionEvent = this.findActionEvent();
        return expect(actionEvent.hash).toEqual(hash);
      });
    });
    return describe("legacy messages", function() {
      helpers({
        recordActionWithCmpOptions: function(aggregator, cmp, description) {
          if (description == null) {
            description = "an action";
          }
          aggregator.recordAction(cmp, {
            description: description
          });
          return cmp;
        },
        beginLoadWithCmpOptions: function(aggregator, cmp, description, miscData) {
          if (description == null) {
            description = 'an action';
          }
          if (miscData == null) {
            miscData = {};
          }
          aggregator.beginLoad(cmp, {
            description: description,
            miscData: miscData
          });
          return cmp;
        },
        recordActionWithCmpUserActionMiscData: function(aggregator, cmp, description, miscData) {
          if (description == null) {
            description = "an action";
          }
          if (miscData == null) {
            miscData = {};
          }
          aggregator.recordAction(cmp, description, miscData);
          return cmp;
        },
        beginLoadWithCmpUserActionMiscData: function(aggregator, cmp, description, miscData) {
          if (description == null) {
            description = 'an action';
          }
          if (miscData == null) {
            miscData = {};
          }
          aggregator.beginLoad(cmp, description, miscData);
          return cmp;
        },
        endLoadWithCmp: function(aggregator, cmp) {
          aggregator.endLoad(cmp);
          return cmp;
        }
      });
      describe("messages that have component and options params", function() {
        beforeEach(function() {
          var aggregator, panel;
          panel = new Panel();
          aggregator = this.createAggregator();
          this.recordActionWithCmpOptions(aggregator, panel);
          this.beginLoadWithCmpOptions(aggregator, panel);
          this.endLoadWithCmp(aggregator, panel);
          this.actionEvent = this.sentEvents[0];
          return this.loadEvent = this.sentEvents[1];
        });
        return describe("action", function() {
          it("should record the action correctly", function() {
            expect(this.actionEvent.bts).toBeANumber();
            expect(this.actionEvent.tId).toBeAString();
            return expect(this.actionEvent.eId).toEqual(this.actionEvent.tId);
          });
          return it("should record the load correctly", function() {
            expect(this.loadEvent.bts).toBeANumber();
            expect(this.loadEvent.eId).toBeAString();
            expect(this.loadEvent.tId).toBeAString();
            expect(this.loadEvent.pId).toBeAString();
            return expect(this.loadEvent.pId).toEqual(this.actionEvent.eId);
          });
        });
      });
      return describe("messages that have component, description and miscData params", function() {
        beforeEach(function() {
          var aggregator, panel;
          panel = new Panel();
          aggregator = this.createAggregator();
          this.recordActionWithCmpUserActionMiscData(aggregator, panel);
          this.beginLoadWithCmpUserActionMiscData(aggregator, panel);
          this.endLoadWithCmp(aggregator, panel);
          this.actionEvent = this.sentEvents[0];
          return this.loadEvent = this.sentEvents[1];
        });
        return describe("action", function() {
          it("should record the action correctly", function() {
            expect(this.actionEvent.bts).toBeANumber();
            expect(this.actionEvent.tId).toBeAString();
            return expect(this.actionEvent.eId).toEqual(this.actionEvent.tId);
          });
          return it("should record the load correctly", function() {
            expect(this.loadEvent.bts).toBeANumber();
            expect(this.loadEvent.eId).toBeAString();
            expect(this.loadEvent.tId).toBeAString();
            expect(this.loadEvent.pId).toBeAString();
            return expect(this.loadEvent.pId).toEqual(this.actionEvent.eId);
          });
        });
      });
    });
  });

}).call(this);
