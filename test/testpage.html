<html>
<head>
  <meta charset="utf-8">
  <title>Mocha Tests</title>
  <link rel="stylesheet" href="node_modules/mocha/mocha.css" />
</head>
<body>
  <div id="mocha"></div>
  <script type="text/javascript">
    (function() {

    var Ap = Array.prototype;
    var slice = Ap.slice;
    var Fp = Function.prototype;

    if (!Fp.bind) {
      // PhantomJS doesn't support Function.prototype.bind natively, so
      // polyfill it whenever this module is required.
      Fp.bind = function(context) {
        var func = this;
        var args = slice.call(arguments, 1);

        function bound() {
          var invokedAsConstructor = func.prototype && (this instanceof func);
          return func.apply(
            // Ignore the context parameter when invoking the bound function
            // as a constructor. Note that this includes not only constructor
            // invocations using the new keyword but also calls to base class
            // constructors such as BaseClass.call(this, ...) or super(...).
            !invokedAsConstructor && context || this,
            args.concat(slice.call(arguments))
          );
        }

        // The bound function must share the .prototype of the unbound
        // function so that any object created by one constructor will count
        // as an instance of both constructors.
        bound.prototype = func.prototype;

        return bound;
      };
    }

    })();
  </script>

  <script src="node_modules/mocha/mocha.js"></script>
  <script>
    mocha.setup('bdd');
    mocha.checkLeaks();
    mocha.globals(['addEventListener']);
  </script>

  <!-- Vendor files -->

  <script src="node_modules/chai/chai.js"></script>
  <script src="node_modules/sinon/pkg/sinon.js"></script>
  <script src="node_modules/sinon-chai/lib/sinon-chai.js"></script>
  <script src="test/support/when.js"></script>

  <script src="test/rallymetrics-test.js"></script>

  <script type="text/javascript">
      setTimeout(function() {
        mocha.run();
      }, 1);
  </script>
</body>
</html>
