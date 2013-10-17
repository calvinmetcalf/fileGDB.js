module.exports = function(grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		browserify: {
			build: {
				files: {
					'dist/<%= pkg.name %>.js': ['lib/index.js']
				},
				options: {
					standalone: '<%= pkg.name %>'
				}
			},
			site: {
				files: {
					'site/bundle.js': ['site/script.js']
				}
			}
		},
		uglify: {
			options: {
				report: 'gzip',
				mangle: true
			},
			build: {
				src: 'dist/<%= pkg.name %>.js',
				dest: 'dist/<%= pkg.name %>.min.js'
			},
			site: {
				src: 'site/bundle.js',
				dest: 'site/bundle.js'
			}
		}
	});
	grunt.loadNpmTasks('grunt-browserify');
	//grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.registerTask("build", ["browserify:build", "uglify:build"]);
	grunt.registerTask("site", ["browserify:site", "uglify:site"]);
	grunt.registerTask("default", ["build","site"]);
};