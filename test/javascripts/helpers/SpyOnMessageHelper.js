(function() {
  beforeEach(function() {
    this.spyOnMessage = function(message) {
      var spy;
      spy = this.spy();
      Rally.environment.getMessageBus().subscribe(message, spy);
      return spy;
    };
    return this.spyOnEvent = function(observable, event, opts) {
      var spy;
      if (opts == null) {
        opts = {};
      }
      spy = this.spy();
      observable.on(event, spy, opts);
      return spy;
    };
  });

}).call(this);
