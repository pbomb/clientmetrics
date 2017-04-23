import CorsBatchSender from '../corsBatchSender';
import * as Util from '../util';
import { stub } from '../../test-utils/specHelper';

let mockXhr;

const createSender = (config = {}) => {
  return new CorsBatchSender(
    Util.assign(
      {},
      {
        beaconUrl: 'totallyfakeurl',
      },
      config,
    ),
  );
};

const getData = count => {
  const results = [];
  for (let i = 0; i < count; i++) {
    results.push({ foo: i });
  }
  return results;
};

const sendDeferred = callback => callback();

describe('CorsBatchSender', () => {
  beforeEach(() => {
    mockXhr = {
      foo: 'bar',
      send: stub(),
    };
    const stubb = stub(Util, 'createCorsXhr').returns(mockXhr);
  });

  describe('config options', () => {
    describe('min and max number of events', () => {
      it('should set the min number to 40', () => {
        const sender = createSender();
        expect(sender.minNumberOfEvents).toBe(40);
      });

      it('should set the max number of events to 100', () => {
        const sender = createSender();
        expect(sender.maxNumberOfEvents).toBe(100);
      });
    });

    describe('keysToIgnore', () => {
      it('should strip out all keys in keysToIgnore', () => {
        const aKeyToIgnore = 'testKey';
        const anotherKeyToIgnore = 'theOtherKey';
        const sender = createSender({
          keysToIgnore: [aKeyToIgnore, anotherKeyToIgnore],
          minNumberOfEvents: 0,
          sendDeferred,
        });
        const data = {
          foo: 'bar',
          [aKeyToIgnore]: 'should ignore this one',
          [anotherKeyToIgnore]: 'this one too',
        };
        sender.send(data);
        expect(mockXhr.send).toHaveBeenCalled();
        const sentData = JSON.parse(mockXhr.send.args[0][0]);
        expect(Object.keys(sentData).length).toBe(1);
        expect(sentData['foo.0']).toBe('bar');
        expect(sentData[`${aKeyToIgnore}.0`]).toBeUndefined();
        expect(sentData[`${anotherKeyToIgnore}.0`]).toBeUndefined();
      });
    });
  });

  describe('#send', () => {
    it("should append indices to the keys so they don't get clobbered", () => {
      const data = getData(10);
      const sender = createSender({
        minNumberOfEvents: 10,
        sendDeferred,
      });
      data.map(datum => sender.send(datum));
      expect(mockXhr.send.callCount).toBe(1);
      const sentData = JSON.parse(mockXhr.send.args[0][0]);
      expect(Object.keys(sentData).length).toBe(10);
      for (let i = 0; i < 10; i++) {
        expect(sentData[`foo.${i}`]).toBe(`${i}`);
      }
    });

    it('should not send a batch if the number of events is less than the minimum', () => {
      const sender = createSender({
        minNumberOfEvents: 1000,
        sendDeferred,
      });
      const data = getData(2);
      data.forEach(datum => sender.send(datum));
      expect(sender.getPendingEvents()).toEqual(data);
      expect(Util.createCorsXhr).not.toHaveBeenCalled();
    });

    it('should send to the configured url', () => {
      const clientMetricsUrl = 'http://localhost/testing';
      const sender = createSender({
        beaconUrl: clientMetricsUrl,
        minNumberOfEvents: 2,
        sendDeferred,
      });
      const data = getData(2);
      data.forEach(datum => sender.send(datum));
      expect(Util.createCorsXhr.args[0][0]).toBe('POST');
      expect(Util.createCorsXhr.args[0][1]).toBe(clientMetricsUrl);
    });

    it('should disable sending client metrics if configured', () => {
      const sender = createSender({
        disableSending: true,
        minNumberOfEvents: 0,
        sendDeferred,
      });
      expect(sender.isDisabled()).toBe(true);
      sender.send({});
      expect(Util.createCorsXhr).not.toHaveBeenCalled();
    });

    it('should not make a request if disabled, but still purge events', () => {
      const sender = createSender({
        disableSending: true,
        minNumberOfEvents: 0,
        sendDeferred,
      });
      const data = getData(1);
      data.forEach(datum => sender.send(datum));
      expect(Util.createCorsXhr).not.toHaveBeenCalled();
      expect(sender.getPendingEvents().length).toBe(0);
    });

    describe('when an error occurs', () => {
      it('should disable sending client metrics if there is a POST error', () => {
        const clientMetricsUrl = 'http://unknownhost/to/force/an/error';
        const sender = createSender({
          beaconUrl: clientMetricsUrl,
          minNumberOfEvents: 0,
          sendDeferred,
        });
        sender.send({});
        expect(typeof mockXhr.onerror).toBe('function');
        expect(sender.isDisabled()).toBe(false);
        mockXhr.onerror();
        expect(sender.isDisabled()).toBe(true);
      });

      it('should disable client metrics if an exception is thrown', () => {
        Util.createCorsXhr.throws();
        const sender = createSender({
          minNumberOfEvents: 0,
          sendDeferred,
        });
        const data = getData(1);
        data.forEach(datum => sender.send(datum));
        expect(sender.isDisabled()).toBe(true);
      });
    });
  });

  describe('#flush', () => {
    it('should send a batch even though the number of events is less than the minimum', () => {
      const clientMetricsUrl = 'http://localhost/testing';
      const sender = createSender({
        beaconUrl: clientMetricsUrl,
        minNumberOfEvents: 1000,
        sendDeferred,
      });
      const data = getData(2);
      data.forEach(datum => sender.send(datum));
      expect(sender.getPendingEvents()).toEqual(data);
      expect(Util.createCorsXhr).not.toHaveBeenCalled();
      sender.flush();
      expect(sender.getPendingEvents().length).toBe(0);
      expect(Util.createCorsXhr).toHaveBeenCalledOnce();
    });
  });
});
