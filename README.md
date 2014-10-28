# Rally Metrics

This library allows your application to capture metrics and report them.

## CORS Support ##

Rally Metrics now uses CORS to send its data to the Rally beacon. The img based GETs have been completely removed, CORS is your only option.

## Tiny sandbox app ##

The tiny app at `corsSandbox` is meant to test CORS out easily, but it's also a nice smoketest to verify the beacon's working ok. See `corsSandbox/README.md` for more info

## Limitations ##

### Only one beginLoad/endLoad call per object at a time is supported ###

There is one important limitation to be aware of: **any given object can only have one `beginLoad/endLoad` event in flight
at a time**. If a second `beginLoad` call is sent for an object while one is currently pending, it will be ignored.

## Usage Guidelines ##

Try to keep these things in mind when using client metrics:

* **Shorter is probably better:** These client metric events are getting sent out to an endpoint using a GET request. IE only
allows 2084 characters for a URL, and so space is somewhat of an issue. We are batching up client metric events and
sending as many as we can fit in 2000 characters (giving us an 84 character leeway). The longer your client metric event data is,
the fewer we can fit in a payload. To keep your data shorter, there are just two things to be aware of:
    * use `miscData` sparingly.
    * Make your `description` strings as short as possible. Generally speaking, the description string does
    not need to contain the name of the component. "reload due to timebox filter change" is better than "MyDefects panel
    reload due to timebox filter change". The client metric system can figure out what component is involved and appends
    the name and type of the component to the client metrics event.
    * Don't worry about data request URLs, the system is trimming them down automatically
* **Provide a description whenever possible:** Descriptions that give us some context as to why something
happened are quite valuable. If you can give some context to the client metrics event, please do.
* **Be sure the client metric calls are accurate:** This sounds obvious, but in our experience with the panel timings
we found it can be tough to truly know when something is done loading. The accuracy of the client metrics data is
reliant on the calls being made at the correct time.
* **Hook into data requests when possible:** Sometimes getting into the data request to set the `requester`
property is difficult. But if it's reasonable to do it, please do. The data request client metric events are valuable.
