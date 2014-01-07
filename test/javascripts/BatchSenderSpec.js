(function() {
  describe("RallyMetrics.BatchSender", function() {
    var fakeBeaconUrl;
    fakeBeaconUrl = 'totallyfakeurl';
    helpers({
      createSender: function(config) {
        if (config == null) {
          config = {};
        }
        return new RallyMetrics.BatchSender(_.defaults(config, {
          beaconUrl: fakeBeaconUrl,
          minLength: 0
        }));
      },
      getData: function(count) {
        var i, _i, _results;
        _results = [];
        for (i = _i = 0; 0 <= count ? _i < count : _i > count; i = 0 <= count ? ++_i : --_i) {
          _results.push({
            foo: i
          });
        }
        return _results;
      }
    });
    beforeEach(function() {
      return this.spy(document.body, 'appendChild');
    });
    describe('config options', function() {
      return describe('keysToIgnore', function() {
        return it("should strip out all keys in keysToIgnore", function() {
          var aKeyToIgnore, anotherKeyToIgnore, data, img, sender;
          aKeyToIgnore = "testKey";
          anotherKeyToIgnore = "theOtherKey";
          sender = this.createSender({
            keysToIgnore: [aKeyToIgnore, anotherKeyToIgnore]
          });
          data = {
            foo: "bar"
          };
          data[aKeyToIgnore] = "should ignore this one";
          data[anotherKeyToIgnore] = "this one too";
          sender.send(data);
          img = document.body.appendChild.args[0][0];
          expect(img.src).toContain("foo.0=bar");
          expect(img.src).not.toContain("" + aKeyToIgnore + ".0");
          return expect(img.src).not.toContain("" + anotherKeyToIgnore + ".0");
        });
      });
    });
    describe('#send', function() {
      it("should append indices to the keys so they don't get clobbered", function() {
        var d, data, datum, i, img, sender, _i, _j, _len, _len1, _results;
        data = this.getData(10);
        sender = this.createSender({
          minLength: 10 * 8 + fakeBeaconUrl.length
        });
        for (_i = 0, _len = data.length; _i < _len; _i++) {
          datum = data[_i];
          sender.send(datum);
        }
        img = document.body.appendChild.args[0][0];
        _results = [];
        for (i = _j = 0, _len1 = data.length; _j < _len1; i = ++_j) {
          d = data[i];
          _results.push(expect(img.src).toContain("foo." + i + "=" + i));
        }
        return _results;
      });
      it("should not send a batch if the url length is shorter than the configured min length", function() {
        var data, datum, sender, _i, _len;
        sender = this.createSender({
          minLength: 1000
        });
        data = this.getData(2);
        for (_i = 0, _len = data.length; _i < _len; _i++) {
          datum = data[_i];
          sender.send(datum);
        }
        expect(sender.getPendingEvents()).toEqual(data);
        return expect(document.body.appendChild).not.toHaveBeenCalled();
      });
      it("should not send a batch that contains one event that is too big", function() {
        var data, i, longValue, sender, _i;
        sender = this.createSender({
          minLength: 0,
          maxLength: 100
        });
        longValue = '';
        for (i = _i = 0; _i <= 101; i = ++_i) {
          longValue += 'a';
        }
        data = {
          foo: longValue
        };
        sender.send(data);
        expect(sender.getPendingEvents()).toEqual([data]);
        return expect(document.body.appendChild).not.toHaveBeenCalled();
      });
      return it("should send to the configured url", function() {
        var clientMetricsUrl, data, datum, img, sender, _i, _len;
        clientMetricsUrl = "http://localhost/testing";
        sender = this.createSender({
          beaconUrl: clientMetricsUrl,
          minLength: 2 * 8 + clientMetricsUrl.length
        });
        data = this.getData(2);
        for (_i = 0, _len = data.length; _i < _len; _i++) {
          datum = data[_i];
          sender.send(datum);
        }
        img = document.body.appendChild.args[0][0];
        return expect(img.src).toBe("" + clientMetricsUrl + "?foo.0=0&foo.1=1");
      });
    });
    return describe('#flush', function() {
      return it("should send a batch even though the url length is shorter than the configured min length", function() {
        var clientMetricsUrl, data, datum, img, sender, _i, _len;
        clientMetricsUrl = "http://localhost/testing";
        sender = this.createSender({
          beaconUrl: clientMetricsUrl,
          minLength: 1000
        });
        data = this.getData(2);
        for (_i = 0, _len = data.length; _i < _len; _i++) {
          datum = data[_i];
          sender.send(datum);
        }
        expect(sender.getPendingEvents()).toEqual(data);
        expect(document.body.appendChild).not.toHaveBeenCalled();
        sender.flush();
        expect(sender.getPendingEvents().length).toBe(0);
        expect(document.body.appendChild).toHaveBeenCalledOnce();
        img = document.body.appendChild.args[0][0];
        return expect(img.src).toBe("" + clientMetricsUrl + "?foo.0=0&foo.1=1");
      });
    });
  });

}).call(this);
