var gulp = require( 'gulp' ),
	pump = require( 'pump' ),
	jshint = require( 'gulp-jshint' ),
	order = require( 'gulp-order' ),
	sourcemaps = require( 'gulp-sourcemaps' ),
	iife = require( 'gulp-iife' ),
	concat = require( 'gulp-concat' ),
	uglifyjs = require( 'uglify-js-harmony' ),
	minifier = require( 'gulp-uglify/minifier' );

gulp.task( 'default', [
	'build',
	'build-physics',
	'build-zelda',
	'build-collision',
	'build-intersection',
	'watch'
] );

gulp.task( 'check', function () {
	return gulp.src( 'src/**/*.js' )
		.pipe( jshint() )
		.pipe( jshint.reporter( 'default' ) );
} );

gulp.task( 'build', function ( cb ) {
	pump( [
		gulp.src( 'src/**/*.js' ),
		order( [
			'main.js',
			'Point.js',
			'Factory.js',
			'*.js',
			'inputs/**/*.js',
			'systems/**/*.js',
		] ),
		sourcemaps.init(),
		iife( { useStrict: false } ),
		concat( 'planar.js' ),
		sourcemaps.write(),
		gulp.dest( 'dist' )
	], cb );
} );

gulp.task( 'build-physics', function ( cb ) {
	pump( [
		gulp.src( 'demos/physics/src/**/*.js' ),
		order( [
			'systems/**/*.js',
			'main.js'
		] ),
		sourcemaps.init(),
		iife( { useStrict: false } ),
		concat( 'physics.js' ),
		sourcemaps.write(),
		gulp.dest( 'demos/physics/dist' )
	], cb );
} );

gulp.task( 'build-zelda', function ( cb ) {
	pump( [
		gulp.src( 'demos/zelda/src/**/*.js' ),
		order( [
			'systems/**/*.js',
			'main.js'
		] ),
		sourcemaps.init(),
		iife( { useStrict: false } ),
		concat( 'zelda.js' ),
		sourcemaps.write(),
		gulp.dest( 'demos/zelda/dist' )
	], cb );
} );

gulp.task( 'build-collision', function ( cb ) {
	pump( [
		gulp.src( 'demos/collision/src/**/*.js' ),
		order( [
			'structures/SpatialPartition.js',
			'structures/**/*.js',
			'algorithms/**/*.js',
			'main.js'
		] ),
		sourcemaps.init(),
		iife( { useStrict: false } ),
		concat( 'collision.js' ),
		sourcemaps.write(),
		gulp.dest( 'demos/collision/dist' )
	], cb );
} );

gulp.task( 'build-intersection', function ( cb ) {
	pump( [
		gulp.src( 'demos/intersection/src/**/*.js' ),
		order( [
			'Collision.js',
			'Demo.js',
			'main.js'
		] ),
		sourcemaps.init(),
		iife( { useStrict: false } ),
		concat( 'intersection.js' ),
		sourcemaps.write(),
		gulp.dest( 'demos/intersection/dist' )
	], cb );
} );

gulp.task( 'release', function ( cb ) {
	pump( [
		gulp.src( 'src/**/*.js' ),
		order( options.order ),
		sourcemaps.init(),
		iife( { useStrict: false } ),
		minifier( {}, uglifyjs ),
		concat( 'planar.min.js' ),
		sourcemaps.write(),
		gulp.dest( 'dist' )
	], cb );
} );

gulp.task( 'watch', function () {
	gulp.watch( 'src/**/*.js', [ 'build' ] );
	gulp.watch( [ 'demos/physics/src/**/*.js' ], [ 'build-physics' ] );
	gulp.watch( [ 'demos/zelda/src/**/*.js' ], [ 'build-zelda' ] );
	gulp.watch( [ 'demos/collision/src/**/*.js' ], [ 'build-collision' ] );
	gulp.watch( [ 'demos/intersection/src/**/*.js' ], [ 'build-intersection' ] );
} );
