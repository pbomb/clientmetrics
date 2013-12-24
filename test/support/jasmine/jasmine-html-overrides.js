(function() {
  jasmine.HtmlReporter.sectionLink = function(sectionName) {
    var link = '?';
    var params = this.parameters(window.document);

    if (sectionName) {
      params.push('spec=' + encodeURIComponent(sectionName));
    }
    if (!jasmine.CATCH_EXCEPTIONS) {
      params.push("catch=false");
    }
    if (params.length > 0) {
      link += params.join("&");
    }

    return link;
  };

  var proto = jasmine.HtmlReporter.SpecView.prototype;
  jasmine.HtmlReporter.SpecView = function(spec, dom, views) {
    this.spec = spec;
    this.dom = dom;
    this.views = views;

    this.symbol = this.createDom('li', { className: 'pending' });
    this.dom.symbolSummary.appendChild(this.symbol);

    this.summary = this.createDom('div', { className: 'specSummary' },
      this.createDom('a', {
        className: 'description',
        href: jasmine.HtmlReporter.sectionLink(this.spec.getFullName()),
        title: this.spec.getFullName()
      }, this.spec.description)
    );

    this.detail = this.createDom('div', { className: 'specDetail' },
        this.createDom('a', {
          className: 'description',
          href: '?' + jasmine.HtmlReporter.parameters(window.document).concat('spec=' + encodeURIComponent(this.spec.getFullName())).join('&'),
          title: this.spec.getFullName()
        }, this.spec.getFullName())
    );
  };
  jasmine.HtmlReporter.SpecView.prototype = proto;
})();