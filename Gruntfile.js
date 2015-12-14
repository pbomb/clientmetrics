var path = require('path');

module.exports = function(grunt) {
  var serverPort = grunt.option('port') || 8894;
  var inlinePort = grunt.option('port') || 8895;
  var docsPort = grunt.option('port') || 8896;
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-express');
  grunt.loadNpmTasks('grunt-jsdoc');
  grunt.loadNpmTasks('grunt-mocha');
  grunt.loadNpmTasks('grunt-text-replace');
  grunt.loadNpmTasks('grunt-open');
  grunt.loadNpmTasks('grunt-release');
  grunt.loadTasks('grunt/tasks');
  grunt.registerTask('default', ['ci']);
  grunt.registerTask('ci', 'Runs everything: cleans and runs the tests', ['clean', 'test:setup', 'mocha']);
  grunt.registerTask('test', 'Does the test setup and runs the tests in the default browser. Use --browser=<other> to run in a different browser, and --port=<port> for a different port.', ['test:setup', 'mocha']);
  grunt.registerTask('test:conf', 'builds the test HTML page.', ['replace:testPage']);
  grunt.registerTask('test:setup', 'configures the tests and starts test server', ['test:conf', 'express:inline']);
  grunt.registerTask('test:server', "configures the tests and starts a test server at localhost:" + serverPort + ", specify a different port with --port=<port>", ['test:conf', 'express:server', 'express-keepalive']);

  var spec = (grunt.option('spec') || '*').replace(/(Spec|Test)$/, '');
  var debug = grunt.option('verbose') || false;
  var version = grunt.option('version') || '0.1.0';
  var srcFiles = "src/**/*.js";
  var specFiles = function() {
    return grunt.file.expand(['test/**/*Spec.js']);
  };
  grunt.initConfig({
    version: version,
    clean: {
      test: ['test/javascripts', '_SpecRunner.html', '.webdriver']
    },
    express: {
      options: {
        bases: [path.resolve(__dirname)],
        server: path.resolve(__dirname, 'test', 'server.js'),
        debug: debug
      },
      server: {
        options: {
          port: serverPort
        }
      },
      inline: {
        options: {
          port: inlinePort
        }
      },
      docs: {
        options: {
          bases: ['builds'],
          port: docsPort
        }
      }
    },
    mocha: {
      options: {
        log: true,
        urls: ["http://localhost:" + inlinePort + "/testpage.html"],
        logErrors: true,
        run: false,
        globals: ['addEventListener']
      },
      client: {
        reporter: 'tap'
      }
    },
    replace: {
      testPage: {
        replacements: [
          {
            from: '__helperFiles__',
            to: function() {
              return grunt.file.expand(["test/javascripts/helpers/**/*.js"]).map(function(file) {
                return "<script src=\"" + file + "\"></script>";
              }).join('\n  ');
            }
          }, {
            from: '__specFiles__',
            to: function() {
              return specFiles().map(function(file) {
                return "<script src=\"" + file + "\"></script>";
              }).join('\n  ');
            }
          }
        ],
        src: ['test/testpage.tpl'],
        dest: 'test/testpage.html'
      }
    },
    jsdoc: {
      dist: {
        src: ['src/**/*.js'],
        options: {
          destination: 'doc',
          "private": false
        }
      }
    },
    release: {
      options: {
        bump: true,
        file: 'package.json',
        push: true,
        commit: true,
        pushTags: true
      }
    }
  });
};
