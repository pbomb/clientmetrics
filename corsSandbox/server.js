var fs = require('fs');
var static = require('node-static');

var staticServer = new static.Server('../');

// uncomment key and cert and provide these files to run server as https
var sslOptions = {
  // key: fs.readFileSync('./key.pem'),
  // cert: fs.readFileSync('./cert.pem')
};

function serverHandler(request, response) {
  request.addListener('end', function() {
    staticServer.serve(request, response);
  }).resume();
}

var server = null;
var protocol = sslOptions.key && 'https' || 'http';

if (protocol === 'https') {
  server = require('https').createServer(sslOptions, serverHandler);
} else {
  server = require('http').createServer(serverHandler);
}


server.listen(8888, function() {
  console.log("CORS sandbox is at " + protocol + "://<hostname>:8888/corsSandbox/index.html");
});
