path = require 'path'
module.exports = (grunt) ->

  serverPort = grunt.option('port') || 8894
  inlinePort = grunt.option('port') || 8895
  docsPort = grunt.option('port') || 8896

  grunt.loadNpmTasks 'grunt-browserify'
  grunt.loadNpmTasks 'grunt-contrib-coffee'
  grunt.loadNpmTasks 'grunt-contrib-clean'
  grunt.loadNpmTasks 'grunt-contrib-jasmine'
  grunt.loadNpmTasks 'grunt-contrib-jshint'
  grunt.loadNpmTasks 'grunt-contrib-watch'
  grunt.loadNpmTasks 'grunt-contrib-uglify'
  grunt.loadNpmTasks 'grunt-express'
  grunt.loadNpmTasks 'grunt-jsduck'
  grunt.loadNpmTasks 'grunt-nexus-artifact'
  grunt.loadNpmTasks 'grunt-regex-check'
  grunt.loadNpmTasks 'grunt-webdriver-jasmine-runner'
  grunt.loadNpmTasks 'grunt-text-replace'
  grunt.loadNpmTasks 'grunt-open'
  grunt.loadNpmTasks 'grunt-umd'

  grunt.loadTasks 'grunt/tasks'

  grunt.registerTask 'default', ['clean', 'nexus:client:fetch', 'coffee:compile']

  grunt.registerTask 'build', 'Fetches the deps and builds the package', ['nexus', 'browserify-object', 'browserify', 'umd', 'clean:browserify', 'uglify']

  grunt.registerTask 'ci', 'Runs everything: cleans, fetches dependencies, compiles, jshint, runs the tests, buids the SDK and deploys to nexus', ['clean', 'test:setup', 'webdriver_jasmine_runner:chrome', 'webdriver_jasmine_runner:firefox', 'nexus:deploy']

  grunt.registerTask 'check', 'Run convention tests on all files', ['regex-check']

  grunt.registerTask 'nexus:deploy', 'Cleans and builds the SDK and deploys to nexus', ['clean:build', 'build', 'nexus:client:publish']
  grunt.registerTask 'fetch', 'Fetches the dependencies from Nexus', ['clean:dependencies', 'nexus:client:fetch']

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

    watch:
      coffee:
        files: '**/*.coffee'
        tasks: ['coffee:tests']
        options:
          spawn: false

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
          external: [ 'underscore' ],
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
          'default': ['_']
          amd: ['underscore']
          cjs: ['underscore']
          global: ['_']
        browserifyMapping: '{"underscore":_}'

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
            "test/support/sinon/sinon-1.7.3.js"
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
        '!src/main.js'
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
            { id: 'com.rallydev.js:rallymetrics:tgz', version: '<%= version %>', path: 'target/' }
          ]

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
