(function() {
  describe("RallyMetrics.BatchSender", function() {
    helpers({
      createSender: function(config) {
        if (config == null) {
          config = {};
        }
        return new RallyMetrics.BatchSender(_.defaults(config, {
          beaconUrl: 'totallyfakeurl',
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
          sender.send([data]);
          img = document.body.appendChild.args[0][0];
          expect(img.src).toContain("foo.0=bar");
          expect(img.src).not.toContain("" + aKeyToIgnore + ".0");
          return expect(img.src).not.toContain("" + anotherKeyToIgnore + ".0");
        });
      });
    });
    return describe('#send', function() {
      it("should append indices to the keys so they don't get clobbered", function() {
        var d, data, i, img, _i, _len, _results;
        data = this.getData(10);
        this.createSender().send(data);
        img = document.body.appendChild.args[0][0];
        _results = [];
        for (i = _i = 0, _len = data.length; _i < _len; i = ++_i) {
          d = data[i];
          _results.push(expect(img.src).toContain("foo." + i + "=" + i));
        }
        return _results;
      });
      it("should not send a batch if the url length is shorter than the configured min length", function() {
        var data, sender;
        sender = this.createSender({
          minLength: 1000
        });
        data = this.getData(2);
        sender.send(data);
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
        data = [
          {
            foo: longValue
          }
        ];
        sender.send(data);
        expect(sender.getPendingEvents()).toEqual(data);
        return expect(document.body.appendChild).not.toHaveBeenCalled();
      });
      return it("should send to the configured url", function() {
        var clientMetricsUrl, data, img, sender;
        clientMetricsUrl = "http://localhost/testing";
        sender = this.createSender({
          beaconUrl: clientMetricsUrl
        });
        data = this.getData(2);
        sender.send(data);
        img = document.body.appendChild.args[0][0];
        return expect(img.src).toBe("" + clientMetricsUrl + "?foo.0=0&foo.1=1");
      });
    });
  });

}).call(this);
