/**
 * Point.
 *
 * @class
 */
Planar.Point = class {
	/**
	 * Create a point.
	 *
	 * @constructor
	 * @param {number} x Horizontal position
	 * @param {number} [y=x] Vertical position
	 */
	constructor( x = 0, y = x ) {
		if ( typeof x === 'object' ) {
			this.x = x.x;
			this.y = x.y;
		} else {
			this.x = x;
			this.y = y;
		}
	}

	/**
	 * Copy values from another point.
	 *
	 * @param {Planar.Point|Object} point Point to copy from
	 * @param {number} point.x Horizontal position
	 * @param {number} point.y Vertical position
	 */
	copy( point ) {
		this.x = point.x;
		this.y = point.y;
	}

	/**
	 * Set the position.
	 *
	 * @param {number} x Horizontal position
	 * @param {number} [y=x] Vertical position
	 */
	set( x = 0, y = x ) {
		this.x = x;
		this.y = y;
	}

	/**
	 * Create a clone.
	 *
	 * @return {Planar.Point} Cloned point
	 */
	clone() {
		return new this.constructor( this.x, this.y );
	}

	/**
	 * Check if point is equal to another.
	 *
	 * @param {Planar.Point|Object} point Point to copy from
	 * @param {number} point.x Horizontal position
	 * @param {number} point.y Vertical position
	 * @return {boolean} Points are in the same position.
	 */
	equals( point ) {
		return ( point.x === this.x ) && ( point.y === this.y );
	}
};
