module.exports = function(grunt) {
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-jsdoc');
  grunt.loadNpmTasks('grunt-release');
  grunt.registerTask('default', ['jsdoc']);

  const version = grunt.option('version') || '0.1.0';
  grunt.initConfig({
    version: version,
    clean: {
      docs: ['doc']
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
