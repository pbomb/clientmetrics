(function() {
    var _ = require('underscore');
    var Util = require('./util');

    // the min and max length, in characters, that an encoded event can be. Max is set to 2000 since IE can
    // only handle URLs of length ~2048
    var MIN_EVENT_LENGTH = 1700;
    var MAX_EVENT_LENGTH = 2000;

    /**
     * @module BatchSender
     */
    /**
     * @class BatchSender
     * A helper object for {@link RallyMetrics.ClientMetricsAggregator} whose
     * job is to send the generated event objects in an efficient manner.
     *
     * It does this by batching up the requests and sends as many as it can fit into one GET
     * request.
     *
     * @private
     */
    /**
     * @constructor
     * @param {Object} config Configuration object
     * @param {String[]} [config.keysToIgnore = []] Which properties on events should not be sent
     * @param {Number} [config.minLength = 1700] The minimum length of the generated URL that can be sent.
     * @param {Number} [config.maxLength = 2000] The maximum length of the generated URL that can be sent.
     * @param {String} [config.beaconUrl = "https://trust.rallydev.com/beacon/"] URL where the beacon is located.
     */
    var BatchSender = function(config) {
        _.defaults(this, config, {
            keysToIgnore: [],
            minLength: MIN_EVENT_LENGTH,
            maxLength: MAX_EVENT_LENGTH,
            beaconUrl: "https://trust.rallydev.com/beacon/"
        });
        this._eventQueue = [];
    };

    _.extend(BatchSender.prototype, {

        send: function(event) {
            this._eventQueue.push(this._cleanEvent(event));
            this._sendBatches();
        },

        flush: function() {
            this._sendBatches(true);
        },

        getPendingEvents: function() {
            return this._eventQueue;
        },

        getMaxLength: function() {
            return this.maxLength;
        },

        _sendBatches: function(forceIncludeAll) {
            var nextBatch;
            while ((nextBatch = this._getNextBatch(forceIncludeAll))) {
                this._sendBatch(nextBatch);
            }
        },
        
        _cleanEvent: function(event) {
            return _.omit(event, this.keysToIgnore);
        },

        _getNextBatch: function(forceIncludeAll) {
            var batchObj = {},
                batchString,
                toBeSent = [],
                url = this._getUrl() + '?';

            _.each(this._eventQueue, function(event, currentIndex) {
                var eventCopy = this._appendIndexToKeys(event, currentIndex),
                    possibleBatchObj = _.extend(batchObj, eventCopy),
                    possibleBatchString = url + this._toQueryString(possibleBatchObj);

                if (possibleBatchString.length < this.maxLength) {
                    toBeSent.push(event);
                    batchString = possibleBatchString;
                    batchObj = possibleBatchObj;
                } else {
                    return false;
                }
            }, this);

            if (_.isEmpty(toBeSent) || (!forceIncludeAll && batchString.length < this.minLength)) {
                return null;
            }

            return {
                url: batchString,
                events: toBeSent
            };
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
            return _.transform(event, function(result, value, key) {
                result[key + '.' + index] = value;
            });
        },

        /**
         * Causes a batch to get sent out to the configured endpoint
         */
        _sendBatch: function(batch) {
            if (!batch) {
                return;
            }
            this._makeGetRequest(batch.url);
            this._eventQueue = _.difference(this._eventQueue, batch.events);
        },

        /**
         * Get the configured endpoint URL, or the default if one is not configured
         */
        _getUrl: function() {
            return this.beaconUrl;
        },

        _removeImageFromDom: function() {
            Util.removeEventHandler(this, 'load', this._removeImageFromDom);
            Util.removeEventHandler(this, 'error', this._removeImageFromDom);
            Util.removeFromDom(this);
        },

        _toQueryString: function(data) {
            return _.map(data, function(value, key) {
                return encodeURIComponent(key) + '=' + encodeURIComponent(value);
            }).join('&');
        },

        /**
         * the method that actually sends the GET request to the endpoint. It is done
         * by adding an img to the DOM and its src being set to the created beaconUrl.
         */
        _makeGetRequest: function(url) {
            var img = document.createElement("img");
            img.style.width = 0;
            img.style.height = 0;
            img.style.display = 'none';

            Util.addEventHandler(img, 'load', this._removeImageFromDom, false);
            Util.addEventHandler(img, 'error', this._removeImageFromDom, false);

            document.body.appendChild(img);
            img.src = url;
        }
    });

    module.exports = BatchSender;
})();
