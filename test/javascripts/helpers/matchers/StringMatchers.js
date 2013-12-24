(function() {
  beforeEach(function() {
    return this.addMatchers({
      toStartWith: function(text) {
        var notText;
        notText = this.isNot ? " not" : "";
        this.message = function() {
          return "Expected " + this.actual + " to" + notText + " start with " + text;
        };
        return this.actual.indexOf(text) === 0;
      },
      toEndWith: function(text) {
        var notText;
        notText = this.isNot ? " not" : "";
        this.message = function() {
          return "Expected " + this.actual + " to" + notText + " end with " + text;
        };
        return this.actual.indexOf(text, this.actual.length - text.length) !== -1;
      }
    });
  });

}).call(this);
