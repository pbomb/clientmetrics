(function(){
    var _ = require('underscore');

    var Util = {
        addEventHandler: function(target, eventName, callback, bubble) {
            if (target.addEventListener) {
                target.addEventListener(eventName, callback, bubble);
            } else if (target.attachEvent) {
                target.attachEvent('on' + eventName, callback);
            }
        },

        removeEventHandler: function(target, eventName, callback) {
            if (target.removeEventListener) {
                target.removeEventListener(eventName, callback);
            } else if (target.detachEvent) {
                target.detachEvent('on' + eventName, callback);
            }
        },

        removeFromDom: function(element) {
            if (_.isFunction(element.remove)) {
                element.remove();
            } else if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
        },

        createCorsXhr: function(method, url){
            var xhr = new XMLHttpRequest();
            if ("withCredentials" in xhr) {
                xhr.open(method, url, true);
                xhr.setRequestHeader('Content-type','application/json; charset=utf-8');
            } else if (typeof XDomainRequest !== "undefined") {
                xhr = new XDomainRequest();
                xhr.onload = function() {};
                xhr.onprogress = function() {};
                xhr.ontimeout = function() {};

                xhr.open(method, url);
            } else {
                xhr = null;
            }

            return xhr;
        }
    };

    module.exports = Util;
})();
