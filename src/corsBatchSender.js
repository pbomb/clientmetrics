
var _ = require('underscore');
var Util = require('./util');

// the min and max number of events to put into one batch. Since we are now
// using POSTs, we have a lot more room.
var MIN_NUMBER_OF_EVENTS = 25;
var MAX_NUMBER_OF_EVENTS = 100;

/**
 * A helper object for {@link Aggregator} whose
 * job is to send the generated event objects in an efficient manner.
 *
 * It does this by batching up the requests and sends as many as it can fit into one GET
 * request.
 * @constructor
 * @param {Object} config Configuration object
 * @param {String[]} [config.keysToIgnore = new Array()] Which properties on events should not be sent
 * @param {Number} [config.minNumberOfEvents = 25] The minimum number of events for one batch
 * @param {Number} [config.maxNumberOfEvents = 100] The maximum number of events for one batch
 * @param {String} [config.beaconUrl = "https://trust.f4tech.com/beacon/"] URL where the beacon is located.
 */
var CorsBatchSender = function(config) {
    _.defaults(this, config, {
        keysToIgnore: [],
        minNumberOfEvents: MIN_NUMBER_OF_EVENTS,
        maxNumberOfEvents: MAX_NUMBER_OF_EVENTS,
        beaconUrl: "https://trust.f4tech.com/beacon/"
    });
    this._eventQueue = [];
};

CorsBatchSender.prototype.send = function(event) {
    this._eventQueue.push(this._cleanEvent(event));
    this._sendBatches();
};

CorsBatchSender.prototype.flush = function() {
    this._sendBatches({ flush: true });
};

CorsBatchSender.prototype.getPendingEvents = function() {
    return this._eventQueue;
};

CorsBatchSender.prototype.getMaxLength = function() {
    return this.maxLength;
};

CorsBatchSender.prototype._sendBatches = function(options) {
    var nextBatch;
    while ((nextBatch = this._getNextBatch(options))) {
        this._sendBatch(nextBatch);
    }
};

CorsBatchSender.prototype._cleanEvent = function(event) {
    return _.omit(event, this.keysToIgnore);
};

CorsBatchSender.prototype._getNextBatch = function(options) {
    var toBeSent = _.take(this._eventQueue, this.maxNumberOfEvents);

    if (toBeSent.length && (toBeSent.length >= this.minNumberOfEvents || (options && options.flush))) {
        return toBeSent;
    }
};

/**
 * Appends indices to the keys of the event. This is to avoid the keys being clobbered
 * in the GET request. Even though we are using POST now, these are still needed because
 * the beacon is using the same logic for POST and GET. It's maintaining GET for
 * backwards compatibility with old App SDKs
 *
 * @private
 */
CorsBatchSender.prototype._appendIndexToKeys = function(event, index) {
    return _.transform(event, function(result, value, key) {
        result[key + '.' + index] = value;
    });
};

/**
 * Causes a batch to get sent out to the configured endpoint
 *
 * @private
 */
CorsBatchSender.prototype._sendBatch = function(batch) {
    if (!this._disabled) {
        this._makePOST(batch);
    }
    this._eventQueue = _.difference(this._eventQueue, batch);
};

CorsBatchSender.prototype._getUrl = function() {
    return this.beaconUrl;
};

CorsBatchSender.prototype._disableClientMetrics = function() {
    this._disabled = true;
};

/**
 * Before CORS, the beacon GET requests meant all data was a string.
 * We are simulating that with this method, properly handling non-string
 * data on the backend is a decent amount of work. Hoping this method is
 * temporary.
 */
CorsBatchSender.prototype._allValuesAsStrings = function(event) {
    return _.forIn(event, function(value, key, object) {
        if (!_.isString(value)) {
            object[key] = "" + value;
        }
    });
};

CorsBatchSender.prototype._makePOST = function(events) {
    // from an array of individual events to an object of events with keys on them
    var data = _.reduce(events, function(data, event, index) {
        event = this._allValuesAsStrings(event);
        return _.extend(data, this._appendIndexToKeys(event, index));
    }, {}, this);

    try {
        var xhr = Util.createCorsXhr('POST', this.beaconUrl);
        if (xhr) {
            xhr.onerror = _.bind(this._disableClientMetrics, this);
            setTimeout(function() {
                xhr.send(JSON.stringify(data));
            }, 0);
        } else {
            this._disableClientMetrics();
        }
    } catch(e) {
        this._disableClientMetrics();
    }
};

module.exports = CorsBatchSender;
