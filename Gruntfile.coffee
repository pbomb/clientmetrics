path = require 'path'
module.exports = (grunt) ->

  serverPort = grunt.option('port') || 8893
  inlinePort = grunt.option('port') || 8894
  docsPort = grunt.option('port') || 8895

  grunt.loadNpmTasks 'grunt-browserify'
  grunt.loadNpmTasks 'grunt-contrib-coffee'
  grunt.loadNpmTasks 'grunt-contrib-clean'
  grunt.loadNpmTasks 'grunt-contrib-jasmine'
  grunt.loadNpmTasks 'grunt-contrib-jshint'
  grunt.loadNpmTasks 'grunt-contrib-watch'
  grunt.loadNpmTasks 'grunt-contrib-copy'
  grunt.loadNpmTasks 'grunt-contrib-uglify'
  grunt.loadNpmTasks 'grunt-express'
  grunt.loadNpmTasks 'grunt-jsduck'
  grunt.loadNpmTasks 'grunt-nexus-artifact'
  grunt.loadNpmTasks 'grunt-regex-check'
  grunt.loadNpmTasks 'grunt-shell'
  grunt.loadNpmTasks 'grunt-webdriver-jasmine-runner'
  grunt.loadNpmTasks 'grunt-text-replace'
  grunt.loadNpmTasks 'grunt-open'
  grunt.loadNpmTasks 'grunt-umd'

  grunt.loadTasks 'grunt/tasks'

  grunt.registerTask 'default', ['clean', 'nexus:client:fetch', 'coffee:compile']

  grunt.registerTask 'build', 'Fetches the deps and builds the package', ['nexus', 'browserify-object', 'browserify', 'umd', 'clean:browserify', 'uglify']

  grunt.registerTask 'ci', 'Runs everything: cleans, fetches dependencies, compiles, jshint, runs the tests, buids the SDK and deploys to nexus', ['clean', 'test:setup', 'webdriver_jasmine_runner:chrome', 'webdriver_jasmine_runner:firefox', 'nexus:deploy']

  grunt.registerTask 'check', 'Run convention tests on all files', ['regex-check']

  grunt.registerTask 'doc', 'Generates the AppSDK Docs', ['clean:doc', 'coffee', 'build', 'jsduck', 'shell:ruidoc', 'copy:jsduck', 'example']
  grunt.registerTask 'doc:check', 'Generates the AppSDK Docs and opens the browser to view them', ['doc', 'express:docs', 'open:docs', 'express-keepalive']
  grunt.registerTask 'doc:check:fast', 'Generates the AppSDK Docs without rebuilding everything and opens the browser to view them', ['jsduck', 'shell:ruidoc', 'copy:jsduck', 'example', 'express:docs', 'open:docs', 'express-keepalive']

  grunt.registerTask 'nexus:deploy', 'Cleans and builds the SDK and deploys to nexus', ['clean:build', 'doc', 'version', 'nexus:client:publish']
  grunt.registerTask 'fetch', 'Fetches the dependencies from Nexus', ['nexus:client:fetch']

  grunt.registerTask 'test', 'Does the test setup and runs the tests in the default browser. Use --browser=<other> to run in a different browser, and --port=<port> for a different port.', ['test:setup', 'webdriver_jasmine_runner:appsdk']
  grunt.registerTask 'test:fast', 'Just configs and runs the tests. Does not do any compiling. grunt && grunt watch should be running.', ['test:__buildjasmineconf__', 'express:inline', 'webdriver_jasmine_runner:appsdk']
  grunt.registerTask 'test:conf', 'Fetches the deps, compiles coffee and SASS files and builds the jasmine test HTML page.', ['build', 'coffee:compile', 'test:__buildjasmineconf__']
  grunt.registerTask 'test:__buildjasmineconf__', 'Internal task to build and alter the jasmine conf', ['jasmine:metrics:build', 'replace:jasmine']
  grunt.registerTask 'test:setup', 'Fetches dependencies, compiles coffee and SASS files, runs jshint and starts jasmine server', ['nexus:client:fetch', 'coffee:compile', 'jshint', 'test:__buildjasmineconf__', 'express:inline']
  grunt.registerTask 'test:chrome', 'Sets up and runs the tests in Chrome', ['test:setup', 'webdriver_jasmine_runner:chrome']
  grunt.registerTask 'test:firefox', 'Sets up and runs the tests in Firefox', ['test:setup', 'webdriver_jasmine_runner:firefox']
  grunt.registerTask 'test:server', "Starts a Jasmine server at localhost:#{serverPort}, specify a different port with --port=<port>", ['express:server', 'express-keepalive']
  grunt.registerTask 'coffee:compile', 'Compiles all the CoffeeScript, cleaning the test output directory first', ['clean:test', 'coffee']

  spec = (grunt.option('spec') || '*').replace(/(Spec|Test)$/, '')
  debug = grunt.option('verbose') || false
  version = grunt.option('version') || '0.1.0'

  srcFiles = "src/**/*.js"
  specFiles = "test/javascripts/**/*Spec.js"

  buildDir = "builds"

  grunt.initConfig

    version: version

    clean:
      build: [
        buildDir
      ]
      test: [
        'test/javascripts'
        '_SpecRunner.html'
        '.webdriver'
      ]
      dependencies: [
        'lib'
      ]
      browserify: [
        'bundle.js'
      ]
      doc: [
        "#{buildDir}/doc"
      ]

    watch:
      coffee:
        files: '**/*.coffee'
        tasks: ['coffee:tests']
        options:
          spawn: false

    copy:
      jsduck:
        files: [
          { expand: true, cwd: 'doc/files/', src: ['*'], dest: 'builds/doc/' }
          { expand: true, cwd: 'doc/images/', src: ['**/*'], dest: 'builds/doc/images/'}
          { expand: true, cwd: 'lib/ext/4.1.1a/docs/images/', src: '**/*', dest: 'builds/doc/images/' }
          { expand: true, cwd: 'doc/sdk-examples/', src: ['default-example-icon.png', 'examples.css'], dest: 'builds/doc/examples'}
        ]

    coffee:
      tests:
        expand: true
        cwd: 'test/coffeescripts'
        src: ['**/*.coffee']
        dest: 'test/javascripts'
        ext: '.js'

    browserify:
      metrics:
        src: ['src/main.js'],
        dest: 'bundle.js',
        options:
          external: [ 'underscore', 'when' ],
          alias: ['src/main.js:RallyMetrics']

    'browserify-object':
      metrics:
        expand: true
        cwd: 'src/'
        src: ['**/*.js']
        dest: 'src/main.js'

    umd:
      metrics:
        src: 'bundle.js'
        dest: 'builds/rallymetrics.js'
        template: 'grunt/templates/umd.hbs'
        objectToExport: "require('RallyMetrics')"
        globalAlias: 'RallyMetrics'
        deps:
          'default': ['_', 'when']
          amd: ['underscore', 'when']
          cjs: ['underscore', 'when']
          global: ['_', 'when']
        browserifyMapping: '{"underscore":_, "when": when}'

    open:
      docs:
        path: "http://localhost:#{docsPort}/doc/index.html"
        app: grunt.option('browser') || 'Google Chrome'

    express:
      options:
        bases: [
          path.resolve(__dirname)
        ]
        server: path.resolve(__dirname, 'test', 'server.js')
        debug: debug
      server:
        options:
          port: serverPort
      inline:
        options:
          port: inlinePort
      docs:
        options:
          bases: [
            'builds'
          ]
          port: docsPort

    jasmine:
      metrics:
        options:
          specs: [
            "test/javascripts/**/#{spec}Spec.js"
          ]
          helpers: [
            "test/javascripts/helpers/**/*.js"
          ]
          vendor: [
            "lib/lodash/lodash.compat.js"
            "test/support/when.js"
            "builds/rallymetrics.js"

            # 3rd party libraries & customizations
            "test/support/sinon/sinon-1.6.0.js"
            "test/support/sinon/jasmine-sinon.js"
            "test/support/sinon/rally-sinon-config.js"

            # Mocks and helpers
            # "test/javascripts/support/mock/**/*.js"

            # Jasmine overrides
            "test/support/jasmine/jasmine-html-overrides.js"
          ]
          styles: [
            "test/support/jasmine/rally-jasmine.css"
          ]
          host: "http://127.0.0.1:#{inlinePort}/"


    webdriver_jasmine_runner:
      options:
        seleniumServerArgs: ['-Xmx256M']
        testServerPort: inlinePort
      appsdk: {}
      chrome:
        options:
          browser: "chrome"
      firefox:
        options:
          browser: "firefox"

    jshint:
      files: [
        'src/**/*.js'
      ]
      options:
        bitwise: true
        curly: true
        eqeqeq: true
        forin: true
        immed: true
        latedef: true
        noarg: true
        noempty: true
        nonew: true
        trailing: true
        browser: true
        unused: 'vars'
        es3: true
        laxbreak: true

    nexus:
      options:
        url: 'http://alm-build.f4tech.com:8080',
        repository: 'thirdparty'
      client:
        files: [
          { expand: true, cwd: '.', src: ['builds/**/*', 'src/**/*', 'test/**/*'] }
        ]
        options:
          fetch: grunt.file.readJSON('js_dependencies.json')
          publish: [
            { id: 'com.rallydev.js:clientmetrics:tgz', version: '<%= version %>', path: 'target/' }
          ]

    shell:
      options:
        stdout: true
        stderr: true

      # dependencies:
      #   command: [
      #     "./lib/sencha-cmd/#{if process.platform is 'darwin' then 'mac' else 'linux'}/sencha"
      #     "build"
      #     "-p #{sdkBuildPath}/dependencies.jsb3"
      #     "-d #{buildDir}"
      #   ].join(' ')

      # sdk:
      #   command: [
      #     "./lib/sencha-cmd/#{if process.platform is 'darwin' then 'mac' else 'linux'}/sencha"
      #     if debug then '-d' else ''
      #     '-s lib/ext/4.1.1a'
      #     'compile'
      #     "-classpath=#{buildDir}/sdk-dependencies-debug.js,src"
      #     'exclude -all and'
      #     'include -file src and'
      #     'exclude -namespace Rally.sdk and'
      #     'concat ' + buildDir + '/rui-debug.js and'
      #     'concat -compress ' + sdkTargetPath + '/rui.js and'
      #     'exclude -all and'
      #     'include -file lib/ext/4.1.1a and'
      #     "include -file #{sdkTargetPath}/sdk-dependencies-debug.js and"
      #     'include -file src and'
      #     '-debug=false concat ' + sdkTargetPath + '/sdk-debug.js and'
      #     '-debug=false concat -compress ' + sdkTargetPath + '/sdk.js'
      #   ].join(' ')

      # ruidoc:
      #   command: [
      #     "./lib/sencha-cmd/#{if process.platform is 'darwin' then 'mac' else 'linux'}/sencha"
      #     '-s lib/ext/4.1.1a'
      #     'compile'
      #     '-classpath=src,doc/src,test/javascripts/support/mock/data,test/support/data exclude -all and'
      #     'include -file doc/src and'
      #     'include -file test/javascripts/support/mock/data and'
      #     'include -file test/support/data and'
      #     'concat -compress builds/doc/rui-doc.js'
      #   ].join(' ')

      # jsduck:
      #  command: 'rake doc'
    jsduck:
      main:
        src: [
          'src'
        ]
        dest: 'builds/doc'
        options:
          title: 'Rally Client Metrics <%= version %> Docs'
          headHtml: '<link rel="stylesheet" href="style.css" type="text/css"><script type="text/javascript" src="JSDuckOverrides.js"></script>'
          categories: 'doc/sdk-categories.json'
          welcome: 'doc/sdk-welcome.html'
          guides: 'doc/sdk-guides.json'
          egIframe: 'doc/sdk-examples_iframe.html'
          ignoreGlobal: true
          examples: 'doc/sdk-examples.json'
          examplesBaseUrl: 'examples'
          warnings: if debug then '' else '-all'

    "regex-check":
      consolelogs:
        src: [srcFiles, specFiles]
        options:
          pattern: /console\.log/g

    replace:
      jasmine:
        src: ['_SpecRunner.html']
        overwrite: true
        replacements: [
          from: '<script src=".grunt/grunt-contrib-jasmine/reporter.js"></script>'
          to: '<!--script src=".grunt/grunt-contrib-jasmine/reporter.js"></script> removed because its slow and not used-->'
        ]

    uglify:
      js:
        files:
          'builds/rallymetrics.min.js' : 'builds/rallymetrics.js'

  # Only recompile changed coffee files
  changedFiles = Object.create null

  onChange = grunt.util._.debounce ->
    grunt.config ['coffee', 'rui'],
      expand: true
      cwd: 'test/coffeescripts'
      src: grunt.util._.map(Object.keys(changedFiles), (filepath) -> filepath.replace('test/coffeescripts/', ''))
      dest: 'test/javascripts'
      ext: '.js'

    grunt.config ['coffee', 'tests'],
      expand: true
      cwd: 'test/coffeescripts'
      src: grunt.util._.map(Object.keys(changedFiles), (filepath) -> filepath.replace('test/coffeescripts/', ''))
      dest: 'test/javascripts'
      ext: '.js'
    changedFiles = Object.create null
  , 200

  grunt.event.on 'watch', (action, filepath) ->
    changedFiles[filepath] = action
    onChange()
