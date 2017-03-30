var app = new Planar.App(
		new Planar.System.Player(),
		new Planar.System.Tilemap(),
		new Planar.System.Geometry(),
		new Planar.System.Physics( { gravity: { y: 0 } } ),
		new Planar.System.Graphics( { width: 256, height: 176, roundPixels: true } )
		//new Planar.System.Stats()
	);

function loadMap() {
	return Planar.getJSON( 'res/mini-map.json' ).then( ( data ) => {
		const grid = new Planar.Entity();
		grid.add( { 'tilemapGrid': {
			size: new Planar.Point( data.size ),
			unit: data.unit,
			resource: 'res/' + data.texture
		} } );
		PIXI.loader.add( 'res/' + data.texture );

		const tiles = [];
		for ( let y = 0, yLen = data.tiles.length; y < yLen; y++ ) {
			const row = data.tiles[y];
			for ( let x = 0, xLen = row.length; x < xLen; x++ ) {
				const tile = new Planar.Entity();
				tile.add( {
					tilemapTile: {
						grid: grid.key,
						cell: new Planar.Point( x, y ),
						texture: row[x],
						block: data.blocks[y][x] !== ' '
					}
				} );
				tiles.push( tile );
			}
		}

		return [ grid ].concat( tiles );
	} );
}

function loadImages() {
	return new Promise( function ( resolve, reject ) {
		PIXI.loader.onComplete.add( resolve );
		PIXI.loader.onError.add( reject );
		PIXI.loader.load();
	} );
}

class Player extends Planar.Entity {
	constructor() {
		super();
		this.add( {
			player: {},
			shape: { type: 'rectangle', size: new Planar.Point( 16 ) },
			draw: { fillColor: 0x00FF00 },
			transform: {},
			motion: {
				preventRotation: true
			},
			material: {
				density: 0.002,// 0.001,
				dynamicFriction: 0.0,// 0.1,
				airFriction: 0.5,// 0.01,
				staticFriction: 0.0,// 0.05,
				restitution: 0
			},
		} );
	}
}

loadMap().then( function ( entities ) {
	return loadImages().then( function () {
		var scene = new Planar.Scene(),
			player = new Player();

		player.change( {
			transform: { position: { x: 256 / 2, y: 176 / 2 } }
		} );

		for ( let entity of entities ) {
			scene.add( entity );
		}
		scene.add( player );
		app.add( scene );
		app.start();
	}, function ( error ) {
		throw error;
	} );
}, function ( error ) {
	throw error;
} );
