import { assign, omit } from './util';
import { createCorsXhr } from './util';

// the min and max number of events to put into one batch. Since we are now
// using POSTs, we have a lot more room.
const MIN_NUMBER_OF_EVENTS = 25;
const MAX_NUMBER_OF_EVENTS = 100;

/**
 * Appends indices to the keys of the event. This is to avoid the keys being clobbered
 * in the GET request. Even though we are using POST now, these are still needed because
 * the beacon is using the same logic for POST and GET. It's maintaining GET for
 * backwards compatibility with old App SDKs
 */
const appendIndexToKeys = (event, index) => {
  /**
   * Before CORS, the beacon GET requests meant all data was a string.
   * We are simulating that with this method, properly handling non-string
   * data on the backend is a decent amount of work. Hoping this method is
   * temporary.
   */
  return Object.keys(event).reduce((result, key) => {
    result[`${key}.${index}`] = `${event[key]}`;
    return result;
  }, {});
};

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
class CorsBatchSender {
  constructor(config) {
    assign(this, {
      _disabled: false,
      keysToIgnore: [],
      minNumberOfEvents: MIN_NUMBER_OF_EVENTS,
      maxNumberOfEvents: MAX_NUMBER_OF_EVENTS,
      beaconUrl: "https://trust.f4tech.com/beacon/",
      onSend: () => {}
    }, config);

    if (this.disableSending) {
      this._disableClientMetrics();
    }
    this._eventQueue = [];
    this._xhrCallbacks = {};
  }

  send(event) {
    this._eventQueue.push(event);
    this._sendBatches();
  }

  flush() {
    this._sendBatches({ flush: true });
  }

  getPendingEvents() {
    return this._eventQueue;
  }

  getMaxLength() {
    return this.maxLength;
  }

  _sendBatches(options) {
    let nextBatch = this._getNextBatch(options);
    while (nextBatch) {
      this._sendBatch(nextBatch);
      nextBatch = this._getNextBatch(options);
    }
  }

  _getNextBatch(options = {}) {
    const toBeSent = this._eventQueue.slice(0, this.maxNumberOfEvents);

    if (toBeSent.length && (toBeSent.length >= this.minNumberOfEvents || (options.flush))) {
      return toBeSent;
    }
  }

  /**
   * Causes a batch to get sent out to the configured endpoint
   *
   * @private
   */
  _sendBatch(batch) {
    if (!this._disabled) {
      this.onSend(batch);
      this._makePOST(batch);
    }
    this._eventQueue = this._eventQueue.filter(ev => batch.indexOf(ev) === -1);
  }

  _getUrl() {
    return this.beaconUrl;
  }

  _disableClientMetrics() {
    this._disabled = true;
  }

  isDisabled() {
    return this._disabled;
  }

  _makePOST(events) {
    // from an array of individual events to an object of events with keys on them
    const data = events.reduce((data, event, index) => {
      const eventToSend = appendIndexToKeys(omit(event, ...this.keysToIgnore), index);
      return assign({}, data, eventToSend);
    }, {});

    try {
      const xhr = createCorsXhr('POST', this.beaconUrl);

      if (xhr) {
        xhr.onreadystatechange = () => {
          if (xhr.readyState === XMLHttpRequest.DONE) {
            const eIds = events.map(function(event) {
              return event.eId;
            });

            for (let key in this._xhrCallbacks) {
              this._xhrCallbacks[key](xhr.status, eIds);
            }
          }
        };

        xhr.onerror = this._disableClientMetrics.bind(this);
        setTimeout(() => xhr.send(JSON.stringify(data)), 0);
      } else {
        this._disableClientMetrics();
      }
    } catch(e) {
      this._disableClientMetrics();
    }
  }
}

export default CorsBatchSender;
