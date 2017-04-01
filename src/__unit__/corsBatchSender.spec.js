import CorsBatchSender from '../corsBatchSender';
import * as Util from '../util';

let mockXhr;

const createSender = (config = {}) => {
  return new CorsBatchSender(Util.assign({}, {
    beaconUrl: 'totallyfakeurl'
  }, config));
};

const getData = (count) => {
  const results = [];
  for (let i = 0; i <= count; i++) {
    results.push({ foo: i });
  }
  return results;
};

describe("CorsBatchSender", () => {

  beforeEach(() => {
    mockXhr = {
      send: sinon.stub()
    };
    sinon.stub(Util, 'createCorsXhr').returns(mockXhr);
  });

  afterEach(() => {
    Util.createCorsXhr.restore();
  });

  describe('config options', () => {
    describe('min and max number of events', () => {
      it('should set the min number to 40', () => {
        const sender = createSender();
        expect(sender.minNumberOfEvents).to.equal(40);
      });

      it('should set the max number of events to 100', () => {
        const sender = createSender();
        expect(sender.maxNumberOfEvents).to.equal(100);
      });
    });

    describe('keysToIgnore', () => {
      it("should strip out all keys in keysToIgnore", (done) => {
        const aKeyToIgnore = "testKey";
        const anotherKeyToIgnore = "theOtherKey";
        const sender = createSender({
          keysToIgnore: [aKeyToIgnore, anotherKeyToIgnore],
          minNumberOfEvents: 0
        });
        const data = {
          foo: "bar",
          [aKeyToIgnore]: "should ignore this one",
          [anotherKeyToIgnore]: "this one too"
        };
        mockXhr.send = (data) => {
          const sentData = JSON.parse(data);
          expect(Object.keys(sentData).length).to.equal(1);
          expect(sentData["foo.0"]).to.equal("bar");
          expect(sentData[aKeyToIgnore + ".0"]).to.be.undefined;
          expect(sentData[anotherKeyToIgnore + ".0"]).to.be.undefined;
          done();
        };
        sender.send(data);
      });
    });
  });

  describe('#send', () => {
    it("should append indices to the keys so they don't get clobbered", (done) => {
      const data = getData(10);
      const sender = createSender({
        minNumberOfEvents: 10,
        sendDeferred: (callback) => callback(),
      });
      mockXhr.send = (dataString) => {
        const sentData = JSON.parse(dataString);
        expect(Object.keys(sentData).length).to.equal(10);
        for (let i = 0; i < 10; i++) {
          expect(sentData[`foo.${i}`]).to.equal(`${i}`);
        }
        done();
      };
      data.map(datum => sender.send(datum));
    });

    it("should not send a batch if the number of events is less than the minimum", () => {
      const sender = createSender({
        minNumberOfEvents: 1000,
        sendDeferred: (callback) => callback(),
      });
      const data = getData(2);
      data.forEach(datum => sender.send(datum));
      expect(sender.getPendingEvents()).to.eql(data);
      expect(Util.createCorsXhr).not.to.have.been.called;
    });

    it("should send to the configured url", () => {
      const clientMetricsUrl = "http://localhost/testing";
      const sender = createSender({
        beaconUrl: clientMetricsUrl,
        minNumberOfEvents: 2,
        sendDeferred: (callback) => callback(),
      });
      const data = getData(2);
      data.forEach(datum => sender.send(datum));
      expect(Util.createCorsXhr.args[0][0]).to.equal("POST");
      expect(Util.createCorsXhr.args[0][1]).to.equal(clientMetricsUrl);
    });

    it("should disable sending client metrics if configured", () => {
      const sender = createSender({
        disableSending: true,
        minNumberOfEvents: 0,
        sendDeferred: (callback) => callback(),
      });
      expect(sender.isDisabled()).to.be.true;
      sender.send({});
      expect(Util.createCorsXhr).not.to.have.been.called;
    });

    it("should not make a request if disabled, but still purge events", () => {
      const sender = createSender({
        disableSending: true,
        minNumberOfEvents: 0,
        sendDeferred: (callback) => callback(),
      });
      const data = getData(1);
      data.forEach(datum => sender.send(datum));
      expect(Util.createCorsXhr).not.to.have.been.called;
      expect(sender.getPendingEvents().length).to.equal(0);
    });

    describe("when an error occurs", () => {
      it("should disable sending client metrics if there is a POST error", () => {
        const clientMetricsUrl = "http://unknownhost/to/force/an/error";
        const sender = createSender({
          beaconUrl: clientMetricsUrl,
          minNumberOfEvents: 0,
          sendDeferred: (callback) => callback(),
        });
        sender.send({});
        expect(mockXhr.onerror).to.be.a("function");
        expect(sender.isDisabled()).to.be.false;
        mockXhr.onerror();
        expect(sender.isDisabled()).to.be.true;
      });

      it("should disable client metrics if an exception is thrown", () => {
        Util.createCorsXhr.throws();
        const sender = createSender({
          minNumberOfEvents: 0,
          sendDeferred: (callback) => callback(),
        });
        const data = getData(1);
        data.forEach(datum => sender.send(datum));
        expect(sender.isDisabled()).to.be.true;
      });
    });
  });

  describe('#flush', () => {
    it("should send a batch even though the number of events is less than the minimum", () => {
      const clientMetricsUrl = "http://localhost/testing";
      const sender = createSender({
        beaconUrl: clientMetricsUrl,
        minNumberOfEvents: 1000,
        sendDeferred: (callback) => callback(),
      });
      const data = getData(2);
      data.forEach(datum => sender.send(datum));
      expect(sender.getPendingEvents()).to.eql(data);
      expect(Util.createCorsXhr).not.to.have.been.called;
      sender.flush();
      expect(sender.getPendingEvents().length).to.equal(0);
      expect(Util.createCorsXhr).to.have.been.calledOnce;
    });
  });
});
