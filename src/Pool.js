/**
 * Object pool.
 *
 * @class
 */
Planar.Pool = class {
	/**
	 * Create a pool.
	 *
	 * @constructor
	 * @param {Function} constructor Object constructor
	 * @param {Array} [options.args] Arguments to provide constructors
	 * @param {number} [options.chunk] Number of objects to auto-generate
	 * @param {[type]} [options.init] Function or method name to call on object when allocated
	 * @param {[type]} [options.reset] Function or method name to call on object when freed
	 */
	constructor( constructor, { args = [], chunk = 10, init = null, reset = null } = {} ) {
		this.constructor = constructor;
		this.args = args;
		this.chunk = chunk;
		this.init = init;
		this.reset = reset;
		this.objects = [];
	}

	/**
	 * Generate objects.
	 *
	 * @param {number} [size=this.chunk] Number of objects to generate
	 */
	generate( size = this.chunk ) {
		const objects = this.objects;
		for ( let i = this.objects.length, len = this.objects.length + size; i < len; i++ ) {
			objects[i] = new this.constructor( ...this.args );
		}
	}

	/**
	 * Get an object from the pool.
	 *
	 * When done using the object, return it to the pool using #free.
	 *
	 * @return {Object} Allocated object
	 */
	allocate() {
		if ( !this.objects.length ) {
			this.generate( 1 );
		}
		return this.objects.pop();
	}

	/**
	 * Free an object to be reused elsewhere.
	 *
	 * @param {Object} Object to free for reuse
	 */
	free( object ) {
		this.objects.unshift( object );
	}

	/**
	 * Clear all objects from the pool.
	 */
	clear() {
		this.objects = [];
	}

	/**
	 * Get the size of the pool.
	 *
	 * @return {number} Pool size
	 */
	get size() {
		return this.objects.length;
	}
};
