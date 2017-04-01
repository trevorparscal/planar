const app = new Planar.App(
	new Planar.System.Player(),
	new Planar.System.Tilemap(),
	new Planar.System.Geometry(),
	new Planar.System.Physics( { gravity: { y: 0 } } ),
	new Planar.System.Graphics( { width: 256, height: 176, roundPixels: true } )
	//new Planar.System.Stats()
);


var tilemap = null;

function load() {
	return Promise.resolve()
		.then( () => Planar.getJSON( 'res/mini-map.json' ).then( ( data ) => tilemap = data ) )
		.then( () => new Promise( function ( resolve, reject ) {
			PIXI.loader.onComplete.add( resolve );
			PIXI.loader.onError.add( reject );
			PIXI.loader.add( 'res/sprites.json' );
			PIXI.loader.add( 'res/' + tilemap.texture );
			PIXI.loader.load();
		} ) );
}

function setup() {
	// Grid
	const grid = new Planar.Entity( { 'tilemapGrid': {
		size: { x: tilemap.size, y: tilemap.size },
		unit: tilemap.unit,
		resource: 'res/' + tilemap.texture
	} } );


	// Tiles
	const tiles = [];
	for ( let y = 0, yLen = tilemap.tiles.length; y < yLen; y++ ) {
		const row = tilemap.tiles[y];
		for ( let x = 0, xLen = row.length; x < xLen; x++ ) {
			tiles.push( new Planar.Entity( {
				tilemapTile: {
					grid: grid.key,
					cell: { x: x, y: y },
					texture: row[x],
					block: tilemap.blocks[y][x] !== ' '
				}
			} ) );
		}
	}

	// Player
	const player = new Planar.Entity( {
		player: {},
		shape: { type: 'rectangle', size: { x: 8, y: 8 } },
		sprite: {
			resource: 'res/sprites.json',
			texture: 'link-left-0',
			anchor: { x: 0.5, y: 0.75 }
		},
		transform: { position: { x: 256 / 2, y: 176 / 2 } },
		motion: {
			preventRotation: true
		},
		material: {
			density: 0.004,// 0.001,
			dynamicFriction: 0.0,// 0.1,
			airFriction: 1,// 0.01,
			staticFriction: 0.0,// 0.05,
			restitution: 0
		},
	} );

	// Scene
	const scene = new Planar.Scene( ...[ grid ].concat( tiles ).concat( player ) );
	app.add( scene );
}

load().then( setup ).then( app.start.bind( app ) );
