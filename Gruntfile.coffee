path = require 'path'
_ = require 'lodash'

module.exports = (grunt) ->

  serverPort = grunt.option('port') || 8894
  inlinePort = grunt.option('port') || 8895
  docsPort = grunt.option('port') || 8896

  grunt.loadNpmTasks 'grunt-browserify'
  grunt.loadNpmTasks 'grunt-contrib-coffee'
  grunt.loadNpmTasks 'grunt-contrib-clean'
  grunt.loadNpmTasks 'grunt-contrib-jshint'
  grunt.loadNpmTasks 'grunt-contrib-watch'
  grunt.loadNpmTasks 'grunt-contrib-uglify'
  grunt.loadNpmTasks 'grunt-express'
  grunt.loadNpmTasks 'grunt-jsdoc'
  grunt.loadNpmTasks 'grunt-mocha'
  grunt.loadNpmTasks 'grunt-regex-check'
  grunt.loadNpmTasks 'grunt-text-replace'
  grunt.loadNpmTasks 'grunt-open'
  grunt.loadNpmTasks 'grunt-umd'
  grunt.loadNpmTasks 'grunt-release'

  grunt.loadTasks 'grunt/tasks'

  grunt.registerTask 'default', ['clean', 'build', 'jshint', 'coffee:compile']

  grunt.registerTask 'build', 'Fetches the deps and builds the package', ['browserify-object', 'browserify', 'umd', 'clean:browserify', 'uglify', 'jsdoc']

  grunt.registerTask 'ci', 'Runs everything: cleans, fetches dependencies, compiles, jshint, runs the tests, buids the SDK', ['clean', 'test:setup', 'mocha']

  grunt.registerTask 'check', 'Run convention tests on all files', ['regex-check']

  grunt.registerTask 'test', 'Does the test setup and runs the tests in the default browser. Use --browser=<other> to run in a different browser, and --port=<port> for a different port.', ['test:setup', 'mocha']
  grunt.registerTask 'test:conf', 'Fetches the deps, compiles coffee and SASS files and builds the test HTML page.', ['default', 'replace:testPage']
  grunt.registerTask 'test:setup', 'Fetches dependencies, compiles coffee and SASS files, runs jshint and starts test server', ['test:conf', 'express:inline']
  grunt.registerTask 'test:server', "Starts a test server at localhost:#{serverPort}, specify a different port with --port=<port>", ['express:server', 'express-keepalive']
  grunt.registerTask 'coffee:compile', 'Compiles all the CoffeeScript, cleaning the test output directory first', ['clean:test', 'coffee']

  grunt.registerTask 'npm:publish', 'builds the package, bumps package.json, then publishes out to NPM', ['build', 'release']

  spec = (grunt.option('spec') || '*').replace(/(Spec|Test)$/, '')
  debug = grunt.option('verbose') || false
  version = grunt.option('version') || '0.1.0'

  srcFiles = "src/**/*.js"
  specFiles = grunt.file.expand ['test/**/*Spec.js']

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
      js:
        files: 'src/**/*.js'
        tasks: ['build']

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

    mocha:
      options:
        log: true
        urls: ["http://localhost:#{inlinePort}/testpage.html"]
        logErrors: true
        run: false
      client:
        reporter: 'tap'

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

    "regex-check":
      consolelogs:
        src: [srcFiles, specFiles]
        options:
          pattern: /console\.log/g

    replace:
      testPage:
        replacements: [{
          from: '__helperFiles__'
          to: _.map(grunt.file.expand(["test/javascripts/helpers/**/*.js"]), (file) ->
            "<script src=\"#{file}\"></script>"
          ).join('\n  ')
        }, {
          from: '__specFiles__'
          to: _.map(specFiles, (file) ->
            "<script src=\"#{file}\"></script>"
          ).join('\n  ')
        }]
        src: ['test/testpage.tpl']
        dest: 'test/testpage.html'

    uglify:
      js:
        files:
          'builds/rallymetrics.min.js' : 'builds/rallymetrics.js'

    jsdoc:
      dist:
        src: ['src/**/*.js']
        options:
          destination: 'doc'
          private: false

    release:
      options:
        # all of these are releases's defaults, listing them anyway to give an idea what's going on
        bump: true
        file: 'package.json'
        push: true
        commit: true
        pushTags: true

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
