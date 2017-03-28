/**
 * Based on Intersect by Nathan Ostgard.
 * @licence MIT
 * @link https://git.io/vSmWe
 */

window.Collision = {
	/**
	 * Math utilities.
	 *
	 * @class
	 */
	Math: {
		/**
		 * Clamp a value within a range.
		 *
		 * @param {number} value Number to clamp
		 * @param {number} min Minimum value
		 * @param {number} max Maximum value
		 * @return {number} Clamped number
		 */
		clamp: function ( value, min, max ) {
			return value < min ? min : ( value > max ? max : value );
		}
	},

	/**
	 * Point utilities.
	 *
	 * @class
	 */
	Point: {
		/**
		 * Create a point.
		 *
		 * Returns a plain object.
		 *
		 * @param {number} x Horizontal position
		 * @param {number} x Vertical position
		 * @param {CollisionPoint} Created point
		 */
		create: function ( x = 0, y = 0 ) {
			return { x: x, y: y };
		},

		/**
		 * Clone a point.
		 *
		 * @param {Point} point Point to clone
		 * @param {CollisionPoint} Cloned point
		 */
		clone: function ( point ) {
			return { x: this.x, y: this.y };
		},

		/**
		 * Get the length of a line to a point from its origin.
		 *
		 * @param {Point} point Point to mesure the length of
		 * @return {number} Point length
		 */
		length: function ( point ) {
			const length = point.x * point.x + point.y * point.y;
			if ( length > 0 ) {
				return Math.sqrt( length );
			}
		},

		/**
		 * Normalize a point so it is in the same direction but in the range of [0..1].
		 *
		 * Modifies the point in place.
		 *
		 * @param {Point} point Point to normalize
		 */
		normalize: function ( point ) {
			const length = Collision.Point.length( point );
			if ( length > 0 ) {
				const inverseLength = 1.0 / length;
				point.x *= inverseLength;
				point.y *= inverseLength;
			}
		}
	}
};

/**
 * Hit of one object on another.
 *
 * @class
 */
Collision.Hit = class {
	/**
	 * Create a hit.
	 *
	 * @constructor
	 * @param {Point|Shape} collider Object being collision with, copied by reference
	 */
	constructor ( collider ) {
		/**
		 * @property {Point|Shape} Object being collided with
		 */
		this.collider = collider;
		/**
		 * @property {Vector} Position of the collision
		 */
		this.position = { x: 0, y: 0 };
		/**
		 * @property {Vector} Translation to be applied to `a` to prevent intersection with `b`
		 */
		this.delta = { x: 0, y: 0 };
		/**
		 * @property {Vector} Direction of collision, can be used to reflect `a` away from `b`
		 */
		this.normal = { x: 0, y: 0 };
	}
};

/**
 * Sweep from one object to another.
 *
 * @class
 */
Collision.Sweep = class {
	/**
	 * Create a sweep.
	 *
	 * @constructor
	 */
	constructor() {
		/**
		 * @property {Hit} Hit information for collision
		 */
		this.hit = null;
		/**
		 * @property {Vector} The furthest point the object reached along the sweep path before
		 *  intersecting, can be used as the new position of the swept object to avoid collision,
		 *  equivilent to subtracting `hit.delta` from `hit.a.position`
		 */
		this.position = { x: 0, y: 0 };
		/**
		 * @property {number} Proportion of sweep length that can be applied before intersection in
		 *  the range of [0..1], provided by sweeping tests
		 */
		this.time = 1;
	}
};

/**
 * @typedef {CollisionAABB}
 * @property {Vector} position Position of box
 * @property {Vector} half Distance from the center to the outside edges along each axis
 */

