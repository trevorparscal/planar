class Demo {
	/**
	 * @constructor
	 * @param {Function} Type Constructor for space partitioning data structure
	 */
	constructor( id, Type, field ) {
		// Properties
		this.canvas = document.getElementById( id );
		this.canvasContext = this.canvas.getContext( '2d' );
		this.space = new Type( {
			x: 32, y: 32, width: this.canvas.width - 64, height: this.canvas.height - 64
		} );
		this.isMouseOver = false;
		this.cursor = { x: 0, y: 0, width: 5, height: 5 };
		this.regions = {};
		this.objects = {};
		this.loop = this.loop.bind( this );
		this.then = null;
		this.collision = new Collision();

		// Events
		this.canvas.addEventListener( 'mousemove', ( e ) => {
			const cursor = this.cursor;
			cursor.x = e.offsetX - ( cursor.width / 2 );
			cursor.y = e.offsetY - ( cursor.height / 2 );
		} );
		this.canvas.addEventListener( 'mouseover', ( e ) => {
			this.isMouseOver = true;
			this.start();
		} );
		this.canvas.addEventListener( 'mouseout', ( e ) => {
			this.isMouseOver = false;
			this.stop();
		} );

		// Initialization
		this.seed();

		//this.stats = new Stats();
		//this.stats.showPanel( 1 );
		//document.body.appendChild( this.stats.dom );
	}

	start() {
		this.running = true;
		this.then = performance.now();
		this.loop();
	}

	stop() {
		this.running = false;
	}

	/*
	 * Add randomly placed objects.
	 *
	 * @param {number} [count=200] Number of objects to generate
	 */
	seed( count = 1000 ) {
		/**
		 * Get a random number in a range.
		 *
		 * @private
		 * @param {number} min Lowest number allowed
		 * @param {number} max Highest number allowed
		 * @param {boolean} round Return integer
		 * @return {number} Random number
		 */
		function random( min, max, round ) {
			const val = min + ( Math.random() * ( max - min ) );
			return round ? Math.round( val ) : val;
		}

		const cnv = this.canvas,
			regions = this.regions,
			objects = this.objects;
		for ( let key = 0; key < count; key++ ) {
			regions[key] = {
				x: random( 0, cnv.width ),
				y: random( 0, cnv.height ),
				width: random( 2, 10 ),
				height: random( 2, 10 )
			};
			objects[key] = {
				velocity: {
					x: random( -0.1, 0.2 ),
					y: random( -0.1, 0.2 )
				},
				check: false
			};
		}
	}

	/*
	 * Draw objects.
	 */
	draw() {
		const ctx = this.canvasContext,
			regions = this.regions,
			objects = this.objects;
		for ( let key in regions ) {
			const reg = regions[key],
				obj = objects[key];
			if ( obj.check ) {
				ctx.fillStyle = 'rgba(255,128,0,0.5)';
				ctx.fillRect( reg.x, reg.y, reg.width, reg.height );
			} else {
				ctx.strokeStyle = 'rgba(0,0,0,0.5)';
				ctx.strokeRect( reg.x, reg.y, reg.width, reg.height );
			}
		}
	}

	/**
	 * Loop animation.
	 */
	loop() {
		if ( !this.running ) {
			return;
		}

		const now = performance.now(),
			delta = this.then - now,
			cnv = this.canvas,
			ctx = this.canvasContext,
			cursor = this.cursor,
			regions = this.regions,
			objects = this.objects,
			field = this.space.field;

		ctx.clearRect( 0, 0, cnv.width, cnv.height );
		ctx.strokeStyle = 'rgba(0,255,127,0.5)';
		ctx.strokeRect( field.x, field.y, field.width, field.height );

		//this.stats.begin();
		this.space.clear();
		for ( let key in regions ) {
			const reg = regions[key],
				obj = objects[key];
			// Movement
			reg.x += obj.velocity.x * delta;
			reg.y += obj.velocity.y * delta;
			// Highlighting
			obj.check = false;
			// Wrapping
			if ( reg.x > cnv.width ) {
				reg.x = 0;
			}
			if ( reg.x + reg.width < 0 ) {
				reg.x = cnv.width;
			}
			if ( reg.y > cnv.height ) {
				reg.y = 0;
			}
			if ( reg.y + reg.height < 0 ) {
				reg.y = cnv.height;
			}
			this.space.add( key, reg );
		}
		//this.stats.end();

		if ( this.isMouseOver ) {
			ctx.fillStyle = 'rgba(0,0,0,0.5)';
			ctx.fillRect( cursor.x, cursor.y, cursor.width, cursor.height );

			// Retrieve all objects in the bounds of the cursor
			const keys = this.space.find( cursor );

			// Flag retrieved objects
			const a = Collision.Box.toPolygon( {
				position: { x: cursor.x, y: cursor.y }, width: cursor.width, height: cursor.height
			} );
			for ( let key of keys ) {
				const reg = regions[key],
					obj = objects[key];

				objects[key].check = true;

				// Handle collision
				const b = Collision.Box.toPolygon( {
						position: { x: reg.x, y: reg.y }, width: reg.width, height: reg.height
					} ),
					response = new Collision.Response();
				if ( this.collision.test( a, b, response ) ) {
					Collision.Vector.add( reg, response.overlapV );
					Collision.Vector.reflectN( obj.velocity, response.overlapN );
					Collision.Vector.reverse( obj.velocity );
				}
			}
		}

		this.draw();
		this.then = now;
		requestAnimationFrame( this.loop );
	}
}

/**
 * Quadtree demo.
 *
 * @class
 */
class QuadtreeDemo extends Demo {
	/**
	 * @constructor
	 * @param {string} id CSS ID of canvas
	 */
	constructor( id, field ) {
		super( id, Quadtree, field );
	}

	/*
	 * Draw Quadtree nodes.
	 */
	draw() {
		super.draw();
		const ctx = this.canvasContext;

		function draw( node ) {
			const field = node.field,
				subnodes = node.nodes;
			if ( subnodes.length === 0 ) {
				ctx.strokeStyle = 'rgba(0,128,255,0.5)';
				ctx.strokeRect( field.x, field.y, field.width, field.height );
			} else {
				for ( let child of subnodes ) {
					draw( child );
				}
			}
		}
		draw( this.space );
	}
}

/**
 * SpatialHash demo.
 *
 * @class
 */
class SpatialHashDemo extends Demo {
	/**
	 * @constructor
	 * @param {string} id CSS ID of canvas
	 */
	constructor( id, field ) {
		super( id, SpatialHash, field );
	}

	/*
	 * Draw SpatialHash buckets.
	 */
	draw() {
		super.draw();
		const ctx = this.canvasContext;

		const { field, divisions } = this.space,
			col = field.width / divisions,
			row = field.height / divisions;
		for ( let x = 0; x < divisions; x++ ) {
			for ( let y = 0; y < divisions; y++ ) {
				ctx.strokeStyle = 'rgba(0,128,255,0.5)';
				ctx.strokeRect( field.x + col * x, field.y + row * y, col, row );
			}
		}
	}
}

window.QuadtreeDemo = QuadtreeDemo;
window.SpatialHashDemo = SpatialHashDemo;
