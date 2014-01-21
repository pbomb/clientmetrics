(function(){
    var Util = {
        addEvent: function(target, eventName, callback, bubble) {
            if(target.addEventListener) {
                target.addEventListener(eventName, callback, bubble);
            } else if(target.attachEvent) {
                target.attachEvent('on' + eventName, callback);
            }
        }
    };

    module.exports = Util;
})();