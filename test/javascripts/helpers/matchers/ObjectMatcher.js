(function() {
  var notText;

  notText = function(matcher) {
    if (matcher.isNot) {
      return " not";
    } else {
      return "";
    }
  };

  beforeEach(function() {
    return this.addMatchers({
      toHaveOwnProperty: function(property) {
        this.message = function() {
          var ownProperties;
          ownProperties = _.keys(this.actual);
          return "Expected object" + (notText(this)) + " to have own property \"" + property + "\". Its properties are: " + ownProperties;
        };
        return this.actual.hasOwnProperty(property);
      },
      toBeANumber: function() {
        this.message = function() {
          return "Expected object" + (notText(this)) + " to be a number. It is actually " + (typeof this.actual);
        };
        return _.isNumber(this.actual);
      },
      toBeAString: function() {
        this.message = function() {
          return "Expected object" + (notText(this)) + " to be a string. It is actually " + (typeof this.actual);
        };
        return _.isString(this.actual);
      },
      toBeAFunction: function() {
        this.message = function() {
          return "Expected object" + (notText(this)) + " to be a function. It is actually " + (typeof this.actual);
        };
        return _.isFunction(this.actual);
      },
      toBeWithin: function(lower, upper) {
        this.message = function() {
          return "Expected " + this.actual + (notText(this)) + " to be within " + lower + " and " + upper;
        };
        return lower <= this.actual && upper >= this.actual;
      }
    });
  });

}).call(this);
