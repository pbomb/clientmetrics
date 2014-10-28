# CORS Sandbox

This is a tiny server and client side app for testing client metrics CORS support

`node server.js` from corsSandbox will stand it up. This works fine in all browsers except IE.
IE insists your server and the beacon both use the same protocol (https).

## https for IE

[Create local certificates](http://www.akadia.com/services/ssh_test_certificate.html) then feed those
certificates into the `sslOptions` object inside `server.js`

## Setting up the Beacon locally

To test against a local Beacon...

1. Clone the schwartz -- https://github.com/RallySoftware/schwartz-web
1. in schwart-web: `lein run`
1. In `corsSandbox/index.html`, set the beaconUrl to your local beacon
  * probably `http://localhost:8080/beacon`
