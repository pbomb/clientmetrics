(function() {
    var _ = require('underscore');

    var clientMetricsUrl = "https://trust.rallydev.com/beacon/";

    /**
     * @class Rally.clientmetrics.BatchSender
     * @private
     * A helper object for {@link Rally.clientmetrics.ClientMetricsAggregator} whose
     * job is to send the generated event objects in an efficient manner.
     *
     * It does this by batching up the requests and sends as many as it can fit into one GET
     * request.
     *
     * @constructor
     */
    var BatchSender = function(config) {
        _.defaults(this, config, {
            keysToIgnore: [],
            minLength: 0,
            maxLength: 1000,
        });
        this._eventQueue = [];
    };

    _.extend(BatchSender.prototype, {

        send: function(events, options) {
            this._cleanEvents(events);

            this._eventQueue = this._eventQueue.concat(events);

            if (options && options.purge) {
                while (this._eventQueue.length > 0) {
                    this._sendBatch();
                }
            } else {
                while (this._canSendBatch()) {
                    this._sendBatch();
                }
            }
        },

        getPendingEvents: function() {
            return this._eventQueue;
        },
        
        /**
         * Removes properties on the event objects that should not get sent out
         * on the wire. The events to remove are specified in the keysToIgnore config property
         * @param events the events to clean
         */
        _cleanEvents: function(events) {
            _.each(events, function(event) {
                _.each(this.keysToIgnore, function(key) {
                    delete event[key];
                });
            }, this);
        },

        /**
         * Determines how long the event will be, in characters, once it is
         * encoded into GET query parameters.
         * @param event The event to measure
         * @param options some additional options that can be used to influence the measurement
         * -- estimateIndices: Appends extra length to the measured length to account for when the event gets indices added
         * -- indexSize: use this when the indexSize is known before hand for a more accurate measurement
         */
        _getEventLength: function(event, options) {
            var baseLength = this._toQueryString(event).length;

            // the additional 1 is either the question mark if it's the first set of parameters
            // or an additional & that will go in between each set
            baseLength += 1;

            if (options) {
                var keyCount = _.keys(event).length;

                var indexSize;
                if (options.estimateIndices) {
                    // keys will always have at least .x appended to them,
                    // so add two characters per key
                    indexSize = 2;
                }
                if (options.indexSize) {
                    // add one for the period
                    indexSize = options.indexSize + 1;
                }

                baseLength += keyCount * indexSize;
            }


            return baseLength;
        },

        /**
         * Determines whether there are enough events in the queue to cause a batch to go out.
         * Uses the config minLength to determine if enough data is available.
         */
        _canSendBatch: function() {
            if (this._eventQueue.length === 0) {
                return false;
            }

            var currentLength = this._getUrl().length;

            var canSend = false;

            _.each(this._eventQueue, function(event) {
                currentLength += this._getEventLength(event, { estimateIndices: true });

                if (currentLength >= this.minLength && currentLength < this.maxLength) {
                    canSend = true;
                    return false;
                }
            }, this);

            return canSend;
        },

        /**
         * Appends indices to the keys of the event. This is to avoid the keys being clobbered
         * in the GET request. For example if a GET request contains two events, then the key "start"
         * would be in there twice (as would all the other keys), causing problems. This method
         * adds an index to the keys causing them to be "start.0", "start.1", etc
         * @param event
         * @param index
         */
        _appendIndexToKeys: function(event, index) {
            var keys = _.keys(event);

            _.each(keys, function(key) {
                event[key + '.' + index] = event[key];
                delete event[key];
            });
        },

        /**
         * Takes all the events in the array and flattens them into one object
         */
        _flatten: function(eventArray) {
            return _.reduce(eventArray, function(flattened, e) {
                return _.merge(flattened, e);
            }, {});
        },

        /**
         * Causes a batch to get sent out to the configured endpoint
         */
        _sendBatch: function() {
            var currentIndex = 0;
            var currentLength = this._getUrl().length;

            var toBeSent = [];
            _.each(this._eventQueue, function(event) {
                var eventLength = this._getEventLength(event, { indexSize: currentIndex.toString().length });
                if (currentLength + eventLength < this.maxLength) {
                    this._appendIndexToKeys(event, currentIndex);
                    currentIndex += 1;

                    toBeSent.push(event);
                    currentLength += eventLength;
                } else {
                    return false;
                }
            }, this);

            this._makeGetRequest(toBeSent);
            this._eventQueue = _.difference(this._eventQueue, toBeSent);
        },

        /**
         * Get the configured endpoint URL, or the default if one is not configured
         */
        _getUrl: function() {
            return clientMetricsUrl;
        },

        _removeImageFromDom: function() {
            this.remove();
        },

        _toQueryString: function(data) {
            return _.map(data, function(value, key) {
                return encodeURIComponent(key) + '=' + encodeURIComponent(value);
            }).join('&');
        },

        /**
         * the method that actually sends the GET request to the endpoint. It is done
         * by adding an img to the DOM and its src being set to the created url.
         */
        _makeGetRequest: function(data) {
            if (_.isArray(data)) {
                data = this._flatten(data);
            }

            var encodedParameters = this._toQueryString(data);

            if (encodedParameters.length > 0) {
                var clientMetricsUrl = this._getUrl();
                var fullUrl = clientMetricsUrl + '?' + encodedParameters;

                var imgConfig = {
                    tag: 'img',
                    style: {
                        width: 0,
                        height: 0,
                        display: 'none'
                    }
                };

                var img = document.createElement("img");
                img.style.width = 0;
                img.style.height = 0;
                img.style.display = 'none';
                img.addEventListener('load', this._removeImageFromDom, false);
                img.addEventListener('error', this._removeImageFromDom, false);

                document.body.appendChild(img);
                img.src = fullUrl;
            }
        }
    });

    _.extend(BatchSender, {
        setClientMetricsUrl: function(url) {
            clientMetricsUrl = url;
        }
    });

    module.exports = BatchSender;
})();
