(function() {
    var _ = require('underscore');
    var BatchSender = require('./batchSender');

    // The default for max number of errors we will send per session.
    // In ALM, a session is started for each page visit.
    var DEFAULT_ERROR_LIMIT = 25;

    // bookkeeping properties that are set on components being measured
    var _currentEventId = '__clientMetricsCurrentEventId__';
    var _metricsIdProperty = '__clientMetricsID__';
    var _ajaxRequestId = '__clientMetricsAjaxRequestId__';

    /**
     * @class RallyMetrics.ClientMetricsAggregator
     * An aggregator that listens to all client metric related messages that go out on
     * the message bus and creates a cohesive picture of what is happening, then pushes
     * this data out to an endpoint which collects the data for analysis
     *
     * ##Aggregator specific terminology##
     *
     * * **event:** A distinct, measurable thing that the page did or the user invoked. For example, clicking on a button,
     * a panel loading, or a grid resorting are all events
     * * **handler:** A helper object that helps the aggregator identify where events came from.
     * * **status:** What was the ultimate fate of an event? If a panel fully loads and becomes fully usable, the event associated
     * with the panel load will have the status of "Ready". If the user navigates away from the page before the panel
     * finishes loading, the associated event's conclusion will be "Navigation". Current conclusion values are:
     *     - Ready: the event concluded normally
     *     - Navigation: the user navigated away before the event could complete
     *     - Timeout: (Not yet implemented), indicates a load event took too long
     *
     *
     *  NOTE: space is an issue when sending the bundle of data out. So most properties are short acronyms:
     *  * bts -- browser time stamp
     *  * tabId -- the browser tab ID
     *  * tId -- trace ID
     *  * eId -- event ID
     *  * pId -- parent ID
     *  * eType -- event type (ie load, action or dataRequest)
     *  * eDesc -- event description
     *  * cmpType -- component type
     *  * cmpId -- component ID
     *
     * @constructor
     * @param {Object} config Configuration object
     * @param {Object[]} [config.ajaxProviders] Ajax providers that emit the following events:
     *   * beforerequest - When an Ajax request is about to be made
     *   * requestcomplete - When an Ajax request has finished
     * @param {Object} [config.sender = BatchSender] Which sender to use. By default,
     *   a BatchSender will be used.
     * @param {Number} [config.flushInterval] If defined, events will be sent at least that often.
     * @param {String} [config.beaconUrl = "https://trust.rallydev.com/beacon/"] URL where the beacon is located.
     */
    var ClientMetricsAggregator = function(config) {
        _.extend(this, config);

        if (_.isArray(config.ajaxProviders)) {
            _.each(config.ajaxProviders, function(provider) {
                provider.on('beforerequest', this.beginDataRequest, this);
                provider.on('requestcomplete', this.endDataRequest, this);
            }, this);
        }

        this._pendingEvents = [];
        this._browserTabId = this._getUniqueId();
        this._startingTime = new Date().getTime();

        // keep track of how many errors we have reported on, so we
        // can stop after a while and not flood the beacon
        this._errorCount = 0;
        this.errorLimit = this.errorLimit || DEFAULT_ERROR_LIMIT;

        this.handlers = this.handlers || [];

        this.sender = this.sender || new BatchSender({
            keysToIgnore: [ 'cmp' ],
            beaconUrl: config.beaconUrl
        });

        if (_.isFunction(this.sender.getMaxLength)) {
            this.maxErrorLength = Math.floor(this.sender.getMaxLength() * 0.9);
        }

        if (_.isNumber(this.flushInterval)) {
            this._flushIntervalId = window.setInterval(_.bind(this.sendAllRemainingEvents, this), this.flushInterval);
        }
    };

    _.extend(ClientMetricsAggregator.prototype, {

        destroy: function() {
            if (this._flushIntervalId) {
                window.clearInterval(this._flushIntervalId);
            }
        },

        /**
         * Handles the starting of a new "session"
         * Finishes and sends off pending events with a Navigation status
         * Resets current parent events queue, starting time, and current hash
         * Calls a new navigation user action
         * @param status the event's status for each of the pending events
         * @param defaultParams Default parameters that are sent with each request
         */
        startSession: function(status, defaultParams) {
            this._concludePendingEvents(status);
            this.sendAllRemainingEvents();
            this._defaultParams = defaultParams;

            this._errorCount = 0;
        },

        /**
         * Handles the action client metrics message. Starts and completes a client metric event
         */
        recordAction: function(opts, eOpts) {
            options = this._translateMessageVersion(arguments);

            var cmp = options.component;
            delete options.component;
            var eventId = this._getUniqueId();
            var startTime = this._convertToRelativeTime(options.startTime || new Date().getTime());

            var action = this._startEvent(_.defaults({
                eType: 'action',
                cmp: cmp,
                cmpH: this._getHierarchyString(cmp),
                eDesc: options.description,
                cmpId: this._getComponentId(cmp),
                eId: eventId,
                tId: eventId,
                status: 'Ready',
                cmpType: this._getFromHandlers(cmp, 'getComponentType'),
                start: startTime
            }, options.miscData));

            this._currentUserActionEventId = action.eId;

            this._finishEvent(action, {
                stop: startTime
            });
        },

        recordError: function(errorInfo) {
            if (this._currentUserActionEventId && this._errorCount < this.errorLimit) {
                ++this._errorCount;

                var errorMsg = errorInfo || 'unknown error';
                if (this.maxErrorLength) {
                    errorMsg = errorMsg.substring(0, this.maxErrorLength);
                }

                var startTime = this._getRelativeTime();

                var errorEvent = this._startEvent({
                    eType: 'error',
                    error: errorMsg,
                    eId: this._getUniqueId(),
                    tId: this._currentUserActionEventId,
                    start: startTime
                });

                this._finishEvent(errorEvent, {
                    stop: startTime
                });

                // dont want errors to get left behind in the batch, force it to be sent now
                this.sendAllRemainingEvents();
            }
        },

        /**
         * Handles the beginLoad client metrics message. Starts an event
         */
        beginLoad: function(opts, eOpts) {
            options = this._translateMessageVersion(arguments);

            var cmp = options.component;
            delete options.component;
            if (!this._currentUserActionEventId) {
                return;
            }

            if (cmp[_currentEventId + 'load']) {
                // already an in flight load event, so going to bail on this one
                return;
            }

            var startTime = this._convertToRelativeTime(options.startTime || new Date().getTime());

            var eventId = this._getUniqueId();
            cmp[_currentEventId + 'load'] = eventId;

            var event = _.defaults({
                eType: 'load',
                cmp: cmp,
                cmpH: this._getHierarchyString(cmp),
                eDesc: options.description,
                cmpId: this._getComponentId(cmp),
                eId: eventId,
                cmpType: this._getFromHandlers(cmp, 'getComponentType'),
                tId: this._currentUserActionEventId,
                pId: this._findParentId(cmp, this._currentUserActionEventId),
                start: startTime
            }, options.miscData);
            this._startEvent(event);
        },

        /**
         * Handles the endLoad client metrics message. Finishes an event
         */
        endLoad: function(opts) {
            options = this._translateMessageVersion(arguments);

            var cmp = options.component;
            delete options.component;
            if (!this._currentUserActionEventId) {
                return;
            }

            var eventId = cmp[_currentEventId + 'load'];

            if (!eventId) {
                // load end found without a load begin, not much can be done with it
                return;
            }

            delete cmp[_currentEventId + 'load'];

            var event = this._findPendingEvent(eventId);

            if (!event) {
                // if we didn't find a pending event, then the load begin happened before the
                // aggregator was ready or a new session was started. Since this load is beyond the scope of the aggregator,
                // just ignoring it.
                return;
            }

            options.stop = this._convertToRelativeTime(options.stopTime || new Date().getTime());

            this._finishEvent(event, _.extend({
                status: 'Ready'
            }, options));
        },

        /**
         * Handler for before Ajax requests go out. Starts an event for the request,
         * Adds headers to the ajax request that links the request with the client metrics data
         */
        beginDataRequest: function(connection, options) {
            var requester = this._findRequester(connection, options);

            if (requester && this._currentUserActionEventId) {
                var eventId = this._getUniqueId();
                var traceId = this._currentUserActionEventId;
                var parentId = this._findParentId(requester, this._currentUserActionEventId);
                var ajaxRequestId = this._getUniqueId();
                options[_ajaxRequestId] = ajaxRequestId;
                requester[_currentEventId + 'dataRequest' + ajaxRequestId] = eventId;

                this._startEvent({
                    eType: 'dataRequest',
                    cmp: requester,
                    cmpH: this._getHierarchyString(requester),
                    url: this._getUrl(options.url),
                    cmpType: this._getFromHandlers(requester, 'getComponentType'),
                    cmpId: this._getComponentId(requester),
                    eId: eventId,
                    tId: traceId,
                    pId: parentId
                });

                // NOTE: this looks wrong, but it's not
                // This client side dataRequest event is going to be
                // the "parent" of the server side event that responds.
                // So in the request headers, sending the current event Id as
                // the parent Id.
                connection.defaultHeaders = {
                    'X-Trace-Id': traceId,
                    'X-Parent-Id': eventId
                };
            } else {
                connection.defaultHeaders = {};
            }
        },

        /**
         * handler for after the Ajax request has finished. Finishes an event for the data request
         */
        endDataRequest: function(connection, response, options) {
            var requester = this._findRequester(connection, options);

            if (requester && this._currentUserActionEventId) {
                var ajaxRequestId = options[_ajaxRequestId];

                var eventId = requester[_currentEventId + 'dataRequest' + ajaxRequestId];

                var event = this._findPendingEvent(eventId);
                if (!event) {
                    // if we didn't find a pending event, then the request started before the
                    // aggregator was ready or a new session was started. Since this load is beyond the scope of the aggregator,
                    // just ignoring it.
                    return;
                }
                
                var newEventData = {
                    status: 'Ready'
                };
                var rallyRequestId = this._getRallyRequestId(response);

                if (rallyRequestId) {
                    newEventData.rallyRequestId = rallyRequestId;
                }

                this._finishEvent(event, newEventData);
            }
        },

        /**
         * Causes the sender to purge all events it may still have in its queue.
         * Typically done when the user navigates somewhere
         */
        sendAllRemainingEvents: function() {
            this.sender.flush();
        },

        /**
         * Creates a version 4 UUID
         */
        _getUniqueId: function() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
                return v.toString(16);
            });
        },

        /**
         * Gets the current timestamp relative to the starting time
         */
        _getRelativeTime: function() {
            return this._convertToRelativeTime(new Date().getTime());
        },

        /**
         * Converts a timestamp relative to the starting time
         * @param {Number} timestamp Timestamp to be converted
         */
        _convertToRelativeTime: function(timestamp) {
            return timestamp - this._startingTime;
        },

        /**
         * Finishes an event object by completing necessary event properties
         * Adds this event object to the finished event queue
         * Sends finished events before clearing the finished events queue
         * @param existingEvent the event object that has started
         * @param newEventData an object with event properties to append if
         * it doesn't already exist on the event
         */
        _finishEvent: function(existingEvent, newEventData) {
            var stop = this._getRelativeTime();

            var event = _.defaults(
                {},
                existingEvent,
                newEventData,
                {
                    stop: stop
                },
                this._defaultParams,
                this._guiTestParams
            );

            this._pendingEvents = _.without(this._pendingEvents, existingEvent);

            this.sender.send([event]);
        },

        /**
         * Starts an event object by completing necessary event properties
         * Adds this new event object to the pending and current parent event queue
         * @param event the event object with event properties
         */
        _startEvent: function(event) {
            event.bts = new Date().getTime();
            event.tabId = this._browserTabId;

            if (!_.isNumber(event.start)) {
                event.start = this._getRelativeTime();
            }

            if (event.cmp) {
                var appName = this._getFromHandlers(event.cmp, 'getAppName');

                if (appName) {
                    event.appName = appName;
                }
            }

            this._pendingEvents.push(event);

            return event;
        },

        /**
         * Determines which handler (Ext4/Legacy Dashboard) to use for the requested method
         * @param cmp the component parameter used for the handler's method
         * @param methodName the method being requested
         */
        _getFromHandlers: function(cmp, methodName) {
            var result = null;

            _.each(this.handlers, function(handler) {
                result = handler[methodName](cmp);
                return !result;
            });

            return result;
        },

        /**
         * Finds the parent's event ID
         * @param sourceCmp the component to get the parent's event ID for
         */
        _findParentId: function(sourceCmp, traceId) {
            var hierarchy = this._getFromHandlers(sourceCmp, 'getComponentHierarchy') || [];
            var eventId = traceId;

            _.each(hierarchy, function(cmp) {
                parentEvent = _.findLast(this._pendingEvents, function(event) {
                    return event.eType !== 'dataRequest' && (event.cmp === cmp || event.cmp === sourceCmp) && event.tId === traceId;
                });
                if (parentEvent) {
                    eventId = parentEvent.eId;
                    return false;
                }
            }, this);

            return eventId;
        },

        /**
         * Sets the metrics Id property for the component with a generated uuid
         * @param cmp the component to get an ID for
         */
        _getComponentId: function(cmp) {
            if (!cmp[_metricsIdProperty]) {
                cmp[_metricsIdProperty] = this._getUniqueId();
            }

            return cmp[_metricsIdProperty];
        },

        _getHierarchyString: function(cmp) {
            var hierarchy = this._getFromHandlers(cmp, 'getComponentHierarchy');

            if (!hierarchy) {
                return 'none';
            }

            var names = _.map(hierarchy, function(h) {
                return this._getFromHandlers(h, 'getComponentType');
            }, this);

            return _.compact(names).join(':');
        },

        _translateMessageVersion: function(messageArgs) {
            messageArgs = _.toArray(messageArgs);

            var firstParamIsAComponent = !!this._getFromHandlers(messageArgs[0], 'getComponentType');

            if (firstParamIsAComponent && _.isString(messageArgs[1])) {
                // very old message: received [cmp, description, miscdata, eOpts]
                return {
                    component: messageArgs[0],
                    description: messageArgs[1],
                    miscData: messageArgs[2] || {}
                };
            } else if (firstParamIsAComponent && messageArgs[1] && _.isString(messageArgs[1].description)) {
                // intermediate message: received [cmp, options, eOpts]
                return _.extend(messageArgs[1], {
                    component: messageArgs[0]
                });
            } else if (firstParamIsAComponent) {
                // old format for endLoad: received [cmp, eOpts]
                return {
                    component: messageArgs[0]
                };
            } else {
                // new style message: received [options, eOpts]
                return messageArgs[0];
            }
        },

        /**
         * Finds the requester, if any, for the related data request objects
         */
        _findRequester: function(connection, options) {
            return options.requester || connection.requester || (options.operation && options.operation.requester);
        },

        /**
         * Massages the AJAX url into a smaller form. Strips away the host and query
         * parameters.
         *
         * Example: http://server/slm/webservice/1.27/Defect.js?foo=bar&baz=buzz
         * becomes 1.27/Defect.js
         * @param url The url to clean up
         */
        _getUrl: function(url) {
            if (!url) {
                return "unknown";
            }

            var webserviceSlug = 'webservice/';
            var webserviceIndex = url.indexOf(webserviceSlug);
            var questionIndex;

            if (webserviceIndex > -1) {
                questionIndex = url.indexOf('?', webserviceIndex);

                if (questionIndex < 0) {
                    questionIndex = url.length;
                }

                var skip = webserviceSlug.length;
                return url.substring(webserviceIndex + skip, questionIndex);
            } else {
                questionIndex = url.indexOf('?');

                if (questionIndex < 0) {
                    return url;
                }

                return url.substring(0, questionIndex);
            }
        },

        /**
         * Finds the RallyRequestId, if any, in the response sent back from the server
         * @param response the response that came back from an Ajax request
         */
        _getRallyRequestId: function(response) {
            return response && response.getResponseHeader && response.getResponseHeader.RallyRequestID;
        },

        /**
         * Finds an event withing the pending events queue if one exists
         * @param eventId the event's ID used to find a match within the pending events
         */
        _findPendingEvent: function(eventId) {
            return _.find(this._pendingEvents, {eId: eventId});
        },

        /**
         * Loops through each pending event and finishes the event
         * @param status the event's status for each of the pending events
         */
        _concludePendingEvents: function(status) {
            var pendingEvents = this._pendingEvents,
                now = this._getRelativeTime(),
                newEventData = {status: status, stop: now};
            _.each(pendingEvents, function(event) {
                this._finishEvent(event, newEventData);
            }, this);
        }
    });

    module.exports = ClientMetricsAggregator;
})();
