'use strict';

var fs = require('fs');
var path = require('path');

module.exports = function (grunt) {
  grunt.registerMultiTask('browserify-object', 'Grunt task to generate a master object for browserify.', function () {
    var opts = this.data;
    var masterObj = {};

    var addFileToObj = function(file) {
      if (file === opts.dest) {
        return;
      }
      var truncatedFile = file.substring(opts.cwd.length, file.length - 3);
      var parts = truncatedFile.split('/');
      var currentObj = masterObj;
      var partsLength = parts.length;
      parts.forEach(function(part, idx) {
        if (idx < parts.length - 1) {
          if (!currentObj[part]) {
            currentObj[part] = {};
          }
          currentObj = currentObj[part];
        } else {
          currentObj[part.charAt(0).toUpperCase() + part.slice(1)] = 'require ("./' + truncatedFile + '")';
        }
      });
      grunt.log.debug('file', truncatedFile);
    };

    var stringifyObj = function(obj, indent) {
      var str;
      if (grunt.util.kindOf(obj) === 'string') {
        str = obj + '\n';
      } else {
        str = '{' + grunt.util.linefeed;

        var index = 0;
        for (var key in obj) {
          if (obj.hasOwnProperty(key)) {
            str += grunt.util.repeat(indent + 1, '\t');
            if (index > 0) {
              str += ',';
            }
            str += '"' + key + '": ';
            str += stringifyObj(obj[key], indent + 1);

            index++;
          }
        }

        str += grunt.util.repeat(indent, '\t') + '}\n';
      }
      return str;
    };

    // var destPath = path.dirname(path.resolve(opts.dest));
    // if (!grunt.file.exists(destPath)) {
    //   grunt.file.mkdir(destPath);
    // }

    grunt.log.debug('cwd', opts.cwd);
    grunt.log.debug('this.files', this.files);
    // grunt.file.setBase(opts.cwd);
    this.files.forEach(function(file, index) {
      grunt.file.expand({filter: 'isFile'}, file.src).forEach(addFileToObj);
    });

    grunt.log.warn(JSON.stringify(masterObj));
    grunt.file.write(opts.dest, 'module.exports = ' + stringifyObj(masterObj, 0) + ';');
    grunt.log.ok('Generated object file ' + opts.dest);
    return true;
  });
};

