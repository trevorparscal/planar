var app = new Planar.App(
	new Planar.System.Player(),
	new Planar.System.Animation(),
	new Planar.System.Geometry(),
	new Planar.System.Physics(),
	new Planar.System.Graphics(),
	new Planar.System.Stats()
);

var scene = new Planar.Scene();

function addShape( x, y, size, player ) {
	var shape = new Planar.Entity();
	if ( player ) {
		shape.add( { 'player': {} } );
	}
	shape.add( {
		animation: {},
		shape: [
			{ type: 'rectangle', size: new Planar.Point( size ) },
			{ type: 'circle', radius: size / 2 },
			{ type: 'ngon', radius: size / 2, sides: 3 },
			{ type: 'ngon', radius: size / 2, sides: 5 }
		][Math.round( Math.random() * 3 )],
		draw: {
			fillColor: player ? 0x00CCEE : PIXI.utils.rgb2hex( [
				0.2 + Math.random() * 0.75,
				0.2 + Math.random() * 0.75,
				0.2 + Math.random() * 0.75
			] )
		},
		transform: {
			position: new Planar.Point( x, y ),
			rotation: Math.random() * ( Math.PI / 2 )
		},
		warp: {
			//scale: new Planar.Point( 0.5 + Math.random() * 2, 0.5 + Math.random() * 2 )
		},
		motion: {},
		material: {}
	} );
	scene.add( shape );
	console.log(
		`%c  %c ${shape.key}: ${shape.components.shape.hash}`,
		'background: ' + PIXI.utils.hex2string( shape.components.draw.fillColor ) + ';',
		'background: white;'
	);
}

function addPlatform( x, y, width, height ) {
	var platform = new Planar.Entity();
	platform.add( {
		shape: { type: 'rectangle', size: new Planar.Point( width, height ) },
		draw: { fillColor: 0x444444 },
		transform: { position: new Planar.Point( x, y ) },
		motion: { isStatic: true },
		material: {}
	} );
	scene.add( platform );
}

for ( let i = 0; i < 5; i++ ) {
	addShape( 128 + 32 * i, 96, 32, i === 1 );
}
addPlatform( 256, 32, 512, 64 );
addPlatform( 256, 480, 512, 64 );
addPlatform( 32, 224, 64, 448 );
addPlatform( 480, 224, 64, 448 );

app.add( scene );

app.start();
