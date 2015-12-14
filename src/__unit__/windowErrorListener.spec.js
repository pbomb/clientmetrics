import WindowErrorListener from '../windowErrorListener';

describe('WindowErrorListener', () => {
  let aggregator, originalOnError;
  const message = 'uhoh';
  const filename = 'file.js';
  const lineno = 22;
  const colno = 13;

  const createListener = (config) => {
    return new WindowErrorListener(aggregator, true, config);
  };

  beforeEach(() => {
    originalOnError = window.onerror = sinon.stub();
    aggregator = {
      recordError: sinon.stub()
    };
  });

  afterEach(() => {
    window.onerror = originalOnError;
  });

  it('should record the error message, file and line number', () => {
    createListener();
    window.onerror(message, filename, lineno);
    expect(aggregator.recordError).to.have.been.calledWith(message + ", " + filename + ":" + lineno, {});
  });

  it('should pass column number and stack trace if available', () => {
    createListener();
    window.onerror(message, filename, lineno, colno);
    expect(aggregator.recordError.args[0][1]).to.deep.equal({
      columnNumber: colno
    });
    const stack = 'stack trace';
    window.onerror(message, filename, lineno, colno, { stack });
    expect(aggregator.recordError.args[1][1]).to.deep.equal({
      columnNumber: colno,
      stack
    });
  });

  it('should not trim stack by default', () => {
    createListener();
    const stack = new Array(1000).map(() => 'this is a very long stack trace that should be preserved').join('\n');
    window.onerror(message, filename, lineno, colno, { stack });
    expect(aggregator.recordError.args[0][1].stack).to.equal(stack);
  });

  it('should trim stack if configured', () => {
    const stackLimit = 10;
    createListener({
      stackLimit: stackLimit
    });
    const stack = new Array(1000).map(() => 'this is a very long stack trace that should be preserved').join('\n');
    window.onerror(message, filename, lineno, colno, { stack });
    expect(aggregator.recordError.args[0][1].stack).to.equal(stack.split('\n').slice(0, stackLimit).join('\n'));
  });

  it('should gracefully deal with no error message, file and line number', () => {
    createListener();
    window.onerror({});
    const errorInfo = aggregator.recordError.args[0][0];
    expect(errorInfo).not.to.have.string('undefined');
    expect(errorInfo).to.have.string('?');
  });

  it('should maintain the existing window.onerror', () => {
    createListener();
    window.onerror(message, filename, lineno);
    expect(aggregator.recordError).to.have.been.calledWith(`${message}, ${filename}:${lineno}`);
    expect(originalOnError).to.have.been.calledWith(message, filename, lineno);
  });
});
