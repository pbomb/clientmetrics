var _ = require('underscore');
var Util = require('./util');

// the min and max length, in characters, that an encoded event can be.
// Max is set to 2000 for IE since IE can only handle URLs of length ~2048
var MIN_EVENT_LENGTH = 1700;
var MAX_EVENT_LENGTH = 2000;

/**
 * A helper object for {@link Aggregator} whose
 * job is to send the generated event objects in an efficient manner.
 *
 * It does this by batching up the requests and sends as many as it can fit into one GET
 * request.
 * @constructor
 * @param {Object} config Configuration object
 * @param {String[]} [config.keysToIgnore = new Array()] Which properties on events should not be sent
 * @param {Number} [config.minLength = 1700] The minimum length of the generated URL that can be sent.
 * @param {Number} [config.maxLength = 2000] The maximum length of the generated URL that can be sent.
 * @param {String} [config.beaconUrl = "https://trust.f4tech.com/beacon/"] URL where the beacon is located.
 */
var ImgBatchSender = function(config) {
    _.defaults(this, config, {
        keysToIgnore: [],
        minLength: MIN_EVENT_LENGTH,
        maxLength: MAX_EVENT_LENGTH,
        beaconUrl: "https://trust.f4tech.com/beacon/",
        emitWarnings: false
    });
    this._eventQueue = [];
};

/**
 * Send the passed-in event.
 * @param {object} event - The event that can be sent
 * @public
 */
ImgBatchSender.prototype.send = function(event) {
    this._eventQueue.push(this._cleanEvent(event));
    this._sendBatches();
};

/**
 * Send any unsent events that are not still pending.
 * @public
 */
ImgBatchSender.prototype.flush = function() {
    this._sendBatches(true);
};

/**
 * @returns {Array} All events that have been started but not yet finished.
 * @public
 */
ImgBatchSender.prototype.getPendingEvents = function() {
    return this._eventQueue;
};

/**
 * @returns {Number} The max length of a batch size to send
 * @public
 */
ImgBatchSender.prototype.getMaxLength = function() {
    return this.maxLength;
};

ImgBatchSender.prototype._sendBatches = function(forceIncludeAll) {
    var nextBatch;
    while ((nextBatch = this._getNextBatch(forceIncludeAll))) {
        this._sendBatch(nextBatch);
    }
};

ImgBatchSender.prototype._cleanEvent = function(event) {
    return _.omit(event, this.keysToIgnore);
};

ImgBatchSender.prototype._getNextBatch = function(forceIncludeAll) {
    var batchObj = {},
        batchString,
        toBeSent = [],
        url = this._getUrl() + '?',
        batchSize = 0;

    _.each(this._eventQueue, function(event, currentIndex) {
        var eventCopy = this._appendIndexToKeys(event, currentIndex),
            possibleBatchObj = _.extend(batchObj, eventCopy),
            possibleBatchString = url + this._toQueryString(possibleBatchObj);

        ++batchSize;

        if (possibleBatchString.length < this.maxLength) {
            toBeSent.push(event);
            batchString = possibleBatchString;
            batchObj = possibleBatchObj;
        } else {
            if (batchSize === 1 && this.emitWarnings && window.console && window.console.warn) {
                console.warn('Client metrics: an event is too big to send', event);
            }
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
};

/**
 * Appends indices to the keys of the event. This is to avoid the keys being clobbered
 * in the GET request. For example if a GET request contains two events, then the key "start"
 * would be in there twice (as would all the other keys), causing problems. This method
 * adds an index to the keys causing them to be "start.0", "start.1", etc
 * @param event
 * @param index
 *
 * @private
 */
ImgBatchSender.prototype._appendIndexToKeys = function(event, index) {
    return _.transform(event, function(result, value, key) {
        result[key + '.' + index] = value;
    });
};

/**
 * Causes a batch to get sent out to the configured endpoint
 *
 * @private
 */
ImgBatchSender.prototype._sendBatch = function(batch) {
    if (!batch) {
        return;
    }
    if (!this._disabled) {
        this._makeGetRequest(batch.url);
    }
    this._eventQueue = _.difference(this._eventQueue, batch.events);
};

/**
 * Get the configured endpoint URL, or the default if one is not configured
 *
 * @private
 */
ImgBatchSender.prototype._getUrl = function() {
    return this.beaconUrl;
};

ImgBatchSender.prototype._disableClientMetrics = function() {
    this._disabled = true;
};

ImgBatchSender.prototype._removeImageFromDom = function() {
    Util.removeEventHandler(this, 'load', this._imgCallback);
    Util.removeEventHandler(this, 'error', this._imgErrback);
    Util.removeFromDom(this);
};

ImgBatchSender.prototype._toQueryString = function(data) {
    return _.map(data, function(value, key) {
        return encodeURIComponent(key) + '=' + encodeURIComponent(value);
    }).join('&');
};

/**
 * the method that actually sends the GET request to the endpoint. It is done
 * by adding an img to the DOM and its src being set to the created beaconUrl.
 *
 * @private
 */
ImgBatchSender.prototype._makeGetRequest = function(url) {
    var img = document.createElement("img");
    img.style.width = 0;
    img.style.height = 0;
    img.style.display = 'none';

    img._imgCallback = _.bind(this._removeImageFromDom, img);
    img._imgErrback = _.bind(this._disableClientMetrics, this);
    Util.addEventHandler(img, 'load', img._imgCallback, false);
    Util.addEventHandler(img, 'error', img._imgErrback, false);

    document.body.appendChild(img);
    img.src = url;
};

module.exports = ImgBatchSender;
