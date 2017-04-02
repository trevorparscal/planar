/**
 * Based on Intersect by Nathan Ostgard.
 * @licence MIT
 * @link https://git.io/vSmWe
 */
window.Collision = {};

/**
 * @typedef {Vector}
 * @property {number} x Horizontal position
 * @property {number} x Vertical position
 */

/**
 * @typedef {AxisAlignedBoundingBox}
 * @property {Vector} position Position of box
 * @property {Vector} half Distance from the center to the outside edges along each axis
 */

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
	 * @param {AxisAlignedBoundingBox} collider Object being collided with
	 */
	constructor ( collider ) {
		/**
		 * @property {AxisAlignedBoundingBox} Object being collided with
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

Collision.AABB = {
	/**
	 * Check if a point is inside an AABB.
	 *
	 * @param {AxisAlignedBoundingBox} aabb AABB to test intersection with
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
		hit = new Collision.Hit( aabb );
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
	 * @param {AxisAlignedBoundingBox} aabb AABB to test intersection with
	 * @param {CollisionPoint} position Line segment start
	 * @param {CollisionPoint} delta Line segment end, relative to start
	 * @param {CollisionPoint} [padding] Space to be added around the aabb during testing
	 * @return {Collision.Hit|null} Hit if intersection occured, null otherwise
	 */
	intersectSegment: function ( aabb, start, delta, padding = {} ) {
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
		hit = new Collision.Hit( aabb );
		hit.time = clamp( nearTime, 0, 1 );
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
	 * @param {AxisAlignedBoundingBox} aabb AABB to test intersection with
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
		hit = new Collision.Hit( aabb );
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
	 * @param {AxisAlignedBoundingBox} aabb AABB to test intersection with
	 * @param {[type]} box [description]
	 * @param {[type]} delta [description]
	 * @return {[type]} [description]
	 */
	sweepAABB: function ( aabb, box, delta ) {
		var direction, sweep;
		sweep = new Collision.Sweep();
		if ( delta.x === 0 && delta.y === 0 ) {
			sweep.position.x = box.position.x;
			sweep.position.y = box.position.y;
			sweep.hit = Collision.AABB.intersectAABB( aabb, box );
			if ( sweep.hit !== null ) {
				sweep.time = sweep.hit.time = 0;
			} else {
				sweep.time = 1;
			}
		} else {
			sweep.hit = Collision.AABB.intersectSegment( aabb, box.position, delta, box.half );
			if ( sweep.hit !== null ) {
				sweep.time = clamp( sweep.hit.time - Number.EPSILON, 0, 1 );
				sweep.position.x = box.position.x + delta.x * sweep.time;
				sweep.position.y = box.position.y + delta.y * sweep.time;
				direction = { x: delta.x, y: delta.y };
				normalize( direction );
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
	 * @param {AxisAlignedBoundingBox} aabb AABB to test intersection with
	 * @param {AxisAlignedBoundingBox} staticColliders List of static AABBs to test collision with
	 * @param {CollisionPoint} delta Distance of travel to sweep `aabb` with
	 * @return {Collision.Sweep} Sweep of nearest collision
	 */
	sweepInto: function ( aabb, staticColliders, delta ) {
		var collider, nearest, sweep;
		nearest = new Collision.Sweep();
		nearest.time = 1;
		nearest.position.x = aabb.position.x + delta.x;
		nearest.position.y = aabb.position.y + delta.y;
		for ( let i = 0, len = staticColliders.length; i < len; i++ ) {
			collider = staticColliders[i];
			sweep = Collision.sweepAABB( collider, aabb, delta );
			if ( sweep.time < nearest.time ) {
				nearest = sweep;
			}
		}
		return nearest;
	}
};

/**
 * Clamp a value within a range.
 *
 * @private
 * @param {number} value Number to clamp
 * @param {number} min Minimum value
 * @param {number} max Maximum value
 * @return {number} Clamped number
 */
function clamp( value, min, max ) {
	return Math.min( max, Math.max( min, value ) );
}

/**
 * Normalize a point so it is in the same direction but in the range of [0..1].
 *
 * Modifies the point in place.
 *
 * @param {Point} point Point to normalize
 */
function normalize( point ) {
	var length = point.x * point.x + point.y * point.y;
	if ( length > 0 ) {
		length = Math.sqrt( length );
		const inverseLength = 1.0 / length;
		point.x *= inverseLength;
		point.y *= inverseLength;
	}
}