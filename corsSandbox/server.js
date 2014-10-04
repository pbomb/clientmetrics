var fs = require('fs');
var static = require('node-static');

var staticServer = new static.Server('../');

var sslOptions = {
  key: fs.readFileSync('./key.pem'),
  cert: fs.readFileSync('./cert.pem')
};

require('https').createServer(sslOptions, function (request, response) {
  request.addListener('end', function() {
    staticServer.serve(request, response);
  }).resume();
}).listen(443, function() {
  require('http').createServer(function (request, response) {
    request.addListener('end', function() {
      staticServer.serve(request, response);
    }).resume();
  }).listen(80, function() {
    console.log("CORS sandbox server running on port 443, https and 80, http");
  });
});
