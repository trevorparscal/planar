/**
 * Object factory.
 *
 * A factory holds a collection of constructors which each inherit from a common superclass.
 *
 * @class
 *
 * @example
 * class Animal {}
 * class Aardvark extends Animal {}
 * class Zebra extends Animal {}
 * const factory = new Planar.Factory( Animal );
 * factory.add( 'aardvark', Aardvark ).add( 'zebra', Zebra );
 * const aardvark = factory.create( 'aardvark' ),
 *     zebra = factory.create( 'zebra' );
 */
Planar.Factory = class {
	/**
	 * Create a factory.
	 *
	 * @param {Function} [superclass=Object] Superclass all constructors must inherit from
	 */
	constructor( superclass ) {
		/**
		 * @private
		 * @property {Function} Superclass all constructors must inherit from
		 */
		this.superclass = superclass || Object;

		/**
		 * @private
		 * @property {Object.<string,Function>} List of constructors, indexed by key
		 */
		this.constructors = new Map();
	}

	/**
	 * Add a constrcutor.
	 *
	 * @param {Function} constructor Constructor to add, must be a subclass of #superclass and
	 *   have a static `key` getter or property
	 * @throws {Error} If constructor isn't a function
	 * @throws {Error} If constructor has the wrong superclass
	 * @throws {Error} If constructor has already been added
	 * @throws {Error} If key has already been used
	 * @chainable
	 */
	add( key, constructor ) {
		if ( typeof constructor !== 'function' ) {
			throw new Error( `Constructor isn't a function.` );
		}
		if ( !( constructor.prototype instanceof this.superclass ) ) {
			throw new Error( `Constructor has the wrong superclass.` );
		}
		if ( this.constructors.has( key ) ) {
			if ( this.constructors.get( key ) === constructor ) {
				throw new Error( `"${key}" constructor has already been added.` );
			} else {
				throw new Error( `"${key}" key has already been used by another constructor.` );
			}
		}
		this.constructors.set( key, constructor );

		return this;
	}

	/**
	 * Check if a constructor exists.
	 *
	 * @param {string} key Constructor key
	 * @return {boolean} Factory has contructor with matching key
	 */
	has( key ) {
		return this.constructors.has( key );
	}

	/**
	 * Get a constructor.
	 *
	 * @param {string} key Constructor key
	 * @return {Function} constructor Constructor to add, will be a subclass of #superclass
	 */
	get( key ) {
		return this.constructors.get( key );
	}

	/**
	 * Construct an object.
	 *
	 * @param {string} key Constructor key
	 * @param {...*} args Arguments to construct object with
	 * @throws {Error} If constructor doesn't exist
	 * @return {Object} Constructed object
	 */
	create( key, ...args ) {
		if ( !this.constructors.has( key ) ) {
			throw new Error( `"${key}" constructor doesn't exist.` );
		}

		return new ( this.constructors.get( key ) )( ...args );
	}
};
