# Planar

> Planar is an ES6 game engine for the web

## Usage

	var app = new Planar.App(
		new Planar.System.Geometry(),
		new Planar.System.Physics(),
		new Planar.System.Graphics( { width: 512, height: 512 } )
	);

	var scene = new Planar.Scene();

	var shape = new Planar.Entity( app );
	shape.add( {
		shape: { type: 'circle', radius: 32, },
		draw: { fillColor: 0x00CCEE },
		transform: { position: new Planar.Point( 256, 64 ) },
		motion: {},
		material: {}
	} );
	scene.add( shape );

	var platform = new Planar.Entity( app );
	platform.add( {
		shape: { type: 'rectangle', width: 512, height: 64 },
		draw: { fillColor: 0xFF0000 },
		transform: { position: new Planar.Point( 256, 480 ) },
		motion: { isStatic: true },
		material: {}
	} );
	scene.add( platform );

	app.add( scene );

	app.start();