Collision.AABB = {
	/**
	 * Create an axis-aligned bounding-box.
	 *
	 * @param {Vector} position Position of box, copied by value
	 * @param {Vector} half Distance from the center to the outside edges along each axis, copied by
	 *  value
	 * @return {CollisionAABB} Created AABB
	 */
	create: function ( { x = 0, y = 0 } = {}, { hx = 0, hy = 0 } = {} ) {
		return { position: { x: x, y: x }, half: { x: hx, y: hy } };
	},

	/**
	 * Check if a point is inside an AABB.
	 *
	 * @param {CollisionAABB} aabb AABB to test intersection with
	 * @param {CollisionPoint} point Point to test for collision
	 * @return {Collision.Hit|null} Hit if intersection occured, null otherwise
	 */
	intersectPoint: function ( aabb, point ) {
		var dx, dy, hit, px, py, sx, sy;
		dx = point.x - aabb.position.x;
		px = aabb.half.x - Math.abs( dx );
		if ( px <= 0 ) {
			return null;
		}
		dy = point.y - aabb.position.y;
		py = aabb.half.y - Math.abs( dy );
		if ( py <= 0 ) {
			return null;
		}
		hit = new Hit( aabb );
		if ( px < py ) {
			sx = Math.sign( dx );
			hit.delta.x = px * sx;
			hit.normal.x = sx;
			hit.position.x = aabb.position.x + ( aabb.half.x * sx );
			hit.position.y = point.y;
		} else {
			sy = Math.sign( dy );
			hit.delta.y = py * sy;
			hit.normal.y = sy;
			hit.position.x = point.x;
			hit.position.y = aabb.position.y + ( aabb.half.y * sy );
		}
		return hit;
	},

	/**
	 * Check if a line segment runs into or through an AABB.
	 *
	 * @param {CollisionAABB} aabb AABB to test intersection with
	 * @param {CollisionPoint} position Line segment start
	 * @param {CollisionPoint} delta Line segment end, relative to start
	 * @param {CollisionPoint} padding Space to be added around the aabb during testing
	 * @return {Collision.Hit|null} Hit if intersection occured, null otherwise
	 */
	intersectSegment: function ( aabb, start, delta, padding ) {
		var farTime, farTimeX, farTimeY, hit, nearTime, nearTimeX, nearTimeY, scaleX, scaleY, signX,
			signY;
		const { x: paddingX = 0, y: paddingY = 0 } = padding;

		scaleX = 1.0 / delta.x;
		scaleY = 1.0 / delta.y;
		signX = Math.sign( scaleX );
		signY = Math.sign( scaleY );
		nearTimeX = ( aabb.position.x - signX * ( aabb.half.x + paddingX ) - start.x ) * scaleX;
		nearTimeY = ( aabb.position.y - signY * ( aabb.half.y + paddingY ) - start.y ) * scaleY;
		farTimeX = ( aabb.position.x + signX * ( aabb.half.x + paddingX ) - start.x ) * scaleX;
		farTimeY = ( aabb.position.y + signY * ( aabb.half.y + paddingY ) - start.y ) * scaleY;
		if ( nearTimeX > farTimeY || nearTimeY > farTimeX ) {
			return null;
		}
		nearTime = nearTimeX > nearTimeY ? nearTimeX : nearTimeY;
		farTime = farTimeX < farTimeY ? farTimeX : farTimeY;
		if ( nearTime >= 1 || farTime <= 0 ) {
			return null;
		}
		hit = new Hit( aabb );
		hit.time = Collision.Math.clamp( nearTime, 0, 1 );
		if ( nearTimeX > nearTimeY ) {
			hit.normal.x = -signX;
			hit.normal.y = 0;
		} else {
			hit.normal.x = 0;
			hit.normal.y = -signY;
		}
		hit.delta.x = hit.time * delta.x;
		hit.delta.y = hit.time * delta.y;
		hit.position.x = start.x + hit.delta.x;
		hit.position.y = start.y + hit.delta.y;
		return hit;
	},

	/**
	 * Check if an AABB intersects another AABB.
	 *
	 * @param {CollisionAABB} aabb AABB to test intersection with
	 * @param {[type]} box [description]
	 * @return {[type]} [description]
	 */
	intersectAABB: function ( aabb, box ) {
		var dx, dy, hit, px, py, sx, sy;
		dx = box.position.x - aabb.position.x;
		px = ( box.half.x + aabb.half.x ) - Math.abs( dx );
		if ( px <= 0 ) {
			return null;
		}
		dy = box.position.y - aabb.position.y;
		py = ( box.half.y + aabb.half.y ) - Math.abs( dy );
		if ( py <= 0 ) {
			return null;
		}
		hit = new Hit( aabb );
		if ( px < py ) {
			sx = Math.sign( dx );
			hit.delta.x = px * sx;
			hit.normal.x = sx;
			hit.position.x = aabb.position.x + ( aabb.half.x * sx );
			hit.position.y = box.position.y;
		} else {
			sy = Math.sign( dy );
			hit.delta.y = py * sy;
			hit.normal.y = sy;
			hit.position.x = box.position.x;
			hit.position.y = aabb.position.y + ( aabb.half.y * sy );
		}
		return hit;
	},

	/**
	 * Check if an AABB will intersect another AABB.
	 *
	 * @param {CollisionAABB} aabb AABB to test intersection with
	 * @param {[type]} box [description]
	 * @param {[type]} delta [description]
	 * @return {[type]} [description]
	 */
	sweepAABB: function ( aabb, box, delta ) {
		var direction, sweep;
		sweep = new Sweep();
		if ( delta.x === 0 && delta.y === 0 ) {
			sweep.position.x = box.position.x;
			sweep.position.y = box.position.y;
			sweep.hit = aabb.intersectAABB( box );
			if ( sweep.hit !== null ) {
				sweep.time = sweep.hit.time = 0;
			} else {
				sweep.time = 1;
			}
		} else {
			sweep.hit = aabb.intersectSegment( box.position, delta, box.half.x, box.half.y );
			if ( sweep.hit !== null ) {
				sweep.time = Collision.Math.clamp( sweep.hit.time - Math.EPSILON, 0, 1 );
				sweep.position.x = box.position.x + delta.x * sweep.time;
				sweep.position.y = box.position.y + delta.y * sweep.time;
				Collision.Point.clone( delta, direction );
				Collision.Point.normalize( direction );
				sweep.hit.position.x += direction.x * box.half.x;
				sweep.hit.position.y += direction.y * box.half.y;
			} else {
				sweep.position.x = box.position.x + delta.x;
				sweep.position.y = box.position.y + delta.y;
				sweep.time = 1;
			}
		}
		return sweep;
	},

	/**
	 * Check if an AABB will intersect a list of static AABBs.
	 *
	 * @param {CollisionAABB} aabb AABB to test intersection with
	 * @param {CollisionAABB} staticColliders List of static AABBs to test collision with
	 * @param {CollisionPoint} delta Distance of travel to sweep `aabb` with
	 * @return {Collision.Sweep} Sweep of nearest collision
	 */
	sweepInto: function ( aabb, staticColliders, delta ) {
		var collider, nearest, sweep;
		nearest = new Sweep();
		nearest.time = 1;
		nearest.position.x = aabb.position.x + delta.x;
		nearest.position.y = aabb.position.y + delta.y;
		for ( let i = 0, len = staticColliders.length; i < len; i++ ) {
			collider = staticColliders[i];
			sweep = collider.sweepAABB( aabb, delta );
			if ( sweep.time < nearest.time ) {
				nearest = sweep;
			}
		}
		return nearest;
	}
};
