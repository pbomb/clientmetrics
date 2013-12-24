(function() {
  describe('RallyMetrics.WindowErrorListener', function() {
    helpers({
      createListener: function(supportsOnError) {
        return new RallyMetrics.WindowErrorListener(this.aggregator, supportsOnError);
      }
    });
    beforeEach(function() {
      this.originalOnError = window.onerror;
      return this.aggregator = {
        recordError: this.stub()
      };
    });
    afterEach(function() {
      return window.onerror = this.originalOnError;
    });
    it('should record the error message, file and line number', function() {
      var file, lineNum, message;
      this.createListener();
      message = 'uhoh';
      file = 'someCode.js';
      lineNum = 22;
      window.onerror(message, file, lineNum);
      return expect(this.aggregator.recordError).toHaveBeenCalledWith("" + message + ", " + file + ":" + lineNum);
    });
    it('should gracefully deal with no error message, file and line number', function() {
      var errorInfo;
      this.createListener();
      window.onerror(void 0, void 0, void 0);
      errorInfo = this.aggregator.recordError.args[0][0];
      expect(errorInfo).not.toContain('undefined');
      return expect(errorInfo).toContain('?');
    });
    it('should not hook into onerror if not supported', function() {
      var dummyOnError;
      dummyOnError = this.spy();
      window.onerror = dummyOnError;
      this.createListener(false);
      return expect(window.onerror).toBe(dummyOnError);
    });
    return it('should maintain the existing window.onerror', function() {
      var existingOnError;
      existingOnError = this.spy();
      window.onerror = existingOnError;
      this.createListener();
      window.onerror('uhoh', 'foo.js', 12);
      expect(this.aggregator.recordError).toHaveBeenCalledWith('uhoh, foo.js:12');
      return expect(existingOnError).toHaveBeenCalledWith('uhoh', 'foo.js', 12);
    });
  });

}).call(this);
