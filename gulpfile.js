var gulp = require( 'gulp' ),
	pump = require( 'pump' ),
	jshint = require( 'gulp-jshint' ),
	order = require( 'gulp-order' ),
	sourcemaps = require( 'gulp-sourcemaps' ),
	iife = require( 'gulp-iife' ),
	concat = require( 'gulp-concat' ),
	uglifyjs = require( 'uglify-js-harmony' ),
	minifier = require( 'gulp-uglify/minifier' ),
	options = {
		order: [
			'main.js',
			'Point.js',
			'Factory.js',
			'*.js',
			"inputs/**/*.js",
			"systems/**/*.js",
		],
		iife: {
			useStrict: false
		}
	};

gulp.task( 'default', [ 'build', 'watch' ] );

gulp.task( 'check', function () {
	return gulp.src( 'src/**/*.js' )
		.pipe( jshint() )
		.pipe( jshint.reporter( 'default' ) );
} );

gulp.task( 'build', function ( cb ) {
	pump( [
		gulp.src( 'src/**/*.js' ),
		order( options.order ),
		sourcemaps.init(),
		iife( options.iife ),
		concat( 'planar.js' ),
		sourcemaps.write(),
		gulp.dest( 'dist' )
	], cb );
} );

gulp.task( 'release', function ( cb ) {
	pump( [
		gulp.src( 'src/**/*.js' ),
		order( options.order ),
		sourcemaps.init(),
		iife( options.iife ),
		minifier( {}, uglifyjs ),
		concat( 'planar.min.js' ),
		sourcemaps.write(),
		gulp.dest( 'dist' )
	], cb );
} );

gulp.task( 'watch', function () {
	return gulp.watch( 'src/**/*.js', [ 'build' ] );
} );
