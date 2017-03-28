/**
 * Physics system.
 *
 * @class
 */
Planar.System.Physics = class extends Planar.System {
	/**
	 * Create graphics system.
	 *
	 * @constructor
	 * @param {Object} options Initialization options
	 * @param {number} options.enableSleep Allow bodies to fall asleep when they stop moving
	 */
	constructor( { enableSleep = true } = {} ) {
		super();
		this.engine = Matter.Engine.create( { enableSleep: enableSleep } );
		this.world = this.engine.world;
		this.bodies = new Map();
		this.lengths = new Map();
	}

	/**
	 * @inheritdoc
	 */
	isRelated( entity ) {
		return entity.has( 'shape', 'motion', 'transform' );
	}

	/**
	 * @inheritdoc
	 */
	add( entity ) {
		super.add( entity );
		const body = createBody( entity );
		this.bodies.set( entity.key, body );
		this.lengths.set( entity.key, entity.components.shape.points.length );
		Matter.World.add( this.world, body );
	}

	/**
	 * @inheritdoc
	 */
	delete( entity ) {
		super.delete( entity );
		const body = this.bodies.get( entity.key );
		this.bodies.delete( entity.key );
		this.lengths.delete( entity.key );
		Matter.World.remove( this.world, body );
	}

	/**
	 * @inheritdoc
	 */
	update( delta ) {
		/*jshint loopfunc: true */
		for ( let entity of this.entities ) {
			let body = this.bodies.get( entity.key );
			entity.handle( [ 'shape', 'warp' ], ( shape, warp ) => {
				if ( shape.points.length !== this.lengths.get( entity.key ) ) {
					// Replace body
					Matter.World.remove( this.world, body );
					body = createBody( entity );
					this.bodies.set( entity.key, body );
					this.lengths.set( entity.key, shape.points.length );
					Matter.World.add( this.world, body );
				} else {
					updateBody( entity, body );
				}
			} );
			entity.handle( {
				material: ( material ) => {
					Matter.Body.set( body, {
						density: material.density,
						friction: material.dynamicFriction,
						frictionAir: material.airFriction,
						frictionStatic: material.staticFriction,
						restitution: material.restitution
					} );
				},
				motion: ( motion ) => {
					Matter.Body.set( body, {
						isStatic: motion.isStatic,
						isSensor: motion.isSensor,
						timeScale: motion.timeScale
					} );
					if ( motion.preventRotation ) {
						Matter.Body.setInertia( body, Infinity );
					}
					if ( motion.force ) {
						body.force.x += motion.force.x;
						body.force.y += motion.force.y;
						motion.force.x = 0;
						motion.force.y = 0;
					}
					if ( motion.torque ) {
						body.torque += motion.torque;
						motion.torque = 0;
					}
				}
			} );
		}
		Matter.Engine.update( this.engine, delta );
		for ( let entity of this.entities ) {
			let body = this.bodies.get( entity.key );
			entity.change( {
				transform: {
					position: new Planar.Point( body.position ),
					rotation: body.angle
				},
				motion: {
					area: body.area,
					mass: body.mass,
					inertia: body.inertia,
					linearSpeed: body.speed,
					linearVelocity: new Planar.Point( body.velocity ),
					angularSpeed: body.angularSpeed,
					angularVelocity: body.angularVelocity
				}
			} );
		}
	}
};

/**
 * Create a physics body.
 *
 * @private
 * @param {Planar.Entity} entity Entity to create body for.
 * @return {Matter.Body}
 */
function createBody( entity ) {
	const { shape, transform, warp, motion } = entity.components,
		body = Matter.Bodies.fromVertices( 0, 0, [ shape.points ] );
	if ( !body ) {
		throw new Error( 'Invalid shape.' );
	}
	Matter.Body.translate( body, transform.position );
	if ( warp ) {
		Matter.Body.scale( body, warp.scale.x, warp.scale.y );
	}
	Matter.Body.rotate( body, transform.rotation );
	if ( motion.preventRotation ) {
		body.inertia = Infinity;
	}
	return body;
}

/**
 * Update a physics body.
 *
 * @private
 * @param {Planar.Entity} entity Entity to create body for.
 * @param {Matter.Body} body Body to update
 */
function updateBody( entity, body ) {
	const { shape, transform, warp } = entity.components,
		vertices = body.vertices,
		scaled = warp && ( warp.scale.x !== 1 || warp.scale.y !== 1 );
		skewed = warp && ( warp.skew.x !== 0 || warp.skew.y !== 0 );

	if ( scaled || skewed ) {
		const { pivot } = transform,
			{ scale, skew } = warp;
		for ( let i = 0, len = shape.points.length; i < len; i++ ) {
			let sx, sy,
				point = shape.points[i],
				ox = point.x - pivot.x,
				oy = point.y - pivot.y;
			if ( scaled ) {
				sx = ox *= scale.x;
				sy = oy *= scale.y;
			}
			if ( skewed ) {
				sx = ox + oy * Math.tan( skew.x );
				sy = oy + ox * Math.tan( skew.y );
			}
			vertices[i].x = pivot.x + sx;
			vertices[i].y = pivot.y + sy;
		}
	} else {
		for ( let i = 0, len = shape.points.length; i < len; i++ ) {
			( { x: vertices[i].x, y: vertices[i].y } = shape.points[i] );	
		}
	}
	Matter.Vertices.rotate( vertices, transform.rotation, transform.pivot );
	Matter.Body.setVertices( body, vertices );
}
