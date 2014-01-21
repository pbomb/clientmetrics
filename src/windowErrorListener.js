(function() {
    var _ = require('underscore');
    var Util = require('./util');

    var browserSupportsOnError = true;
    var errorTpl = _.template("<%= message %>, <%= filename %>:<%= lineNumber %>");
    var unhandledErrorTpl = _.template("onerror::<%= message %>, <%= filename %>:<%= lineNumber %>");

    /**
     * @class RallyMetrics.WindowErrorListener
     * A component that listens for unhandled errors and generates a message for them.
     *
     * This is used by client metrics to send client side errors to the beacon
     * @constructor
     * @param {RallyMetrics.ClientMetricsAggregator} aggregator
     * @param {Boolean} [supportsOnError=true] Does the browser support window.onerror?
     */
    var ErrorListener = function(aggregator, supportsOnError) {
        var useOnError = _.isBoolean(supportsOnError) ? supportsOnError : browserSupportsOnError;
        this.aggregator = aggregator;

        if (useOnError) {
            this._originalWindowOnError = window.onerror;
            window.onerror = _.bind(this._windowOnError, this);
        } else {
            Util.addEvent(window, 'error', _.bind(this._onUnhandledError, this), false);
        }
    };

    _.extend(ErrorListener.prototype, {

        _windowOnError: function(message, filename, lineNum) {
            if (_.isFunction(this._originalWindowOnError)) {
                this._originalWindowOnError.call(window, message, filename, lineNum);
            }

            var errorInfo = errorTpl({
                message: message || 'unknown message',
                filename: filename || '??',
                lineNumber: _.isNumber(lineNum) ? lineNum : '??'
            });
            this.aggregator.recordError(errorInfo);
        },

        _onUnhandledError: function(evt) {
            var errorInfo;
            if (evt.browserEvent) {
                errorInfo = unhandledErrorTpl({
                    message: evt.browserEvent.message || 'unknown message',
                    filename: evt.browserEvent.filename || '??',
                    lineNumber: evt.browserEvent.lineno || '??'
                });
            } else {
                errorInfo = 'onerror::' + (evt.message || 'unknown error');
            }
            this.aggregator.recordError(errorInfo);
        }
    });

    module.exports = ErrorListener;
})();

