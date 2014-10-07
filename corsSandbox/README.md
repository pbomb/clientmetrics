# CORS Sandbox

This is a tiny server and client side app for testing client metrics CORS support

## How to set it up (assuming you are on OSX)

1. Disable the system Apache that is running on 80
  * sudo launchctl unload -w /System/Library/LaunchDaemons/org.apache.httpd.plist
  * the above disables the running Apache and keeps it disabled
1. edit /private/etc/hosts
  * add `127.0.0.1 yourname.rallydev.com`
1. launch the server: `sudo node server.js`
  * need sudo because you're running it on 80
1. visit `http://yourname.rallydev.com/corsSandbox/index.html`

You should see it send a CORS POST to trust.rallydev.com/beacon.

## Setting up the Beacon locally

To test against a local Beacon...

1. Clone the schwartz -- https://github.com/RallySoftware/schwartz-web
1. in schwart-web: `lein run`
1. In `corsSandbox/index.html`, set the beaconUrl to your local beacon
  * probably `http://localhost:8080/beacon`
