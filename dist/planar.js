;(function() {
/**
 * Planar.
 *
 * @namespace
 * @type {Object}
 */
window.Planar = {};
}());

;(function() {
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
}());

;(function() {
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
}());

;(function() {
/**
 * App.
 *
 * @class
 */
Planar.App = class {
	/**
	 * Create an application.
	 *
	 * @param {...Planar.System} systems Systems to use
	 * @constructor
	 */
	constructor( ...systems ) {
		// Properties
		this.running = false;
		this.iteration = 0;
		this.systems = new Set();
		this.entities = new Set();
		this.additions = new Set();
		this.deletions = new Set();
		this.then = null;
		this.request = null;
		this.debug = true;
		this.loop = this.loop.bind( this );

		// Initialization
		for ( let system of systems ) {
			this.systems.add( system );
		}
		window.addEventListener( 'focus', () => this.start() );
		window.addEventListener( 'blur', () => this.stop() );
		document.addEventListener( 'visibilitychange', () => {
			this[document.hidden ? 'stop' : 'start']();
		} );
	}

	/**
	 * Flush queued additions and deletions.
	 *
	 * Adds entities queued for addition calling #sync for each of them after they are added,
	 * deletes entities queued for deletion calling #drop for each of them after they are deleted
	 * and clears the addition and deletion queues.
	 *
	 * @chainable
	 */
	flush() {
		for ( let entity of this.additions ) {
			this.entities.add( entity );
			for ( let system of this.systems ) {
				if ( system.isRelated( entity ) ) {
					system.add( entity );
				}
			}
		}
		for ( let entity of this.deletions ) {
			this.entities.delete( entity );
			for ( let system of this.systems ) {
				if ( system.has( entity ) ) {
					system.delete( entity );
				}
			}
			this.onDelete( entity );
		}
		this.additions.clear();
		this.deletions.clear();
		return this;
	}

	/**
	 * Queue entity to be added.
	 *
	 * Adds entity to the addition queue, removing it from the deletion queue if present.
	 *
	 * @param {Object} entity Entity to add to addition queue
	 * @throws {Error} If entity has already exists
	 * @throws {Error} If entity has already been added to addition queue
	 * @chainable
	 */
	add( entity ) {
		if ( this.deletions.has( entity ) ) {
			this.deletions.delete( entity );
		} else if ( this.entities.has( entity ) ) {
			throw new Error( `"${entity.key}" already exists.` );
		}
		if ( this.additions.has( entity ) ) {
			throw new Error( `"${entity.key}" has already been added to addition queue.` );
		}
		this.additions.add( entity );
		return this;
	}

	/**
	 * Queue entity to be deleted.
	 *
	 * Adds entity to the deletion queue, removing it from the addition queue if present.
	 *
	 * @param {Object} entity Entity to add to deletion queue
	 * @throws {Error} If entity has already been added to deletion queue
	 * @throws {Error} If entity key doesn't exist
	 * @chainable
	 */
	delete( entity ) {
		if ( this.deletions.has( entity ) ) {
			throw new Error( `"${entity.key}" has already been added to deletion queue.` );
		}
		if ( !entity ) {
			throw new Error( `"${entity.key}" doesn't exist.` );
		}
		if ( this.additions.has( entity ) ) {
			this.additions.delete( entity );
		}
		this.deletions.add( entity );
		return this;
	}

	/**
	 * Queue all entities to be cleared.
	 *
	 * Clears queued additions and deletions, then queues all entities to be deleted.
	 *
	 * @chainable
	 */
	clear() {
		this.additions.clear();
		this.deletions.clear();
		this.entities.forEach( this.deletions.add, this.deletions );
		return this;
	}

	/**
	 * Start application.
	 *
	 * @chainable
	 */
	start() {
		if ( !this.running ) {
			this.running = true;
			this.then = performance.now();
			this.loop( this.then );
			document.title = '(Running)';
		}
		return this;
	}

	/**
	 * Stop application.
	 *
	 * @chainable
	 */
	stop() {
		if ( this.running ) {
			cancelAnimationFrame( this.request );
			this.running = false;
			this.then = null;
			document.title = '(Idle)';
		}
		return this;
	}

	/**
	 * Run application loop.
	 *
	 * Looping will continue running until #running is set to false.
	 *
	 * @private
	 * @param {DOMHighResTimeStamp} timestamp Current time
	 */
	loop( now ) {
		if ( this.running ) {
			let delta = Math.min( now - this.then, 200 );
			this.then = now;
			this.iteration++;
			this.flush();
			for ( let system of this.systems ) {
				system.update( delta );
			}
			for ( let entity of this.entities ) {
				entity.update( delta );
			}
			this.request = requestAnimationFrame( this.loop );
		}
	}
};
}());

;(function() {
/**
 * Component.
 *
 * @class
 * @module Components
 */
Planar.Component = class {
	/**
	 * @typedef ComponentSchemaDefinition
	 * @type {Object.<string,ComponentPropertyDefinition|ComponentPropertyGetter>}
	 */

	/**
	 * @typedef ComponentPropertyDefinition
	 * @type {Array}
	 * @property {Function} 0 Property type, equivilant to the constructor property of a valid value
	 * @property {*} 1 Default value
	 */

	/**
	 * @callback ComponentPropertyGetter
	 * @this {Planar.Component}
	 * @return {*} Computed value
	 */

	/**
	 * Define a component.
	 *
	 * @param {Object.<string,ComponentSchemaDefinition>} definitions List of component definitions
	 * @chainable
	 */
	static define( definitions ) {
		for ( let key in definitions ) {
			let constructor = class extends Planar.Component {};
			constructor.schema = definitions[key];
			Planar.Component.factory.add( key, constructor );
		}
		return this;
	}

	/**
	 * Create a component.
	 *
	 * @constructor
	 * @param {Object} state Initial property values, must conform to component schema
	 * @throws {Error} If a property is invalid
	 * @throws {Error} If property definiton in schema is invalid 
	 */
	constructor( state ) {
		const schema = this.constructor.schema;
		for ( let property in schema ) {
			let definition = schema[property];
			if ( typeof definition === 'function' ) {
				Object.defineProperty( this, property, { get: definition.bind( this ) } );
			} else if ( Array.isArray( definition ) ) {
				let [ constructor, defaultValue ] = definition;
				if ( state[property] !== undefined ) {
					if ( state[property].constructor !== constructor ) {
						throw new Error( `"${property}" type is invlaid.` );
					}
					this[property] = state[property];
				} else {
					this[property] = typeof defaultValue === 'function' ?
						defaultValue() : defaultValue;
				}
			} else {
				throw new Error( `"${property}" definition in schmea is invalid.` );
			}
		}
	}
};

/**
 * Component factory.
 *
 * @static
 * @type {Planar.Factory}
 */
Planar.Component.factory = new Planar.Factory( Planar.Component );

/**
 * Component schema.
 *
 * @static
 * @inheritable
 * @type {ComponentSchemaDefinition}
 */
Planar.Component.schema = {};

Planar.Component.define( {
	/**
	 * Animation component.
	 *
	 * @class
	 * @extends {Planar.Component}
	 * @memberof Components
	 */
	animation: {},
	/**
	 * Motion component.
	 *
	 * @class
	 * @extends {Planar.Component}
	 * @memberof Components
	 */
	motion: {
		isStatic: [ Boolean, false ],
		isSensor: [ Boolean, false ],
		timeScale: [ Number, 1 ],
		force: [ Planar.Point, () => new Planar.Point() ],
		torque: [ Number, 0 ],
		area: [ Number, 0 ],
		mass: [ Number, 0 ],
		inertia: [ Number, 0 ],
		linearSpeed: [ Number, 0 ],
		linearVelocity: [ Planar.Point, () => new Planar.Point() ],
		angularSpeed: [ Number, 0 ],
		angularVelocity: [ Number, 0 ]
	},
	/**
	 * Draw component.
	 *
	 * @class
	 * @extends {Planar.Component}
	 * @memberof Components
	 */
	draw: {
		fillColor: [ Number, 0 ],
		fillAlpha: [ Number, 1 ],
		strokeWidth: [ Number, 0 ],
		strokeColor: [ Number, 0 ],
		strokeAlpha: [ Number, 1 ],
		isDynamic: [Boolean, true]
	},
	/**
	 * Filter component.
	 *
	 * @class
	 * @extends {Planar.Component}
	 * @memberof Components
	 */
	filter: {
		alpha: [ Number, 1 ]
	},
	/**
	 * Material component.
	 *
	 * @class
	 * @extends {Planar.Component}
	 * @memberof Components
	 */
	material: {
		density: [ Number, 0.001 ],
		dynamicFriction: [ Number, 0.1 ],
		airFriction: [ Number, 0.01 ],
		staticFriction: [ Number, 0.05 ],
		restitution: [ Number, 0 ]
	},
	/**
	 * Player component.
	 *
	 * @class
	 * @extends {Planar.Component}
	 * @memberof Components
	 */
	player: {},
	/**
	 * Shape component.
	 *
	 * @class
	 * @extends {Planar.Component}
	 * @memberof Components
	 */
	shape: {
		type: [ String, 'rectangle' ],
		radius: [ Number, 0 ],
		sides: [ Number, 0 ],
		width: [ Number, 0 ],
		height: [ Number, 0 ],
		points: [ Array, [] ],
		signature: function () {
			return this.type + this.points.length;
		}
	},
	/**
	 * Transform component.
	 *
	 * @class
	 * @extends {Planar.Component}
	 * @memberof Components
	 */
	transform: {
		position: [ Planar.Point, () => new Planar.Point( 0, 0 ) ],
		pivot: [ Planar.Point, () => new Planar.Point( 0, 0 ) ],
		rotation: [ Number, 0 ]
	},
	/**
	 * Warp component.
	 *
	 * @class
	 * @extends {Planar.Component}
	 * @memberof Components
	 */
	warp: {
		scale: [ Planar.Point, () => new Planar.Point( 1, 1 ) ]
	}
} );
}());

;(function() {
/**
 * Entity.
 *
 * @class
 */
Planar.Entity = class {
	/**
	 * Create an entity.
	 *
	 * @constructor
	 * @param {Planar.App} app Application entity is being added to
	 */
	constructor( app ) {
		this.app = app;
		this.iteration = 0;
		this.components = {};
		this.changed = {};
		this.key = this.constructor.count++;
	}

	/**
	 * Update system.
	 *
	 * Incriments the iteration counter.
	 *
	 * @param {number} delta Time ellapsed since last update in milliseconds
	 * @chainable
	 */
	update( delta ) {
		this.iteration++;
	}

	/**
	 * @callback EntityChangeCallback
	 * @param {Object} state Reference to component, changes will affect component
	 * @return {Object|undefined} Properties to assign to component
	 */

	/**
	 * Change properties of components.
	 *
	 * If the app is in debug mode, changes will be checked against the components' schema.
	 *
	 * @param {Object.<string,ComponentChangeCallback|Object>} changers Changer callbacks or lists
	 *   of property changes, keyed by componenent key, will be skipped if component does not exist
	 * @throws {Error} If a component changer is the wrong type
	 * @throws {Error} If a property is invalid (only in debug mode)
	 * @throws {Error} If a property is the wrong type (only in debug mode)
	 * @chainable
	 */
	change( changers ) {
		const iteration = this.iteration;
		for ( let key in changers ) {
			let changer = changers[key],
				component = this.components[key];
			if ( component ) {
				let changes;
				if ( typeof changer === 'object' ) {
					changes = changers[key];
				} else if ( typeof changer === 'function' ) {
					changes = changers[key]( component );
				} else {
					throw new Error( `"${key}" component changer is the wrong type` );
				}
				if ( typeof changes === 'object' ) {
					Object.assign( component, changes );
				}
				this.changed[key] = iteration;
			}
			if ( this.app.debug ) {
				let schema = component.constructor.schema;
				for ( let property in component ) {
					let definition = schema[property];
					if ( Array.isArray( typeof definition ) ) {
						let value = component[property],
							[ constructor ] = definition;
						if ( definition === undefined ) {
							throw new Error( `"${property}" is an invalid property.` );
						}
						if ( value.constructor !== constructor ) {
							throw new Error( `"${value.constructor.name}" is the wrong type.` );
						}
					}
				}
			}
		}
		return this;
	}

	/**
	 * @callback EntityHandleCallbackSingle
	 * @param {Planar.Component} state Reference to component, changes will affect component
	 */

	/**
	 * @callback EntityHandleCallbackMulti
	 * @param {...Planar.Component} components References to components, changes will affect components
	 */

	/**
	 * Handle changes for components if any has changed since last iteration.
	 *
	 * @param {string|string[]} keys Component keys
	 * @param {EntityHandleCallbackMulti} handler Handler callback, will be invoked once if any of
	 *   the components exist and have changed since last iteration, skipped if all do not exist or
	 *   haven't changed since last iteration
	 * @chainable
	 *//**
	 * Handle changes for a component if it has changed since last iteration.
	 *
	 * @param {string} key Component key
	 * @param {EntityHandleCallbackSingle} handler Handler callback, will be invoked if the
	 *   component exists and has changed since last iteration, skipped otherwise
	 * @chainable
	 *//**
	 * Handle changes for components which have changed since last iteration.
	 *
	 * @param {Object.<string,EntityHandleCallbackSingle>} handlers Handler callbacks, keyed by
	 *   componenent key, each will be skipped if component key does not exist or component hasn't
	 *   been changed since last iteration
	 * @chainable
	 */
	handle( ...args ) {
		const iteration = this.iteration;
		var [ keys, handler ] = args,
			[ handlers ] = args;

		if ( typeof constructor === 'string' ) {
			keys = [keys];
		}
		if ( Array.isArray( keys ) && typeof handler === 'function' ) {
			let components = [],
				count = 0;
			for ( let key of keys ) {
				let component = this.components[key];
				if ( component && this.changed[key] >= iteration ) {
					count++;
				}
				components.push( component );
			}
			if ( count ) {
				handler( ...components );
			}
		} else if ( handlers.constructor === Object ) {
			for ( let key in handlers ) {
				let component = this.components[key];
				if ( component && this.changed[key] >= iteration ) {
					handlers[key]( component );
				}
			}
		}
		return this;
	}

	/**
	 * Add components.
	 *
	 * @param {Object.<string,Object>} components List of components to add as
	 *   component-key/initial-state pairs
	 */
	add( components ) {
		for ( let key in components ) {
			let component = Planar.Component.factory.create( key, components[key] );
			this.components[key] = component;
			this.changed[key] = this.iteration;
		}
	}

	/**
	 * Remove components.
	 *
	 * @param {...string} [keys] Component keys to remove
	 * @chainable
	 */
	remove( ...keys ) {
		for ( let key of keys ) {
			delete this.components[key];
			delete this.changed[key];
		}
		return this;
	}

	/**
	 * Get a collection of components.
	 *
	 * @param {...string} [keys] Component keys to select
	 * @return {Object.<string,Planar.Component>} Selected components
	 */
	select( ...keys ) {
		const collection = {};
		for ( let key of keys ) {
			collection[key] = this.components[key];
		}
		return collection;
	}

	/**
	 * Check if entity has one or more components.
	 *
	 * @param {...string} [keys] Component keys to check for
	 * @return {boolean} Entity has all components
	 */
	has( ...keys ) {
		for ( let key of keys ) {
			if ( this.components[key] === undefined ) {
				return false;
			}
		}
		return true;
	}
};

Planar.Entity.count = 0;
}());

;(function() {
/**
 * Input.
 *
 * @class
 */
Planar.Input = class {
	/**
	 * Create an input.
	 *
	 * @constructor
	 * @param {Element} element DOM element to listen to events on
	 */
	constructor( element ) {
		this.element = element;
	}
};
}());

;(function() {
/**
 * System.
 *
 * @class
 */
Planar.System = class {
	/**
	 * Create a system.
	 *
	 * @constructor
	 */
	constructor() {
		this.entities = new Set();
	}

	/**
	 * Check if entity is related to this system.
	 *
	 * @param {Planar.Entity} entity Entity to check for
	 * @return {boolean} Entity is related to this system
	 */
	isRelated( entity ) {
		return true;
	}

	/**
	 * Add an entity.
	 *
	 * @param {Planar.Entity} entity Entity to add
	 */
	add( entity ) {
		this.entities.add( entity );
	}

	/**
	 * Delete an entity.
	 *
	 * @param {Planar.Entity} entity Entity to delete
	 */
	delete( entity ) {
		this.entities.delete( entity );
	}

	/**
	 * Check if an entity exists.
	 *
	 * @param {Planar.Entity} entity Entity to check for.
	 */
	has( entity ) {
		this.entities.has( entity );
	}

	/**
	 * Update system.
	 *
	 * @param {number} delta Time ellapsed since last update in milliseconds
	 * @chainable
	 */
	update( delta ) {
		//
	}
};
}());

;(function() {
/**
 * Keyboard input.
 *
 * @class
 */
Planar.Input.Keyboard = class extends Planar.Input {
	/**
	 * @inheritdoc
	 */
	constructor( element ) {
		super( element );

		this.keys = {};

		this.element.addEventListener( 'keydown', ( e ) => {
			this.keys[e.keyCode] = true;
		} );
		this.element.addEventListener( 'keyup', ( e ) => {
			this.keys[e.keyCode] = false;
		} );
	}
};

/**
 * @static
 * @property {Object} Key codes
 */
Planar.Input.Keyboard.codes = {
	A: "A".charCodeAt( 0 ),
	B: "B".charCodeAt( 0 ),
	C: "C".charCodeAt( 0 ),
	D: "D".charCodeAt( 0 ),
	E: "E".charCodeAt( 0 ),
	F: "F".charCodeAt( 0 ),
	G: "G".charCodeAt( 0 ),
	H: "H".charCodeAt( 0 ),
	I: "I".charCodeAt( 0 ),
	J: "J".charCodeAt( 0 ),
	K: "K".charCodeAt( 0 ),
	L: "L".charCodeAt( 0 ),
	M: "M".charCodeAt( 0 ),
	N: "N".charCodeAt( 0 ),
	O: "O".charCodeAt( 0 ),
	P: "P".charCodeAt( 0 ),
	Q: "Q".charCodeAt( 0 ),
	R: "R".charCodeAt( 0 ),
	S: "S".charCodeAt( 0 ),
	T: "T".charCodeAt( 0 ),
	U: "U".charCodeAt( 0 ),
	V: "V".charCodeAt( 0 ),
	W: "W".charCodeAt( 0 ),
	X: "X".charCodeAt( 0 ),
	Y: "Y".charCodeAt( 0 ),
	Z: "Z".charCodeAt( 0 ),
	ZERO: "0".charCodeAt( 0 ),
	ONE: "1".charCodeAt( 0 ),
	TWO: "2".charCodeAt( 0 ),
	THREE: "3".charCodeAt( 0 ),
	FOUR: "4".charCodeAt( 0 ),
	FIVE: "5".charCodeAt( 0 ),
	SIX: "6".charCodeAt( 0 ),
	SEVEN: "7".charCodeAt( 0 ),
	EIGHT: "8".charCodeAt( 0 ),
	NINE: "9".charCodeAt( 0 ),
	NUMPAD_0: 96,
	NUMPAD_1: 97,
	NUMPAD_2: 98,
	NUMPAD_3: 99,
	NUMPAD_4: 100,
	NUMPAD_5: 101,
	NUMPAD_6: 102,
	NUMPAD_7: 103,
	NUMPAD_8: 104,
	NUMPAD_9: 105,
	NUMPAD_MULTIPLY: 106,
	NUMPAD_ADD: 107,
	NUMPAD_ENTER: 108,
	NUMPAD_SUBTRACT: 109,
	NUMPAD_DECIMAL: 110,
	NUMPAD_DIVIDE: 111,
	F1: 112,
	F2: 113,
	F3: 114,
	F4: 115,
	F5: 116,
	F6: 117,
	F7: 118,
	F8: 119,
	F9: 120,
	F10: 121,
	F11: 122,
	F12: 123,
	F13: 124,
	F14: 125,
	F15: 126,
	COLON: 186,
	EQUALS: 187,
	COMMA: 188,
	UNDERSCORE: 189,
	PERIOD: 190,
	QUESTION_MARK: 191,
	TILDE: 192,
	OPEN_BRACKET: 219,
	BACKWARD_SLASH: 220,
	CLOSED_BRACKET: 221,
	QUOTES: 222,
	BACKSPACE: 8,
	TAB: 9,
	CLEAR: 12,
	ENTER: 13,
	SHIFT: 16,
	CONTROL: 17,
	ALT: 18,
	CAPS_LOCK: 20,
	ESC: 27,
	SPACEBAR: 32,
	PAGE_UP: 33,
	PAGE_DOWN: 34,
	END: 35,
	HOME: 36,
	LEFT: 37,
	UP: 38,
	RIGHT: 39,
	DOWN: 40,
	PLUS: 43,
	MINUS: 44,
	INSERT: 45,
	DELETE: 46,
	HELP: 47,
	NUM_LOCK: 144
};
}());

;(function() {
/**
 * Mouse input.
 *
 * @class
 */
Planar.Input.Mouse = class extends Planar.Input {
	/**
	 * @inheritdoc
	 */
	constructor( element ) {
		super( element );

		this.over = false;
		this.buttons = {};
		this.wheel = { x: 0, y: 0, z: 0 };
		this.position = { x: 0, y: 0 };

		this.element.addEventListener( 'mouseover', ( e ) => {
			this.over = true;
		} );
		this.element.addEventListener( 'mouseout', ( e ) => {
			this.over = false;
		} );
		this.element.addEventListener( 'mousedown', ( e ) => {
			this.buttons[e.button] = true;
		} );
		this.element.addEventListener( 'mouseup', ( e ) => {
			this.buttons[e.button] = false;
		} );
		this.element.addEventListener( 'wheel', ( e ) => {
			this.wheel.x += e.deltaX;
			this.wheel.y += e.deltaY;
			this.wheel.z += e.deltaZ;
		} );
		this.element.addEventListener( 'mousemove', ( e ) => {
			this.position.x = e.clientX;
			this.position.Y = e.clientY;
		} );
	}
};
}());

;(function() {
/**
 * Animation system.
 *
 * @class
 */
Planar.System.Animation = class extends Planar.System {
	/**
	 * @inheritdoc
	 */
	constructor() {
		super();
		this.tweens = new Map();
	}

	/**
	 * @inheritdoc
	 */
	isRelated( entity ) {
		return entity.has( 'animation' );
	}

	/**
	 * @inheritdoc
	 */
	add( entity ) {
		super.add( entity );
		this.tweens.set( entity.key, { value: 0 } );
	}

	/**
	 * @inheritdoc
	 */
	delete( entity ) {
		super.delete( entity );
		this.tweens.delete( entity.key );
	}

	/**
	 * @inheritdoc
	 */
	update( delta ) {
		for ( let entity of this.entities ) {
			let tween = this.tweens.get( entity.key );
			tween.value += delta;
			if ( tween.value % 100 === 0 ) {
				let index = Math.round( Math.random() * 2 );
				entity.change( { shape: { type: ['rectangle', 'circle', 'ngon'][index] } } );
			}
			entity.change( {
				warp: {
					scale: new Planar.Point(
						1.5 + ( Math.sin( tween.value * ( Math.PI / 1000 ) ) * 0.5 ),
						1.5 + ( Math.cos( tween.value * ( Math.PI / 1000 ) ) * 0.5 )
					)
				}
			} );
		}
	}
};
}());

;(function() {
/**
 * Geometry system.
 *
 * @class
 */
Planar.System.Geometry = class extends Planar.System {
	/**
	 * @inheritdoc
	 */
	isRelated( entity ) {
		return entity.has( 'shape' );
	}

	/**
	 * @inheritdoc
	 */
	add( entity ) {
		super.add( entity );
		entity.change( { shape: createPoints } );
	}

	/**
	 * @inheritdoc
	 */
	update( delta ) {
		/*jshint loopfunc: true */
		for ( let entity of this.entities ) {
			entity.handle( {
				shape: ( shape ) => {
					entity.change( { shape: createPoints } );
				}
			} );
		}
	}
};

/**
 * Create points.
 *
 * @private
 * @param {Planar.Component} shape Shape component
 */
function createPoints( shape ) {
	var points;
	switch ( shape.type ) {
		case 'rectangle':
			const hw = shape.width / 2,
				hh = shape.height / 2;
			points = [
				{ x: -hw, y: -hh },
				{ x: hw, y: -hh },
				{ x: hw, y: hh },
				{ x: -hw, y: hh }
			];
			break;
		case 'circle':
		case 'ngon':
			let { radius, sides } = shape;
			if ( shape.type === 'circle' || sides < 3 ) {
				// Approximate a circle
				sides = Math.ceil( Math.max( 10, Math.min( 25, radius ) ) );
			}
			const theta = 2 * Math.PI / sides,
				offset = theta * 0.5;
			points = [];
			for ( let i = 0; i < sides; i++ ) {
				let angle = offset + ( i * theta );
				points[i] = {
					x: Math.cos( angle ) * radius,
					y: Math.sin( angle ) * radius
				};
			}
			break;
		case 'polygon':
			points = shape.points;
			break;
		default:
			throw new Error( `"${shape.type}" shape type is invalid.` );
	}
	return { points: points };
}
}());

;(function() {
/**
 * Graphics system.
 *
 * @class
 */
Planar.System.Graphics = class extends Planar.System {
	constructor() {
		super();
		this.renderer = PIXI.autoDetectRenderer( 512, 512, false, true );
		this.stage = new PIXI.Container();
		this.graphics = new Map();
		document.body.appendChild( this.renderer.view );
	}

	isRelated( entity ) {
		return entity.has( 'draw', 'shape', 'transform' );
	}

	add( entity ) {
		super.add( entity );
		const graphic = new PIXI.Graphics();
		this.graphics.set( entity.key, graphic );
		this.stage.addChild( graphic );
	}

	delete( entity ) {
		super.delete( entity );
		const graphic = this.graphics.get( entity.key );
		this.graphics.delete( entity.key );
		this.stage.removeChild( graphic );
	}

	update( delta ) {
		/*jshint loopfunc: true */
		for ( let entity of this.entities ) {
			const graphic = this.graphics.get( entity.key );
			entity.handle( [ 'shape', 'draw' ], ( shape, draw ) => {
				graphic.clear();
				switch ( shape.type ) {
					case 'circle':
						drawCircle( graphic, shape.radius, draw );
						break;
					default:
						drawPolygon( graphic, shape.points, draw );
						break;
				}
			} );
			entity.handle( {
				transform: ( transform ) => {
					graphic.position.copy( transform.position );
					graphic.rotation = transform.rotation;
				},
				warp: ( warp ) => {
					graphic.scale.copy( warp.scale );
				},
				filter: ( filter ) => {
					graphic.alpha = filter.alpha;
				}
			} );
		}
		this.renderer.render( this.stage );
	}
};

function drawCircle( graphic, radius, draw ) {
	const pixiPoints = [];
	if ( draw.fillAlpha ) {
		graphic.beginFill( draw.fillColor, draw.fillAlpha );
	}
	if ( draw.strokeWidth && draw.strokeAlpha ) {
		graphic.lineStyle( draw.strokeWidth, draw.strokeColor, draw.strokeAlpha );
	}
	graphic.drawCircle( 0, 0, radius );
	if ( draw.fillAlpha ) {
		graphic.endFill();
	}
	graphic.cacheAsBitmap = !draw.isDynamic;
}

function drawPolygon( graphic, points, draw ) {
	const pixiPoints = [];
	if ( draw.fillAlpha ) {
		graphic.beginFill( draw.fillColor, draw.fillAlpha );
	}
	if ( draw.strokeWidth && draw.strokeAlpha ) {
		graphic.lineStyle( draw.strokeWidth, draw.strokeColor, draw.strokeAlpha );
	}
	for ( let i = 0, len = points.length; i < len; i++ ) {
		pixiPoints[i] = new PIXI.Point( points[i].x, points[i].y );
	}
	graphic.drawPolygon( pixiPoints );
	if ( draw.fillAlpha ) {
		graphic.endFill();
	}
	graphic.cacheAsBitmap = !draw.isDynamic;
}
}());

;(function() {
/**
 * Physics system.
 *
 * @class
 */
Planar.System.Physics = class extends Planar.System {
	/**
	 * @inheritdoc
	 */
	constructor() {
		super();
		this.engine = Matter.Engine.create( { enableSleep: true } );
		this.world = this.engine.world;
		this.bodies = new Map();
		this.signatures = new Map();
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
		this.signatures.set( entity.key, entity.components.shape.signature );
		Matter.World.add( this.world, body );
	}

	/**
	 * @inheritdoc
	 */
	delete( entity ) {
		super.delete( entity );
		const body = this.bodies.get( entity.key );
		this.bodies.delete( entity.key );
		this.signatures.delete( entity.key );
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
				if ( shape.signature !== this.signatures.get( entity.key ) ) {
					// Replace body
					Matter.World.remove( this.world, body );
					body = createBody( entity );
					this.bodies.set( entity.key, body );
					this.signatures.set( entity.key, shape.signature );
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
						airFriction: material.airFriction,
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
	const { shape, transform, warp } = entity.components,
		body = Matter.Bodies.fromVertices( 0, 0, [ shape.points ] );
	if ( !body ) {
		throw new Error( 'Invalid shape.' );
	}
	Matter.Body.translate( body, transform.position );
	if ( warp ) {
		Matter.Body.scale( body, warp.scale.x, warp.scale.y );
	}
	Matter.Body.rotate( body, transform.rotation );
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
		vertices = body.vertices;
	for ( let i = 0, len = shape.points.length; i < len; i++ ) {
		( { x: vertices[i].x, y: vertices[i].y } = shape.points[i] );	
	}
	if ( warp ) {
		Matter.Vertices.scale( vertices, warp.scale.x, warp.scale.y, transform.pivot );
	}
	Matter.Vertices.rotate( vertices, transform.rotation, transform.pivot );
	Matter.Body.setVertices( body, vertices );
}
}());

;(function() {
/**
 * Player system.
 *
 * @class
 */
Planar.System.Player = class extends Planar.System {
	/**
	 * @inheritdoc
	 */
	constructor() {
		super();
		this.keyboard = new Planar.Input.Keyboard( window );
	}

	/**
	 * @inheritdoc
	 */
	isRelated( entity ) {
		return entity.has( 'player', 'motion' );
	}

	/**
	 * @inheritdoc
	 */
	update( delta ) {
		const k = this.keyboard.keys,
			c = Planar.Input.Keyboard.codes;
		/*jshint loopfunc: true */
		for ( let entity of this.entities ) {
			if ( k[c.UP] || k[c.DOWN] || k[c.LEFT] || k[c.RIGHT] || k[c.SPACEBAR] ) {
				entity.change( {
					motion: ( motion ) => {
						const power = motion.mass * 0.005;
						if ( k[c.UP] ) {
							motion.force.y -= power;
						}
						if ( k[c.DOWN] ) {
							motion.force.y += power;
						}
						if ( k[c.LEFT] ) {
							motion.force.x -= power / 2;
						}
						if ( k[c.RIGHT] ) {
							motion.force.x += power / 2;
						}
						if ( k[c.SPACEBAR] ) {
							motion.torque += power;
						}
					}
				} );
			}
		}
	}
};
}());

;(function() {
/**
 * Stats system.
 *
 * @class
 */
Planar.System.Stats = class extends Planar.System {
	/**
	 * @inheritdoc
	 */
	constructor() {
		super();
		this.stats = new Stats();
		document.body.appendChild( this.stats.dom );
	}

	/**
	 * @inheritdoc
	 */
	isRelated( entity ) {
		return false;
	}

	/**
	 * @inheritdoc
	 */
	update( delta ) {
		this.stats.begin();
		this.stats.end();
	}
};
}());

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1haW4uanMiLCJQb2ludC5qcyIsIkZhY3RvcnkuanMiLCJBcHAuanMiLCJDb21wb25lbnQuanMiLCJFbnRpdHkuanMiLCJJbnB1dC5qcyIsIlN5c3RlbS5qcyIsImlucHV0cy9LZXlib2FyZC5qcyIsImlucHV0cy9Nb3VzZS5qcyIsInN5c3RlbXMvQW5pbWF0aW9uLmpzIiwic3lzdGVtcy9HZW9tZXRyeS5qcyIsInN5c3RlbXMvR3JhcGhpY3MuanMiLCJzeXN0ZW1zL1BoeXNpY3MuanMiLCJzeXN0ZW1zL1BsYXllci5qcyIsInN5c3RlbXMvU3RhdHMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNsRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDckdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3RMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUM5TUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDcE5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzdEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDbElBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDdkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUMxREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDaEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQy9GQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUMzSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDckRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJwbGFuYXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIFBsYW5hci5cbiAqXG4gKiBAbmFtZXNwYWNlXG4gKiBAdHlwZSB7T2JqZWN0fVxuICovXG53aW5kb3cuUGxhbmFyID0ge307XG4iLCIvKipcbiAqIFBvaW50LlxuICpcbiAqIEBjbGFzc1xuICovXG5QbGFuYXIuUG9pbnQgPSBjbGFzcyB7XG5cdC8qKlxuXHQgKiBDcmVhdGUgYSBwb2ludC5cblx0ICpcblx0ICogQGNvbnN0cnVjdG9yXG5cdCAqIEBwYXJhbSB7bnVtYmVyfSB4IEhvcml6b250YWwgcG9zaXRpb25cblx0ICogQHBhcmFtIHtudW1iZXJ9IFt5PXhdIFZlcnRpY2FsIHBvc2l0aW9uXG5cdCAqL1xuXHRjb25zdHJ1Y3RvciggeCA9IDAsIHkgPSB4ICkge1xuXHRcdGlmICggdHlwZW9mIHggPT09ICdvYmplY3QnICkge1xuXHRcdFx0dGhpcy54ID0geC54O1xuXHRcdFx0dGhpcy55ID0geC55O1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLnggPSB4O1xuXHRcdFx0dGhpcy55ID0geTtcblx0XHR9XG5cdH1cblxuXHQvKipcblx0ICogQ29weSB2YWx1ZXMgZnJvbSBhbm90aGVyIHBvaW50LlxuXHQgKlxuXHQgKiBAcGFyYW0ge1BsYW5hci5Qb2ludHxPYmplY3R9IHBvaW50IFBvaW50IHRvIGNvcHkgZnJvbVxuXHQgKiBAcGFyYW0ge251bWJlcn0gcG9pbnQueCBIb3Jpem9udGFsIHBvc2l0aW9uXG5cdCAqIEBwYXJhbSB7bnVtYmVyfSBwb2ludC55IFZlcnRpY2FsIHBvc2l0aW9uXG5cdCAqL1xuXHRjb3B5KCBwb2ludCApIHtcblx0XHR0aGlzLnggPSBwb2ludC54O1xuXHRcdHRoaXMueSA9IHBvaW50Lnk7XG5cdH1cblxuXHQvKipcblx0ICogU2V0IHRoZSBwb3NpdGlvbi5cblx0ICpcblx0ICogQHBhcmFtIHtudW1iZXJ9IHggSG9yaXpvbnRhbCBwb3NpdGlvblxuXHQgKiBAcGFyYW0ge251bWJlcn0gW3k9eF0gVmVydGljYWwgcG9zaXRpb25cblx0ICovXG5cdHNldCggeCA9IDAsIHkgPSB4ICkge1xuXHRcdHRoaXMueCA9IHg7XG5cdFx0dGhpcy55ID0geTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDcmVhdGUgYSBjbG9uZS5cblx0ICpcblx0ICogQHJldHVybiB7UGxhbmFyLlBvaW50fSBDbG9uZWQgcG9pbnRcblx0ICovXG5cdGNsb25lKCkge1xuXHRcdHJldHVybiBuZXcgdGhpcy5jb25zdHJ1Y3RvciggdGhpcy54LCB0aGlzLnkgKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDaGVjayBpZiBwb2ludCBpcyBlcXVhbCB0byBhbm90aGVyLlxuXHQgKlxuXHQgKiBAcGFyYW0ge1BsYW5hci5Qb2ludHxPYmplY3R9IHBvaW50IFBvaW50IHRvIGNvcHkgZnJvbVxuXHQgKiBAcGFyYW0ge251bWJlcn0gcG9pbnQueCBIb3Jpem9udGFsIHBvc2l0aW9uXG5cdCAqIEBwYXJhbSB7bnVtYmVyfSBwb2ludC55IFZlcnRpY2FsIHBvc2l0aW9uXG5cdCAqIEByZXR1cm4ge2Jvb2xlYW59IFBvaW50cyBhcmUgaW4gdGhlIHNhbWUgcG9zaXRpb24uXG5cdCAqL1xuXHRlcXVhbHMoIHBvaW50ICkge1xuXHRcdHJldHVybiAoIHBvaW50LnggPT09IHRoaXMueCApICYmICggcG9pbnQueSA9PT0gdGhpcy55ICk7XG5cdH1cbn07XG4iLCIvKipcbiAqIE9iamVjdCBmYWN0b3J5LlxuICpcbiAqIEEgZmFjdG9yeSBob2xkcyBhIGNvbGxlY3Rpb24gb2YgY29uc3RydWN0b3JzIHdoaWNoIGVhY2ggaW5oZXJpdCBmcm9tIGEgY29tbW9uIHN1cGVyY2xhc3MuXG4gKlxuICogQGNsYXNzXG4gKlxuICogQGV4YW1wbGVcbiAqIGNsYXNzIEFuaW1hbCB7fVxuICogY2xhc3MgQWFyZHZhcmsgZXh0ZW5kcyBBbmltYWwge31cbiAqIGNsYXNzIFplYnJhIGV4dGVuZHMgQW5pbWFsIHt9XG4gKiBjb25zdCBmYWN0b3J5ID0gbmV3IFBsYW5hci5GYWN0b3J5KCBBbmltYWwgKTtcbiAqIGZhY3RvcnkuYWRkKCAnYWFyZHZhcmsnLCBBYXJkdmFyayApLmFkZCggJ3plYnJhJywgWmVicmEgKTtcbiAqIGNvbnN0IGFhcmR2YXJrID0gZmFjdG9yeS5jcmVhdGUoICdhYXJkdmFyaycgKSxcbiAqICAgICB6ZWJyYSA9IGZhY3RvcnkuY3JlYXRlKCAnemVicmEnICk7XG4gKi9cblBsYW5hci5GYWN0b3J5ID0gY2xhc3Mge1xuXHQvKipcblx0ICogQ3JlYXRlIGEgZmFjdG9yeS5cblx0ICpcblx0ICogQHBhcmFtIHtGdW5jdGlvbn0gW3N1cGVyY2xhc3M9T2JqZWN0XSBTdXBlcmNsYXNzIGFsbCBjb25zdHJ1Y3RvcnMgbXVzdCBpbmhlcml0IGZyb21cblx0ICovXG5cdGNvbnN0cnVjdG9yKCBzdXBlcmNsYXNzICkge1xuXHRcdC8qKlxuXHRcdCAqIEBwcml2YXRlXG5cdFx0ICogQHByb3BlcnR5IHtGdW5jdGlvbn0gU3VwZXJjbGFzcyBhbGwgY29uc3RydWN0b3JzIG11c3QgaW5oZXJpdCBmcm9tXG5cdFx0ICovXG5cdFx0dGhpcy5zdXBlcmNsYXNzID0gc3VwZXJjbGFzcyB8fCBPYmplY3Q7XG5cblx0XHQvKipcblx0XHQgKiBAcHJpdmF0ZVxuXHRcdCAqIEBwcm9wZXJ0eSB7T2JqZWN0LjxzdHJpbmcsRnVuY3Rpb24+fSBMaXN0IG9mIGNvbnN0cnVjdG9ycywgaW5kZXhlZCBieSBrZXlcblx0XHQgKi9cblx0XHR0aGlzLmNvbnN0cnVjdG9ycyA9IG5ldyBNYXAoKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBBZGQgYSBjb25zdHJjdXRvci5cblx0ICpcblx0ICogQHBhcmFtIHtGdW5jdGlvbn0gY29uc3RydWN0b3IgQ29uc3RydWN0b3IgdG8gYWRkLCBtdXN0IGJlIGEgc3ViY2xhc3Mgb2YgI3N1cGVyY2xhc3MgYW5kXG5cdCAqICAgaGF2ZSBhIHN0YXRpYyBga2V5YCBnZXR0ZXIgb3IgcHJvcGVydHlcblx0ICogQHRocm93cyB7RXJyb3J9IElmIGNvbnN0cnVjdG9yIGlzbid0IGEgZnVuY3Rpb25cblx0ICogQHRocm93cyB7RXJyb3J9IElmIGNvbnN0cnVjdG9yIGhhcyB0aGUgd3Jvbmcgc3VwZXJjbGFzc1xuXHQgKiBAdGhyb3dzIHtFcnJvcn0gSWYgY29uc3RydWN0b3IgaGFzIGFscmVhZHkgYmVlbiBhZGRlZFxuXHQgKiBAdGhyb3dzIHtFcnJvcn0gSWYga2V5IGhhcyBhbHJlYWR5IGJlZW4gdXNlZFxuXHQgKiBAY2hhaW5hYmxlXG5cdCAqL1xuXHRhZGQoIGtleSwgY29uc3RydWN0b3IgKSB7XG5cdFx0aWYgKCB0eXBlb2YgY29uc3RydWN0b3IgIT09ICdmdW5jdGlvbicgKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoIGBDb25zdHJ1Y3RvciBpc24ndCBhIGZ1bmN0aW9uLmAgKTtcblx0XHR9XG5cdFx0aWYgKCAhKCBjb25zdHJ1Y3Rvci5wcm90b3R5cGUgaW5zdGFuY2VvZiB0aGlzLnN1cGVyY2xhc3MgKSApIHtcblx0XHRcdHRocm93IG5ldyBFcnJvciggYENvbnN0cnVjdG9yIGhhcyB0aGUgd3Jvbmcgc3VwZXJjbGFzcy5gICk7XG5cdFx0fVxuXHRcdGlmICggdGhpcy5jb25zdHJ1Y3RvcnMuaGFzKCBrZXkgKSApIHtcblx0XHRcdGlmICggdGhpcy5jb25zdHJ1Y3RvcnMuZ2V0KCBrZXkgKSA9PT0gY29uc3RydWN0b3IgKSB7XG5cdFx0XHRcdHRocm93IG5ldyBFcnJvciggYFwiJHtrZXl9XCIgY29uc3RydWN0b3IgaGFzIGFscmVhZHkgYmVlbiBhZGRlZC5gICk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoIGBcIiR7a2V5fVwiIGtleSBoYXMgYWxyZWFkeSBiZWVuIHVzZWQgYnkgYW5vdGhlciBjb25zdHJ1Y3Rvci5gICk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHRoaXMuY29uc3RydWN0b3JzLnNldCgga2V5LCBjb25zdHJ1Y3RvciApO1xuXG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cblxuXHQvKipcblx0ICogQ2hlY2sgaWYgYSBjb25zdHJ1Y3RvciBleGlzdHMuXG5cdCAqXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgQ29uc3RydWN0b3Iga2V5XG5cdCAqIEByZXR1cm4ge2Jvb2xlYW59IEZhY3RvcnkgaGFzIGNvbnRydWN0b3Igd2l0aCBtYXRjaGluZyBrZXlcblx0ICovXG5cdGhhcygga2V5ICkge1xuXHRcdHJldHVybiB0aGlzLmNvbnN0cnVjdG9ycy5oYXMoIGtleSApO1xuXHR9XG5cblx0LyoqXG5cdCAqIEdldCBhIGNvbnN0cnVjdG9yLlxuXHQgKlxuXHQgKiBAcGFyYW0ge3N0cmluZ30ga2V5IENvbnN0cnVjdG9yIGtleVxuXHQgKiBAcmV0dXJuIHtGdW5jdGlvbn0gY29uc3RydWN0b3IgQ29uc3RydWN0b3IgdG8gYWRkLCB3aWxsIGJlIGEgc3ViY2xhc3Mgb2YgI3N1cGVyY2xhc3Ncblx0ICovXG5cdGdldCgga2V5ICkge1xuXHRcdHJldHVybiB0aGlzLmNvbnN0cnVjdG9ycy5nZXQoIGtleSApO1xuXHR9XG5cblx0LyoqXG5cdCAqIENvbnN0cnVjdCBhbiBvYmplY3QuXG5cdCAqXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgQ29uc3RydWN0b3Iga2V5XG5cdCAqIEBwYXJhbSB7Li4uKn0gYXJncyBBcmd1bWVudHMgdG8gY29uc3RydWN0IG9iamVjdCB3aXRoXG5cdCAqIEB0aHJvd3Mge0Vycm9yfSBJZiBjb25zdHJ1Y3RvciBkb2Vzbid0IGV4aXN0XG5cdCAqIEByZXR1cm4ge09iamVjdH0gQ29uc3RydWN0ZWQgb2JqZWN0XG5cdCAqL1xuXHRjcmVhdGUoIGtleSwgLi4uYXJncyApIHtcblx0XHRpZiAoICF0aGlzLmNvbnN0cnVjdG9ycy5oYXMoIGtleSApICkge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCBgXCIke2tleX1cIiBjb25zdHJ1Y3RvciBkb2Vzbid0IGV4aXN0LmAgKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gbmV3ICggdGhpcy5jb25zdHJ1Y3RvcnMuZ2V0KCBrZXkgKSApKCAuLi5hcmdzICk7XG5cdH1cbn07XG4iLCIvKipcbiAqIEFwcC5cbiAqXG4gKiBAY2xhc3NcbiAqL1xuUGxhbmFyLkFwcCA9IGNsYXNzIHtcblx0LyoqXG5cdCAqIENyZWF0ZSBhbiBhcHBsaWNhdGlvbi5cblx0ICpcblx0ICogQHBhcmFtIHsuLi5QbGFuYXIuU3lzdGVtfSBzeXN0ZW1zIFN5c3RlbXMgdG8gdXNlXG5cdCAqIEBjb25zdHJ1Y3RvclxuXHQgKi9cblx0Y29uc3RydWN0b3IoIC4uLnN5c3RlbXMgKSB7XG5cdFx0Ly8gUHJvcGVydGllc1xuXHRcdHRoaXMucnVubmluZyA9IGZhbHNlO1xuXHRcdHRoaXMuaXRlcmF0aW9uID0gMDtcblx0XHR0aGlzLnN5c3RlbXMgPSBuZXcgU2V0KCk7XG5cdFx0dGhpcy5lbnRpdGllcyA9IG5ldyBTZXQoKTtcblx0XHR0aGlzLmFkZGl0aW9ucyA9IG5ldyBTZXQoKTtcblx0XHR0aGlzLmRlbGV0aW9ucyA9IG5ldyBTZXQoKTtcblx0XHR0aGlzLnRoZW4gPSBudWxsO1xuXHRcdHRoaXMucmVxdWVzdCA9IG51bGw7XG5cdFx0dGhpcy5kZWJ1ZyA9IHRydWU7XG5cdFx0dGhpcy5sb29wID0gdGhpcy5sb29wLmJpbmQoIHRoaXMgKTtcblxuXHRcdC8vIEluaXRpYWxpemF0aW9uXG5cdFx0Zm9yICggbGV0IHN5c3RlbSBvZiBzeXN0ZW1zICkge1xuXHRcdFx0dGhpcy5zeXN0ZW1zLmFkZCggc3lzdGVtICk7XG5cdFx0fVxuXHRcdHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCAnZm9jdXMnLCAoKSA9PiB0aGlzLnN0YXJ0KCkgKTtcblx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lciggJ2JsdXInLCAoKSA9PiB0aGlzLnN0b3AoKSApO1xuXHRcdGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoICd2aXNpYmlsaXR5Y2hhbmdlJywgKCkgPT4ge1xuXHRcdFx0dGhpc1tkb2N1bWVudC5oaWRkZW4gPyAnc3RvcCcgOiAnc3RhcnQnXSgpO1xuXHRcdH0gKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBGbHVzaCBxdWV1ZWQgYWRkaXRpb25zIGFuZCBkZWxldGlvbnMuXG5cdCAqXG5cdCAqIEFkZHMgZW50aXRpZXMgcXVldWVkIGZvciBhZGRpdGlvbiBjYWxsaW5nICNzeW5jIGZvciBlYWNoIG9mIHRoZW0gYWZ0ZXIgdGhleSBhcmUgYWRkZWQsXG5cdCAqIGRlbGV0ZXMgZW50aXRpZXMgcXVldWVkIGZvciBkZWxldGlvbiBjYWxsaW5nICNkcm9wIGZvciBlYWNoIG9mIHRoZW0gYWZ0ZXIgdGhleSBhcmUgZGVsZXRlZFxuXHQgKiBhbmQgY2xlYXJzIHRoZSBhZGRpdGlvbiBhbmQgZGVsZXRpb24gcXVldWVzLlxuXHQgKlxuXHQgKiBAY2hhaW5hYmxlXG5cdCAqL1xuXHRmbHVzaCgpIHtcblx0XHRmb3IgKCBsZXQgZW50aXR5IG9mIHRoaXMuYWRkaXRpb25zICkge1xuXHRcdFx0dGhpcy5lbnRpdGllcy5hZGQoIGVudGl0eSApO1xuXHRcdFx0Zm9yICggbGV0IHN5c3RlbSBvZiB0aGlzLnN5c3RlbXMgKSB7XG5cdFx0XHRcdGlmICggc3lzdGVtLmlzUmVsYXRlZCggZW50aXR5ICkgKSB7XG5cdFx0XHRcdFx0c3lzdGVtLmFkZCggZW50aXR5ICk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdFx0Zm9yICggbGV0IGVudGl0eSBvZiB0aGlzLmRlbGV0aW9ucyApIHtcblx0XHRcdHRoaXMuZW50aXRpZXMuZGVsZXRlKCBlbnRpdHkgKTtcblx0XHRcdGZvciAoIGxldCBzeXN0ZW0gb2YgdGhpcy5zeXN0ZW1zICkge1xuXHRcdFx0XHRpZiAoIHN5c3RlbS5oYXMoIGVudGl0eSApICkge1xuXHRcdFx0XHRcdHN5c3RlbS5kZWxldGUoIGVudGl0eSApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0XHR0aGlzLm9uRGVsZXRlKCBlbnRpdHkgKTtcblx0XHR9XG5cdFx0dGhpcy5hZGRpdGlvbnMuY2xlYXIoKTtcblx0XHR0aGlzLmRlbGV0aW9ucy5jbGVhcigpO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9XG5cblx0LyoqXG5cdCAqIFF1ZXVlIGVudGl0eSB0byBiZSBhZGRlZC5cblx0ICpcblx0ICogQWRkcyBlbnRpdHkgdG8gdGhlIGFkZGl0aW9uIHF1ZXVlLCByZW1vdmluZyBpdCBmcm9tIHRoZSBkZWxldGlvbiBxdWV1ZSBpZiBwcmVzZW50LlxuXHQgKlxuXHQgKiBAcGFyYW0ge09iamVjdH0gZW50aXR5IEVudGl0eSB0byBhZGQgdG8gYWRkaXRpb24gcXVldWVcblx0ICogQHRocm93cyB7RXJyb3J9IElmIGVudGl0eSBoYXMgYWxyZWFkeSBleGlzdHNcblx0ICogQHRocm93cyB7RXJyb3J9IElmIGVudGl0eSBoYXMgYWxyZWFkeSBiZWVuIGFkZGVkIHRvIGFkZGl0aW9uIHF1ZXVlXG5cdCAqIEBjaGFpbmFibGVcblx0ICovXG5cdGFkZCggZW50aXR5ICkge1xuXHRcdGlmICggdGhpcy5kZWxldGlvbnMuaGFzKCBlbnRpdHkgKSApIHtcblx0XHRcdHRoaXMuZGVsZXRpb25zLmRlbGV0ZSggZW50aXR5ICk7XG5cdFx0fSBlbHNlIGlmICggdGhpcy5lbnRpdGllcy5oYXMoIGVudGl0eSApICkge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCBgXCIke2VudGl0eS5rZXl9XCIgYWxyZWFkeSBleGlzdHMuYCApO1xuXHRcdH1cblx0XHRpZiAoIHRoaXMuYWRkaXRpb25zLmhhcyggZW50aXR5ICkgKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoIGBcIiR7ZW50aXR5LmtleX1cIiBoYXMgYWxyZWFkeSBiZWVuIGFkZGVkIHRvIGFkZGl0aW9uIHF1ZXVlLmAgKTtcblx0XHR9XG5cdFx0dGhpcy5hZGRpdGlvbnMuYWRkKCBlbnRpdHkgKTtcblx0XHRyZXR1cm4gdGhpcztcblx0fVxuXG5cdC8qKlxuXHQgKiBRdWV1ZSBlbnRpdHkgdG8gYmUgZGVsZXRlZC5cblx0ICpcblx0ICogQWRkcyBlbnRpdHkgdG8gdGhlIGRlbGV0aW9uIHF1ZXVlLCByZW1vdmluZyBpdCBmcm9tIHRoZSBhZGRpdGlvbiBxdWV1ZSBpZiBwcmVzZW50LlxuXHQgKlxuXHQgKiBAcGFyYW0ge09iamVjdH0gZW50aXR5IEVudGl0eSB0byBhZGQgdG8gZGVsZXRpb24gcXVldWVcblx0ICogQHRocm93cyB7RXJyb3J9IElmIGVudGl0eSBoYXMgYWxyZWFkeSBiZWVuIGFkZGVkIHRvIGRlbGV0aW9uIHF1ZXVlXG5cdCAqIEB0aHJvd3Mge0Vycm9yfSBJZiBlbnRpdHkga2V5IGRvZXNuJ3QgZXhpc3Rcblx0ICogQGNoYWluYWJsZVxuXHQgKi9cblx0ZGVsZXRlKCBlbnRpdHkgKSB7XG5cdFx0aWYgKCB0aGlzLmRlbGV0aW9ucy5oYXMoIGVudGl0eSApICkge1xuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCBgXCIke2VudGl0eS5rZXl9XCIgaGFzIGFscmVhZHkgYmVlbiBhZGRlZCB0byBkZWxldGlvbiBxdWV1ZS5gICk7XG5cdFx0fVxuXHRcdGlmICggIWVudGl0eSApIHtcblx0XHRcdHRocm93IG5ldyBFcnJvciggYFwiJHtlbnRpdHkua2V5fVwiIGRvZXNuJ3QgZXhpc3QuYCApO1xuXHRcdH1cblx0XHRpZiAoIHRoaXMuYWRkaXRpb25zLmhhcyggZW50aXR5ICkgKSB7XG5cdFx0XHR0aGlzLmFkZGl0aW9ucy5kZWxldGUoIGVudGl0eSApO1xuXHRcdH1cblx0XHR0aGlzLmRlbGV0aW9ucy5hZGQoIGVudGl0eSApO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9XG5cblx0LyoqXG5cdCAqIFF1ZXVlIGFsbCBlbnRpdGllcyB0byBiZSBjbGVhcmVkLlxuXHQgKlxuXHQgKiBDbGVhcnMgcXVldWVkIGFkZGl0aW9ucyBhbmQgZGVsZXRpb25zLCB0aGVuIHF1ZXVlcyBhbGwgZW50aXRpZXMgdG8gYmUgZGVsZXRlZC5cblx0ICpcblx0ICogQGNoYWluYWJsZVxuXHQgKi9cblx0Y2xlYXIoKSB7XG5cdFx0dGhpcy5hZGRpdGlvbnMuY2xlYXIoKTtcblx0XHR0aGlzLmRlbGV0aW9ucy5jbGVhcigpO1xuXHRcdHRoaXMuZW50aXRpZXMuZm9yRWFjaCggdGhpcy5kZWxldGlvbnMuYWRkLCB0aGlzLmRlbGV0aW9ucyApO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9XG5cblx0LyoqXG5cdCAqIFN0YXJ0IGFwcGxpY2F0aW9uLlxuXHQgKlxuXHQgKiBAY2hhaW5hYmxlXG5cdCAqL1xuXHRzdGFydCgpIHtcblx0XHRpZiAoICF0aGlzLnJ1bm5pbmcgKSB7XG5cdFx0XHR0aGlzLnJ1bm5pbmcgPSB0cnVlO1xuXHRcdFx0dGhpcy50aGVuID0gcGVyZm9ybWFuY2Uubm93KCk7XG5cdFx0XHR0aGlzLmxvb3AoIHRoaXMudGhlbiApO1xuXHRcdFx0ZG9jdW1lbnQudGl0bGUgPSAnKFJ1bm5pbmcpJztcblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cblxuXHQvKipcblx0ICogU3RvcCBhcHBsaWNhdGlvbi5cblx0ICpcblx0ICogQGNoYWluYWJsZVxuXHQgKi9cblx0c3RvcCgpIHtcblx0XHRpZiAoIHRoaXMucnVubmluZyApIHtcblx0XHRcdGNhbmNlbEFuaW1hdGlvbkZyYW1lKCB0aGlzLnJlcXVlc3QgKTtcblx0XHRcdHRoaXMucnVubmluZyA9IGZhbHNlO1xuXHRcdFx0dGhpcy50aGVuID0gbnVsbDtcblx0XHRcdGRvY3VtZW50LnRpdGxlID0gJyhJZGxlKSc7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9XG5cblx0LyoqXG5cdCAqIFJ1biBhcHBsaWNhdGlvbiBsb29wLlxuXHQgKlxuXHQgKiBMb29waW5nIHdpbGwgY29udGludWUgcnVubmluZyB1bnRpbCAjcnVubmluZyBpcyBzZXQgdG8gZmFsc2UuXG5cdCAqXG5cdCAqIEBwcml2YXRlXG5cdCAqIEBwYXJhbSB7RE9NSGlnaFJlc1RpbWVTdGFtcH0gdGltZXN0YW1wIEN1cnJlbnQgdGltZVxuXHQgKi9cblx0bG9vcCggbm93ICkge1xuXHRcdGlmICggdGhpcy5ydW5uaW5nICkge1xuXHRcdFx0bGV0IGRlbHRhID0gTWF0aC5taW4oIG5vdyAtIHRoaXMudGhlbiwgMjAwICk7XG5cdFx0XHR0aGlzLnRoZW4gPSBub3c7XG5cdFx0XHR0aGlzLml0ZXJhdGlvbisrO1xuXHRcdFx0dGhpcy5mbHVzaCgpO1xuXHRcdFx0Zm9yICggbGV0IHN5c3RlbSBvZiB0aGlzLnN5c3RlbXMgKSB7XG5cdFx0XHRcdHN5c3RlbS51cGRhdGUoIGRlbHRhICk7XG5cdFx0XHR9XG5cdFx0XHRmb3IgKCBsZXQgZW50aXR5IG9mIHRoaXMuZW50aXRpZXMgKSB7XG5cdFx0XHRcdGVudGl0eS51cGRhdGUoIGRlbHRhICk7XG5cdFx0XHR9XG5cdFx0XHR0aGlzLnJlcXVlc3QgPSByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoIHRoaXMubG9vcCApO1xuXHRcdH1cblx0fVxufTtcbiIsIi8qKlxuICogQ29tcG9uZW50LlxuICpcbiAqIEBjbGFzc1xuICogQG1vZHVsZSBDb21wb25lbnRzXG4gKi9cblBsYW5hci5Db21wb25lbnQgPSBjbGFzcyB7XG5cdC8qKlxuXHQgKiBAdHlwZWRlZiBDb21wb25lbnRTY2hlbWFEZWZpbml0aW9uXG5cdCAqIEB0eXBlIHtPYmplY3QuPHN0cmluZyxDb21wb25lbnRQcm9wZXJ0eURlZmluaXRpb258Q29tcG9uZW50UHJvcGVydHlHZXR0ZXI+fVxuXHQgKi9cblxuXHQvKipcblx0ICogQHR5cGVkZWYgQ29tcG9uZW50UHJvcGVydHlEZWZpbml0aW9uXG5cdCAqIEB0eXBlIHtBcnJheX1cblx0ICogQHByb3BlcnR5IHtGdW5jdGlvbn0gMCBQcm9wZXJ0eSB0eXBlLCBlcXVpdmlsYW50IHRvIHRoZSBjb25zdHJ1Y3RvciBwcm9wZXJ0eSBvZiBhIHZhbGlkIHZhbHVlXG5cdCAqIEBwcm9wZXJ0eSB7Kn0gMSBEZWZhdWx0IHZhbHVlXG5cdCAqL1xuXG5cdC8qKlxuXHQgKiBAY2FsbGJhY2sgQ29tcG9uZW50UHJvcGVydHlHZXR0ZXJcblx0ICogQHRoaXMge1BsYW5hci5Db21wb25lbnR9XG5cdCAqIEByZXR1cm4geyp9IENvbXB1dGVkIHZhbHVlXG5cdCAqL1xuXG5cdC8qKlxuXHQgKiBEZWZpbmUgYSBjb21wb25lbnQuXG5cdCAqXG5cdCAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsQ29tcG9uZW50U2NoZW1hRGVmaW5pdGlvbj59IGRlZmluaXRpb25zIExpc3Qgb2YgY29tcG9uZW50IGRlZmluaXRpb25zXG5cdCAqIEBjaGFpbmFibGVcblx0ICovXG5cdHN0YXRpYyBkZWZpbmUoIGRlZmluaXRpb25zICkge1xuXHRcdGZvciAoIGxldCBrZXkgaW4gZGVmaW5pdGlvbnMgKSB7XG5cdFx0XHRsZXQgY29uc3RydWN0b3IgPSBjbGFzcyBleHRlbmRzIFBsYW5hci5Db21wb25lbnQge307XG5cdFx0XHRjb25zdHJ1Y3Rvci5zY2hlbWEgPSBkZWZpbml0aW9uc1trZXldO1xuXHRcdFx0UGxhbmFyLkNvbXBvbmVudC5mYWN0b3J5LmFkZCgga2V5LCBjb25zdHJ1Y3RvciApO1xuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fVxuXG5cdC8qKlxuXHQgKiBDcmVhdGUgYSBjb21wb25lbnQuXG5cdCAqXG5cdCAqIEBjb25zdHJ1Y3RvclxuXHQgKiBAcGFyYW0ge09iamVjdH0gc3RhdGUgSW5pdGlhbCBwcm9wZXJ0eSB2YWx1ZXMsIG11c3QgY29uZm9ybSB0byBjb21wb25lbnQgc2NoZW1hXG5cdCAqIEB0aHJvd3Mge0Vycm9yfSBJZiBhIHByb3BlcnR5IGlzIGludmFsaWRcblx0ICogQHRocm93cyB7RXJyb3J9IElmIHByb3BlcnR5IGRlZmluaXRvbiBpbiBzY2hlbWEgaXMgaW52YWxpZCBcblx0ICovXG5cdGNvbnN0cnVjdG9yKCBzdGF0ZSApIHtcblx0XHRjb25zdCBzY2hlbWEgPSB0aGlzLmNvbnN0cnVjdG9yLnNjaGVtYTtcblx0XHRmb3IgKCBsZXQgcHJvcGVydHkgaW4gc2NoZW1hICkge1xuXHRcdFx0bGV0IGRlZmluaXRpb24gPSBzY2hlbWFbcHJvcGVydHldO1xuXHRcdFx0aWYgKCB0eXBlb2YgZGVmaW5pdGlvbiA9PT0gJ2Z1bmN0aW9uJyApIHtcblx0XHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KCB0aGlzLCBwcm9wZXJ0eSwgeyBnZXQ6IGRlZmluaXRpb24uYmluZCggdGhpcyApIH0gKTtcblx0XHRcdH0gZWxzZSBpZiAoIEFycmF5LmlzQXJyYXkoIGRlZmluaXRpb24gKSApIHtcblx0XHRcdFx0bGV0IFsgY29uc3RydWN0b3IsIGRlZmF1bHRWYWx1ZSBdID0gZGVmaW5pdGlvbjtcblx0XHRcdFx0aWYgKCBzdGF0ZVtwcm9wZXJ0eV0gIT09IHVuZGVmaW5lZCApIHtcblx0XHRcdFx0XHRpZiAoIHN0YXRlW3Byb3BlcnR5XS5jb25zdHJ1Y3RvciAhPT0gY29uc3RydWN0b3IgKSB7XG5cdFx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoIGBcIiR7cHJvcGVydHl9XCIgdHlwZSBpcyBpbnZsYWlkLmAgKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0dGhpc1twcm9wZXJ0eV0gPSBzdGF0ZVtwcm9wZXJ0eV07XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dGhpc1twcm9wZXJ0eV0gPSB0eXBlb2YgZGVmYXVsdFZhbHVlID09PSAnZnVuY3Rpb24nID9cblx0XHRcdFx0XHRcdGRlZmF1bHRWYWx1ZSgpIDogZGVmYXVsdFZhbHVlO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoIGBcIiR7cHJvcGVydHl9XCIgZGVmaW5pdGlvbiBpbiBzY2htZWEgaXMgaW52YWxpZC5gICk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG59O1xuXG4vKipcbiAqIENvbXBvbmVudCBmYWN0b3J5LlxuICpcbiAqIEBzdGF0aWNcbiAqIEB0eXBlIHtQbGFuYXIuRmFjdG9yeX1cbiAqL1xuUGxhbmFyLkNvbXBvbmVudC5mYWN0b3J5ID0gbmV3IFBsYW5hci5GYWN0b3J5KCBQbGFuYXIuQ29tcG9uZW50ICk7XG5cbi8qKlxuICogQ29tcG9uZW50IHNjaGVtYS5cbiAqXG4gKiBAc3RhdGljXG4gKiBAaW5oZXJpdGFibGVcbiAqIEB0eXBlIHtDb21wb25lbnRTY2hlbWFEZWZpbml0aW9ufVxuICovXG5QbGFuYXIuQ29tcG9uZW50LnNjaGVtYSA9IHt9O1xuXG5QbGFuYXIuQ29tcG9uZW50LmRlZmluZSgge1xuXHQvKipcblx0ICogQW5pbWF0aW9uIGNvbXBvbmVudC5cblx0ICpcblx0ICogQGNsYXNzXG5cdCAqIEBleHRlbmRzIHtQbGFuYXIuQ29tcG9uZW50fVxuXHQgKiBAbWVtYmVyb2YgQ29tcG9uZW50c1xuXHQgKi9cblx0YW5pbWF0aW9uOiB7fSxcblx0LyoqXG5cdCAqIE1vdGlvbiBjb21wb25lbnQuXG5cdCAqXG5cdCAqIEBjbGFzc1xuXHQgKiBAZXh0ZW5kcyB7UGxhbmFyLkNvbXBvbmVudH1cblx0ICogQG1lbWJlcm9mIENvbXBvbmVudHNcblx0ICovXG5cdG1vdGlvbjoge1xuXHRcdGlzU3RhdGljOiBbIEJvb2xlYW4sIGZhbHNlIF0sXG5cdFx0aXNTZW5zb3I6IFsgQm9vbGVhbiwgZmFsc2UgXSxcblx0XHR0aW1lU2NhbGU6IFsgTnVtYmVyLCAxIF0sXG5cdFx0Zm9yY2U6IFsgUGxhbmFyLlBvaW50LCAoKSA9PiBuZXcgUGxhbmFyLlBvaW50KCkgXSxcblx0XHR0b3JxdWU6IFsgTnVtYmVyLCAwIF0sXG5cdFx0YXJlYTogWyBOdW1iZXIsIDAgXSxcblx0XHRtYXNzOiBbIE51bWJlciwgMCBdLFxuXHRcdGluZXJ0aWE6IFsgTnVtYmVyLCAwIF0sXG5cdFx0bGluZWFyU3BlZWQ6IFsgTnVtYmVyLCAwIF0sXG5cdFx0bGluZWFyVmVsb2NpdHk6IFsgUGxhbmFyLlBvaW50LCAoKSA9PiBuZXcgUGxhbmFyLlBvaW50KCkgXSxcblx0XHRhbmd1bGFyU3BlZWQ6IFsgTnVtYmVyLCAwIF0sXG5cdFx0YW5ndWxhclZlbG9jaXR5OiBbIE51bWJlciwgMCBdXG5cdH0sXG5cdC8qKlxuXHQgKiBEcmF3IGNvbXBvbmVudC5cblx0ICpcblx0ICogQGNsYXNzXG5cdCAqIEBleHRlbmRzIHtQbGFuYXIuQ29tcG9uZW50fVxuXHQgKiBAbWVtYmVyb2YgQ29tcG9uZW50c1xuXHQgKi9cblx0ZHJhdzoge1xuXHRcdGZpbGxDb2xvcjogWyBOdW1iZXIsIDAgXSxcblx0XHRmaWxsQWxwaGE6IFsgTnVtYmVyLCAxIF0sXG5cdFx0c3Ryb2tlV2lkdGg6IFsgTnVtYmVyLCAwIF0sXG5cdFx0c3Ryb2tlQ29sb3I6IFsgTnVtYmVyLCAwIF0sXG5cdFx0c3Ryb2tlQWxwaGE6IFsgTnVtYmVyLCAxIF0sXG5cdFx0aXNEeW5hbWljOiBbQm9vbGVhbiwgdHJ1ZV1cblx0fSxcblx0LyoqXG5cdCAqIEZpbHRlciBjb21wb25lbnQuXG5cdCAqXG5cdCAqIEBjbGFzc1xuXHQgKiBAZXh0ZW5kcyB7UGxhbmFyLkNvbXBvbmVudH1cblx0ICogQG1lbWJlcm9mIENvbXBvbmVudHNcblx0ICovXG5cdGZpbHRlcjoge1xuXHRcdGFscGhhOiBbIE51bWJlciwgMSBdXG5cdH0sXG5cdC8qKlxuXHQgKiBNYXRlcmlhbCBjb21wb25lbnQuXG5cdCAqXG5cdCAqIEBjbGFzc1xuXHQgKiBAZXh0ZW5kcyB7UGxhbmFyLkNvbXBvbmVudH1cblx0ICogQG1lbWJlcm9mIENvbXBvbmVudHNcblx0ICovXG5cdG1hdGVyaWFsOiB7XG5cdFx0ZGVuc2l0eTogWyBOdW1iZXIsIDAuMDAxIF0sXG5cdFx0ZHluYW1pY0ZyaWN0aW9uOiBbIE51bWJlciwgMC4xIF0sXG5cdFx0YWlyRnJpY3Rpb246IFsgTnVtYmVyLCAwLjAxIF0sXG5cdFx0c3RhdGljRnJpY3Rpb246IFsgTnVtYmVyLCAwLjA1IF0sXG5cdFx0cmVzdGl0dXRpb246IFsgTnVtYmVyLCAwIF1cblx0fSxcblx0LyoqXG5cdCAqIFBsYXllciBjb21wb25lbnQuXG5cdCAqXG5cdCAqIEBjbGFzc1xuXHQgKiBAZXh0ZW5kcyB7UGxhbmFyLkNvbXBvbmVudH1cblx0ICogQG1lbWJlcm9mIENvbXBvbmVudHNcblx0ICovXG5cdHBsYXllcjoge30sXG5cdC8qKlxuXHQgKiBTaGFwZSBjb21wb25lbnQuXG5cdCAqXG5cdCAqIEBjbGFzc1xuXHQgKiBAZXh0ZW5kcyB7UGxhbmFyLkNvbXBvbmVudH1cblx0ICogQG1lbWJlcm9mIENvbXBvbmVudHNcblx0ICovXG5cdHNoYXBlOiB7XG5cdFx0dHlwZTogWyBTdHJpbmcsICdyZWN0YW5nbGUnIF0sXG5cdFx0cmFkaXVzOiBbIE51bWJlciwgMCBdLFxuXHRcdHNpZGVzOiBbIE51bWJlciwgMCBdLFxuXHRcdHdpZHRoOiBbIE51bWJlciwgMCBdLFxuXHRcdGhlaWdodDogWyBOdW1iZXIsIDAgXSxcblx0XHRwb2ludHM6IFsgQXJyYXksIFtdIF0sXG5cdFx0c2lnbmF0dXJlOiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy50eXBlICsgdGhpcy5wb2ludHMubGVuZ3RoO1xuXHRcdH1cblx0fSxcblx0LyoqXG5cdCAqIFRyYW5zZm9ybSBjb21wb25lbnQuXG5cdCAqXG5cdCAqIEBjbGFzc1xuXHQgKiBAZXh0ZW5kcyB7UGxhbmFyLkNvbXBvbmVudH1cblx0ICogQG1lbWJlcm9mIENvbXBvbmVudHNcblx0ICovXG5cdHRyYW5zZm9ybToge1xuXHRcdHBvc2l0aW9uOiBbIFBsYW5hci5Qb2ludCwgKCkgPT4gbmV3IFBsYW5hci5Qb2ludCggMCwgMCApIF0sXG5cdFx0cGl2b3Q6IFsgUGxhbmFyLlBvaW50LCAoKSA9PiBuZXcgUGxhbmFyLlBvaW50KCAwLCAwICkgXSxcblx0XHRyb3RhdGlvbjogWyBOdW1iZXIsIDAgXVxuXHR9LFxuXHQvKipcblx0ICogV2FycCBjb21wb25lbnQuXG5cdCAqXG5cdCAqIEBjbGFzc1xuXHQgKiBAZXh0ZW5kcyB7UGxhbmFyLkNvbXBvbmVudH1cblx0ICogQG1lbWJlcm9mIENvbXBvbmVudHNcblx0ICovXG5cdHdhcnA6IHtcblx0XHRzY2FsZTogWyBQbGFuYXIuUG9pbnQsICgpID0+IG5ldyBQbGFuYXIuUG9pbnQoIDEsIDEgKSBdXG5cdH1cbn0gKTtcbiIsIi8qKlxuICogRW50aXR5LlxuICpcbiAqIEBjbGFzc1xuICovXG5QbGFuYXIuRW50aXR5ID0gY2xhc3Mge1xuXHQvKipcblx0ICogQ3JlYXRlIGFuIGVudGl0eS5cblx0ICpcblx0ICogQGNvbnN0cnVjdG9yXG5cdCAqIEBwYXJhbSB7UGxhbmFyLkFwcH0gYXBwIEFwcGxpY2F0aW9uIGVudGl0eSBpcyBiZWluZyBhZGRlZCB0b1xuXHQgKi9cblx0Y29uc3RydWN0b3IoIGFwcCApIHtcblx0XHR0aGlzLmFwcCA9IGFwcDtcblx0XHR0aGlzLml0ZXJhdGlvbiA9IDA7XG5cdFx0dGhpcy5jb21wb25lbnRzID0ge307XG5cdFx0dGhpcy5jaGFuZ2VkID0ge307XG5cdFx0dGhpcy5rZXkgPSB0aGlzLmNvbnN0cnVjdG9yLmNvdW50Kys7XG5cdH1cblxuXHQvKipcblx0ICogVXBkYXRlIHN5c3RlbS5cblx0ICpcblx0ICogSW5jcmltZW50cyB0aGUgaXRlcmF0aW9uIGNvdW50ZXIuXG5cdCAqXG5cdCAqIEBwYXJhbSB7bnVtYmVyfSBkZWx0YSBUaW1lIGVsbGFwc2VkIHNpbmNlIGxhc3QgdXBkYXRlIGluIG1pbGxpc2Vjb25kc1xuXHQgKiBAY2hhaW5hYmxlXG5cdCAqL1xuXHR1cGRhdGUoIGRlbHRhICkge1xuXHRcdHRoaXMuaXRlcmF0aW9uKys7XG5cdH1cblxuXHQvKipcblx0ICogQGNhbGxiYWNrIEVudGl0eUNoYW5nZUNhbGxiYWNrXG5cdCAqIEBwYXJhbSB7T2JqZWN0fSBzdGF0ZSBSZWZlcmVuY2UgdG8gY29tcG9uZW50LCBjaGFuZ2VzIHdpbGwgYWZmZWN0IGNvbXBvbmVudFxuXHQgKiBAcmV0dXJuIHtPYmplY3R8dW5kZWZpbmVkfSBQcm9wZXJ0aWVzIHRvIGFzc2lnbiB0byBjb21wb25lbnRcblx0ICovXG5cblx0LyoqXG5cdCAqIENoYW5nZSBwcm9wZXJ0aWVzIG9mIGNvbXBvbmVudHMuXG5cdCAqXG5cdCAqIElmIHRoZSBhcHAgaXMgaW4gZGVidWcgbW9kZSwgY2hhbmdlcyB3aWxsIGJlIGNoZWNrZWQgYWdhaW5zdCB0aGUgY29tcG9uZW50cycgc2NoZW1hLlxuXHQgKlxuXHQgKiBAcGFyYW0ge09iamVjdC48c3RyaW5nLENvbXBvbmVudENoYW5nZUNhbGxiYWNrfE9iamVjdD59IGNoYW5nZXJzIENoYW5nZXIgY2FsbGJhY2tzIG9yIGxpc3RzXG5cdCAqICAgb2YgcHJvcGVydHkgY2hhbmdlcywga2V5ZWQgYnkgY29tcG9uZW5lbnQga2V5LCB3aWxsIGJlIHNraXBwZWQgaWYgY29tcG9uZW50IGRvZXMgbm90IGV4aXN0XG5cdCAqIEB0aHJvd3Mge0Vycm9yfSBJZiBhIGNvbXBvbmVudCBjaGFuZ2VyIGlzIHRoZSB3cm9uZyB0eXBlXG5cdCAqIEB0aHJvd3Mge0Vycm9yfSBJZiBhIHByb3BlcnR5IGlzIGludmFsaWQgKG9ubHkgaW4gZGVidWcgbW9kZSlcblx0ICogQHRocm93cyB7RXJyb3J9IElmIGEgcHJvcGVydHkgaXMgdGhlIHdyb25nIHR5cGUgKG9ubHkgaW4gZGVidWcgbW9kZSlcblx0ICogQGNoYWluYWJsZVxuXHQgKi9cblx0Y2hhbmdlKCBjaGFuZ2VycyApIHtcblx0XHRjb25zdCBpdGVyYXRpb24gPSB0aGlzLml0ZXJhdGlvbjtcblx0XHRmb3IgKCBsZXQga2V5IGluIGNoYW5nZXJzICkge1xuXHRcdFx0bGV0IGNoYW5nZXIgPSBjaGFuZ2Vyc1trZXldLFxuXHRcdFx0XHRjb21wb25lbnQgPSB0aGlzLmNvbXBvbmVudHNba2V5XTtcblx0XHRcdGlmICggY29tcG9uZW50ICkge1xuXHRcdFx0XHRsZXQgY2hhbmdlcztcblx0XHRcdFx0aWYgKCB0eXBlb2YgY2hhbmdlciA9PT0gJ29iamVjdCcgKSB7XG5cdFx0XHRcdFx0Y2hhbmdlcyA9IGNoYW5nZXJzW2tleV07XG5cdFx0XHRcdH0gZWxzZSBpZiAoIHR5cGVvZiBjaGFuZ2VyID09PSAnZnVuY3Rpb24nICkge1xuXHRcdFx0XHRcdGNoYW5nZXMgPSBjaGFuZ2Vyc1trZXldKCBjb21wb25lbnQgKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoIGBcIiR7a2V5fVwiIGNvbXBvbmVudCBjaGFuZ2VyIGlzIHRoZSB3cm9uZyB0eXBlYCApO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGlmICggdHlwZW9mIGNoYW5nZXMgPT09ICdvYmplY3QnICkge1xuXHRcdFx0XHRcdE9iamVjdC5hc3NpZ24oIGNvbXBvbmVudCwgY2hhbmdlcyApO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHRoaXMuY2hhbmdlZFtrZXldID0gaXRlcmF0aW9uO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCB0aGlzLmFwcC5kZWJ1ZyApIHtcblx0XHRcdFx0bGV0IHNjaGVtYSA9IGNvbXBvbmVudC5jb25zdHJ1Y3Rvci5zY2hlbWE7XG5cdFx0XHRcdGZvciAoIGxldCBwcm9wZXJ0eSBpbiBjb21wb25lbnQgKSB7XG5cdFx0XHRcdFx0bGV0IGRlZmluaXRpb24gPSBzY2hlbWFbcHJvcGVydHldO1xuXHRcdFx0XHRcdGlmICggQXJyYXkuaXNBcnJheSggdHlwZW9mIGRlZmluaXRpb24gKSApIHtcblx0XHRcdFx0XHRcdGxldCB2YWx1ZSA9IGNvbXBvbmVudFtwcm9wZXJ0eV0sXG5cdFx0XHRcdFx0XHRcdFsgY29uc3RydWN0b3IgXSA9IGRlZmluaXRpb247XG5cdFx0XHRcdFx0XHRpZiAoIGRlZmluaXRpb24gPT09IHVuZGVmaW5lZCApIHtcblx0XHRcdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCBgXCIke3Byb3BlcnR5fVwiIGlzIGFuIGludmFsaWQgcHJvcGVydHkuYCApO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0aWYgKCB2YWx1ZS5jb25zdHJ1Y3RvciAhPT0gY29uc3RydWN0b3IgKSB7XG5cdFx0XHRcdFx0XHRcdHRocm93IG5ldyBFcnJvciggYFwiJHt2YWx1ZS5jb25zdHJ1Y3Rvci5uYW1lfVwiIGlzIHRoZSB3cm9uZyB0eXBlLmAgKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIHRoaXM7XG5cdH1cblxuXHQvKipcblx0ICogQGNhbGxiYWNrIEVudGl0eUhhbmRsZUNhbGxiYWNrU2luZ2xlXG5cdCAqIEBwYXJhbSB7UGxhbmFyLkNvbXBvbmVudH0gc3RhdGUgUmVmZXJlbmNlIHRvIGNvbXBvbmVudCwgY2hhbmdlcyB3aWxsIGFmZmVjdCBjb21wb25lbnRcblx0ICovXG5cblx0LyoqXG5cdCAqIEBjYWxsYmFjayBFbnRpdHlIYW5kbGVDYWxsYmFja011bHRpXG5cdCAqIEBwYXJhbSB7Li4uUGxhbmFyLkNvbXBvbmVudH0gY29tcG9uZW50cyBSZWZlcmVuY2VzIHRvIGNvbXBvbmVudHMsIGNoYW5nZXMgd2lsbCBhZmZlY3QgY29tcG9uZW50c1xuXHQgKi9cblxuXHQvKipcblx0ICogSGFuZGxlIGNoYW5nZXMgZm9yIGNvbXBvbmVudHMgaWYgYW55IGhhcyBjaGFuZ2VkIHNpbmNlIGxhc3QgaXRlcmF0aW9uLlxuXHQgKlxuXHQgKiBAcGFyYW0ge3N0cmluZ3xzdHJpbmdbXX0ga2V5cyBDb21wb25lbnQga2V5c1xuXHQgKiBAcGFyYW0ge0VudGl0eUhhbmRsZUNhbGxiYWNrTXVsdGl9IGhhbmRsZXIgSGFuZGxlciBjYWxsYmFjaywgd2lsbCBiZSBpbnZva2VkIG9uY2UgaWYgYW55IG9mXG5cdCAqICAgdGhlIGNvbXBvbmVudHMgZXhpc3QgYW5kIGhhdmUgY2hhbmdlZCBzaW5jZSBsYXN0IGl0ZXJhdGlvbiwgc2tpcHBlZCBpZiBhbGwgZG8gbm90IGV4aXN0IG9yXG5cdCAqICAgaGF2ZW4ndCBjaGFuZ2VkIHNpbmNlIGxhc3QgaXRlcmF0aW9uXG5cdCAqIEBjaGFpbmFibGVcblx0ICovLyoqXG5cdCAqIEhhbmRsZSBjaGFuZ2VzIGZvciBhIGNvbXBvbmVudCBpZiBpdCBoYXMgY2hhbmdlZCBzaW5jZSBsYXN0IGl0ZXJhdGlvbi5cblx0ICpcblx0ICogQHBhcmFtIHtzdHJpbmd9IGtleSBDb21wb25lbnQga2V5XG5cdCAqIEBwYXJhbSB7RW50aXR5SGFuZGxlQ2FsbGJhY2tTaW5nbGV9IGhhbmRsZXIgSGFuZGxlciBjYWxsYmFjaywgd2lsbCBiZSBpbnZva2VkIGlmIHRoZVxuXHQgKiAgIGNvbXBvbmVudCBleGlzdHMgYW5kIGhhcyBjaGFuZ2VkIHNpbmNlIGxhc3QgaXRlcmF0aW9uLCBza2lwcGVkIG90aGVyd2lzZVxuXHQgKiBAY2hhaW5hYmxlXG5cdCAqLy8qKlxuXHQgKiBIYW5kbGUgY2hhbmdlcyBmb3IgY29tcG9uZW50cyB3aGljaCBoYXZlIGNoYW5nZWQgc2luY2UgbGFzdCBpdGVyYXRpb24uXG5cdCAqXG5cdCAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsRW50aXR5SGFuZGxlQ2FsbGJhY2tTaW5nbGU+fSBoYW5kbGVycyBIYW5kbGVyIGNhbGxiYWNrcywga2V5ZWQgYnlcblx0ICogICBjb21wb25lbmVudCBrZXksIGVhY2ggd2lsbCBiZSBza2lwcGVkIGlmIGNvbXBvbmVudCBrZXkgZG9lcyBub3QgZXhpc3Qgb3IgY29tcG9uZW50IGhhc24ndFxuXHQgKiAgIGJlZW4gY2hhbmdlZCBzaW5jZSBsYXN0IGl0ZXJhdGlvblxuXHQgKiBAY2hhaW5hYmxlXG5cdCAqL1xuXHRoYW5kbGUoIC4uLmFyZ3MgKSB7XG5cdFx0Y29uc3QgaXRlcmF0aW9uID0gdGhpcy5pdGVyYXRpb247XG5cdFx0dmFyIFsga2V5cywgaGFuZGxlciBdID0gYXJncyxcblx0XHRcdFsgaGFuZGxlcnMgXSA9IGFyZ3M7XG5cblx0XHRpZiAoIHR5cGVvZiBjb25zdHJ1Y3RvciA9PT0gJ3N0cmluZycgKSB7XG5cdFx0XHRrZXlzID0gW2tleXNdO1xuXHRcdH1cblx0XHRpZiAoIEFycmF5LmlzQXJyYXkoIGtleXMgKSAmJiB0eXBlb2YgaGFuZGxlciA9PT0gJ2Z1bmN0aW9uJyApIHtcblx0XHRcdGxldCBjb21wb25lbnRzID0gW10sXG5cdFx0XHRcdGNvdW50ID0gMDtcblx0XHRcdGZvciAoIGxldCBrZXkgb2Yga2V5cyApIHtcblx0XHRcdFx0bGV0IGNvbXBvbmVudCA9IHRoaXMuY29tcG9uZW50c1trZXldO1xuXHRcdFx0XHRpZiAoIGNvbXBvbmVudCAmJiB0aGlzLmNoYW5nZWRba2V5XSA+PSBpdGVyYXRpb24gKSB7XG5cdFx0XHRcdFx0Y291bnQrKztcblx0XHRcdFx0fVxuXHRcdFx0XHRjb21wb25lbnRzLnB1c2goIGNvbXBvbmVudCApO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCBjb3VudCApIHtcblx0XHRcdFx0aGFuZGxlciggLi4uY29tcG9uZW50cyApO1xuXHRcdFx0fVxuXHRcdH0gZWxzZSBpZiAoIGhhbmRsZXJzLmNvbnN0cnVjdG9yID09PSBPYmplY3QgKSB7XG5cdFx0XHRmb3IgKCBsZXQga2V5IGluIGhhbmRsZXJzICkge1xuXHRcdFx0XHRsZXQgY29tcG9uZW50ID0gdGhpcy5jb21wb25lbnRzW2tleV07XG5cdFx0XHRcdGlmICggY29tcG9uZW50ICYmIHRoaXMuY2hhbmdlZFtrZXldID49IGl0ZXJhdGlvbiApIHtcblx0XHRcdFx0XHRoYW5kbGVyc1trZXldKCBjb21wb25lbnQgKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gdGhpcztcblx0fVxuXG5cdC8qKlxuXHQgKiBBZGQgY29tcG9uZW50cy5cblx0ICpcblx0ICogQHBhcmFtIHtPYmplY3QuPHN0cmluZyxPYmplY3Q+fSBjb21wb25lbnRzIExpc3Qgb2YgY29tcG9uZW50cyB0byBhZGQgYXNcblx0ICogICBjb21wb25lbnQta2V5L2luaXRpYWwtc3RhdGUgcGFpcnNcblx0ICovXG5cdGFkZCggY29tcG9uZW50cyApIHtcblx0XHRmb3IgKCBsZXQga2V5IGluIGNvbXBvbmVudHMgKSB7XG5cdFx0XHRsZXQgY29tcG9uZW50ID0gUGxhbmFyLkNvbXBvbmVudC5mYWN0b3J5LmNyZWF0ZSgga2V5LCBjb21wb25lbnRzW2tleV0gKTtcblx0XHRcdHRoaXMuY29tcG9uZW50c1trZXldID0gY29tcG9uZW50O1xuXHRcdFx0dGhpcy5jaGFuZ2VkW2tleV0gPSB0aGlzLml0ZXJhdGlvbjtcblx0XHR9XG5cdH1cblxuXHQvKipcblx0ICogUmVtb3ZlIGNvbXBvbmVudHMuXG5cdCAqXG5cdCAqIEBwYXJhbSB7Li4uc3RyaW5nfSBba2V5c10gQ29tcG9uZW50IGtleXMgdG8gcmVtb3ZlXG5cdCAqIEBjaGFpbmFibGVcblx0ICovXG5cdHJlbW92ZSggLi4ua2V5cyApIHtcblx0XHRmb3IgKCBsZXQga2V5IG9mIGtleXMgKSB7XG5cdFx0XHRkZWxldGUgdGhpcy5jb21wb25lbnRzW2tleV07XG5cdFx0XHRkZWxldGUgdGhpcy5jaGFuZ2VkW2tleV07XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9XG5cblx0LyoqXG5cdCAqIEdldCBhIGNvbGxlY3Rpb24gb2YgY29tcG9uZW50cy5cblx0ICpcblx0ICogQHBhcmFtIHsuLi5zdHJpbmd9IFtrZXlzXSBDb21wb25lbnQga2V5cyB0byBzZWxlY3Rcblx0ICogQHJldHVybiB7T2JqZWN0LjxzdHJpbmcsUGxhbmFyLkNvbXBvbmVudD59IFNlbGVjdGVkIGNvbXBvbmVudHNcblx0ICovXG5cdHNlbGVjdCggLi4ua2V5cyApIHtcblx0XHRjb25zdCBjb2xsZWN0aW9uID0ge307XG5cdFx0Zm9yICggbGV0IGtleSBvZiBrZXlzICkge1xuXHRcdFx0Y29sbGVjdGlvbltrZXldID0gdGhpcy5jb21wb25lbnRzW2tleV07XG5cdFx0fVxuXHRcdHJldHVybiBjb2xsZWN0aW9uO1xuXHR9XG5cblx0LyoqXG5cdCAqIENoZWNrIGlmIGVudGl0eSBoYXMgb25lIG9yIG1vcmUgY29tcG9uZW50cy5cblx0ICpcblx0ICogQHBhcmFtIHsuLi5zdHJpbmd9IFtrZXlzXSBDb21wb25lbnQga2V5cyB0byBjaGVjayBmb3Jcblx0ICogQHJldHVybiB7Ym9vbGVhbn0gRW50aXR5IGhhcyBhbGwgY29tcG9uZW50c1xuXHQgKi9cblx0aGFzKCAuLi5rZXlzICkge1xuXHRcdGZvciAoIGxldCBrZXkgb2Yga2V5cyApIHtcblx0XHRcdGlmICggdGhpcy5jb21wb25lbnRzW2tleV0gPT09IHVuZGVmaW5lZCApIHtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gdHJ1ZTtcblx0fVxufTtcblxuUGxhbmFyLkVudGl0eS5jb3VudCA9IDA7XG4iLCIvKipcbiAqIElucHV0LlxuICpcbiAqIEBjbGFzc1xuICovXG5QbGFuYXIuSW5wdXQgPSBjbGFzcyB7XG5cdC8qKlxuXHQgKiBDcmVhdGUgYW4gaW5wdXQuXG5cdCAqXG5cdCAqIEBjb25zdHJ1Y3RvclxuXHQgKiBAcGFyYW0ge0VsZW1lbnR9IGVsZW1lbnQgRE9NIGVsZW1lbnQgdG8gbGlzdGVuIHRvIGV2ZW50cyBvblxuXHQgKi9cblx0Y29uc3RydWN0b3IoIGVsZW1lbnQgKSB7XG5cdFx0dGhpcy5lbGVtZW50ID0gZWxlbWVudDtcblx0fVxufTtcbiIsIi8qKlxuICogU3lzdGVtLlxuICpcbiAqIEBjbGFzc1xuICovXG5QbGFuYXIuU3lzdGVtID0gY2xhc3Mge1xuXHQvKipcblx0ICogQ3JlYXRlIGEgc3lzdGVtLlxuXHQgKlxuXHQgKiBAY29uc3RydWN0b3Jcblx0ICovXG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHRoaXMuZW50aXRpZXMgPSBuZXcgU2V0KCk7XG5cdH1cblxuXHQvKipcblx0ICogQ2hlY2sgaWYgZW50aXR5IGlzIHJlbGF0ZWQgdG8gdGhpcyBzeXN0ZW0uXG5cdCAqXG5cdCAqIEBwYXJhbSB7UGxhbmFyLkVudGl0eX0gZW50aXR5IEVudGl0eSB0byBjaGVjayBmb3Jcblx0ICogQHJldHVybiB7Ym9vbGVhbn0gRW50aXR5IGlzIHJlbGF0ZWQgdG8gdGhpcyBzeXN0ZW1cblx0ICovXG5cdGlzUmVsYXRlZCggZW50aXR5ICkge1xuXHRcdHJldHVybiB0cnVlO1xuXHR9XG5cblx0LyoqXG5cdCAqIEFkZCBhbiBlbnRpdHkuXG5cdCAqXG5cdCAqIEBwYXJhbSB7UGxhbmFyLkVudGl0eX0gZW50aXR5IEVudGl0eSB0byBhZGRcblx0ICovXG5cdGFkZCggZW50aXR5ICkge1xuXHRcdHRoaXMuZW50aXRpZXMuYWRkKCBlbnRpdHkgKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBEZWxldGUgYW4gZW50aXR5LlxuXHQgKlxuXHQgKiBAcGFyYW0ge1BsYW5hci5FbnRpdHl9IGVudGl0eSBFbnRpdHkgdG8gZGVsZXRlXG5cdCAqL1xuXHRkZWxldGUoIGVudGl0eSApIHtcblx0XHR0aGlzLmVudGl0aWVzLmRlbGV0ZSggZW50aXR5ICk7XG5cdH1cblxuXHQvKipcblx0ICogQ2hlY2sgaWYgYW4gZW50aXR5IGV4aXN0cy5cblx0ICpcblx0ICogQHBhcmFtIHtQbGFuYXIuRW50aXR5fSBlbnRpdHkgRW50aXR5IHRvIGNoZWNrIGZvci5cblx0ICovXG5cdGhhcyggZW50aXR5ICkge1xuXHRcdHRoaXMuZW50aXRpZXMuaGFzKCBlbnRpdHkgKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBVcGRhdGUgc3lzdGVtLlxuXHQgKlxuXHQgKiBAcGFyYW0ge251bWJlcn0gZGVsdGEgVGltZSBlbGxhcHNlZCBzaW5jZSBsYXN0IHVwZGF0ZSBpbiBtaWxsaXNlY29uZHNcblx0ICogQGNoYWluYWJsZVxuXHQgKi9cblx0dXBkYXRlKCBkZWx0YSApIHtcblx0XHQvL1xuXHR9XG59O1xuIiwiLyoqXG4gKiBLZXlib2FyZCBpbnB1dC5cbiAqXG4gKiBAY2xhc3NcbiAqL1xuUGxhbmFyLklucHV0LktleWJvYXJkID0gY2xhc3MgZXh0ZW5kcyBQbGFuYXIuSW5wdXQge1xuXHQvKipcblx0ICogQGluaGVyaXRkb2Ncblx0ICovXG5cdGNvbnN0cnVjdG9yKCBlbGVtZW50ICkge1xuXHRcdHN1cGVyKCBlbGVtZW50ICk7XG5cblx0XHR0aGlzLmtleXMgPSB7fTtcblxuXHRcdHRoaXMuZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCAna2V5ZG93bicsICggZSApID0+IHtcblx0XHRcdHRoaXMua2V5c1tlLmtleUNvZGVdID0gdHJ1ZTtcblx0XHR9ICk7XG5cdFx0dGhpcy5lbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoICdrZXl1cCcsICggZSApID0+IHtcblx0XHRcdHRoaXMua2V5c1tlLmtleUNvZGVdID0gZmFsc2U7XG5cdFx0fSApO1xuXHR9XG59O1xuXG4vKipcbiAqIEBzdGF0aWNcbiAqIEBwcm9wZXJ0eSB7T2JqZWN0fSBLZXkgY29kZXNcbiAqL1xuUGxhbmFyLklucHV0LktleWJvYXJkLmNvZGVzID0ge1xuXHRBOiBcIkFcIi5jaGFyQ29kZUF0KCAwICksXG5cdEI6IFwiQlwiLmNoYXJDb2RlQXQoIDAgKSxcblx0QzogXCJDXCIuY2hhckNvZGVBdCggMCApLFxuXHREOiBcIkRcIi5jaGFyQ29kZUF0KCAwICksXG5cdEU6IFwiRVwiLmNoYXJDb2RlQXQoIDAgKSxcblx0RjogXCJGXCIuY2hhckNvZGVBdCggMCApLFxuXHRHOiBcIkdcIi5jaGFyQ29kZUF0KCAwICksXG5cdEg6IFwiSFwiLmNoYXJDb2RlQXQoIDAgKSxcblx0STogXCJJXCIuY2hhckNvZGVBdCggMCApLFxuXHRKOiBcIkpcIi5jaGFyQ29kZUF0KCAwICksXG5cdEs6IFwiS1wiLmNoYXJDb2RlQXQoIDAgKSxcblx0TDogXCJMXCIuY2hhckNvZGVBdCggMCApLFxuXHRNOiBcIk1cIi5jaGFyQ29kZUF0KCAwICksXG5cdE46IFwiTlwiLmNoYXJDb2RlQXQoIDAgKSxcblx0TzogXCJPXCIuY2hhckNvZGVBdCggMCApLFxuXHRQOiBcIlBcIi5jaGFyQ29kZUF0KCAwICksXG5cdFE6IFwiUVwiLmNoYXJDb2RlQXQoIDAgKSxcblx0UjogXCJSXCIuY2hhckNvZGVBdCggMCApLFxuXHRTOiBcIlNcIi5jaGFyQ29kZUF0KCAwICksXG5cdFQ6IFwiVFwiLmNoYXJDb2RlQXQoIDAgKSxcblx0VTogXCJVXCIuY2hhckNvZGVBdCggMCApLFxuXHRWOiBcIlZcIi5jaGFyQ29kZUF0KCAwICksXG5cdFc6IFwiV1wiLmNoYXJDb2RlQXQoIDAgKSxcblx0WDogXCJYXCIuY2hhckNvZGVBdCggMCApLFxuXHRZOiBcIllcIi5jaGFyQ29kZUF0KCAwICksXG5cdFo6IFwiWlwiLmNoYXJDb2RlQXQoIDAgKSxcblx0WkVSTzogXCIwXCIuY2hhckNvZGVBdCggMCApLFxuXHRPTkU6IFwiMVwiLmNoYXJDb2RlQXQoIDAgKSxcblx0VFdPOiBcIjJcIi5jaGFyQ29kZUF0KCAwICksXG5cdFRIUkVFOiBcIjNcIi5jaGFyQ29kZUF0KCAwICksXG5cdEZPVVI6IFwiNFwiLmNoYXJDb2RlQXQoIDAgKSxcblx0RklWRTogXCI1XCIuY2hhckNvZGVBdCggMCApLFxuXHRTSVg6IFwiNlwiLmNoYXJDb2RlQXQoIDAgKSxcblx0U0VWRU46IFwiN1wiLmNoYXJDb2RlQXQoIDAgKSxcblx0RUlHSFQ6IFwiOFwiLmNoYXJDb2RlQXQoIDAgKSxcblx0TklORTogXCI5XCIuY2hhckNvZGVBdCggMCApLFxuXHROVU1QQURfMDogOTYsXG5cdE5VTVBBRF8xOiA5Nyxcblx0TlVNUEFEXzI6IDk4LFxuXHROVU1QQURfMzogOTksXG5cdE5VTVBBRF80OiAxMDAsXG5cdE5VTVBBRF81OiAxMDEsXG5cdE5VTVBBRF82OiAxMDIsXG5cdE5VTVBBRF83OiAxMDMsXG5cdE5VTVBBRF84OiAxMDQsXG5cdE5VTVBBRF85OiAxMDUsXG5cdE5VTVBBRF9NVUxUSVBMWTogMTA2LFxuXHROVU1QQURfQUREOiAxMDcsXG5cdE5VTVBBRF9FTlRFUjogMTA4LFxuXHROVU1QQURfU1VCVFJBQ1Q6IDEwOSxcblx0TlVNUEFEX0RFQ0lNQUw6IDExMCxcblx0TlVNUEFEX0RJVklERTogMTExLFxuXHRGMTogMTEyLFxuXHRGMjogMTEzLFxuXHRGMzogMTE0LFxuXHRGNDogMTE1LFxuXHRGNTogMTE2LFxuXHRGNjogMTE3LFxuXHRGNzogMTE4LFxuXHRGODogMTE5LFxuXHRGOTogMTIwLFxuXHRGMTA6IDEyMSxcblx0RjExOiAxMjIsXG5cdEYxMjogMTIzLFxuXHRGMTM6IDEyNCxcblx0RjE0OiAxMjUsXG5cdEYxNTogMTI2LFxuXHRDT0xPTjogMTg2LFxuXHRFUVVBTFM6IDE4Nyxcblx0Q09NTUE6IDE4OCxcblx0VU5ERVJTQ09SRTogMTg5LFxuXHRQRVJJT0Q6IDE5MCxcblx0UVVFU1RJT05fTUFSSzogMTkxLFxuXHRUSUxERTogMTkyLFxuXHRPUEVOX0JSQUNLRVQ6IDIxOSxcblx0QkFDS1dBUkRfU0xBU0g6IDIyMCxcblx0Q0xPU0VEX0JSQUNLRVQ6IDIyMSxcblx0UVVPVEVTOiAyMjIsXG5cdEJBQ0tTUEFDRTogOCxcblx0VEFCOiA5LFxuXHRDTEVBUjogMTIsXG5cdEVOVEVSOiAxMyxcblx0U0hJRlQ6IDE2LFxuXHRDT05UUk9MOiAxNyxcblx0QUxUOiAxOCxcblx0Q0FQU19MT0NLOiAyMCxcblx0RVNDOiAyNyxcblx0U1BBQ0VCQVI6IDMyLFxuXHRQQUdFX1VQOiAzMyxcblx0UEFHRV9ET1dOOiAzNCxcblx0RU5EOiAzNSxcblx0SE9NRTogMzYsXG5cdExFRlQ6IDM3LFxuXHRVUDogMzgsXG5cdFJJR0hUOiAzOSxcblx0RE9XTjogNDAsXG5cdFBMVVM6IDQzLFxuXHRNSU5VUzogNDQsXG5cdElOU0VSVDogNDUsXG5cdERFTEVURTogNDYsXG5cdEhFTFA6IDQ3LFxuXHROVU1fTE9DSzogMTQ0XG59O1xuIiwiLyoqXG4gKiBNb3VzZSBpbnB1dC5cbiAqXG4gKiBAY2xhc3NcbiAqL1xuUGxhbmFyLklucHV0Lk1vdXNlID0gY2xhc3MgZXh0ZW5kcyBQbGFuYXIuSW5wdXQge1xuXHQvKipcblx0ICogQGluaGVyaXRkb2Ncblx0ICovXG5cdGNvbnN0cnVjdG9yKCBlbGVtZW50ICkge1xuXHRcdHN1cGVyKCBlbGVtZW50ICk7XG5cblx0XHR0aGlzLm92ZXIgPSBmYWxzZTtcblx0XHR0aGlzLmJ1dHRvbnMgPSB7fTtcblx0XHR0aGlzLndoZWVsID0geyB4OiAwLCB5OiAwLCB6OiAwIH07XG5cdFx0dGhpcy5wb3NpdGlvbiA9IHsgeDogMCwgeTogMCB9O1xuXG5cdFx0dGhpcy5lbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoICdtb3VzZW92ZXInLCAoIGUgKSA9PiB7XG5cdFx0XHR0aGlzLm92ZXIgPSB0cnVlO1xuXHRcdH0gKTtcblx0XHR0aGlzLmVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lciggJ21vdXNlb3V0JywgKCBlICkgPT4ge1xuXHRcdFx0dGhpcy5vdmVyID0gZmFsc2U7XG5cdFx0fSApO1xuXHRcdHRoaXMuZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCAnbW91c2Vkb3duJywgKCBlICkgPT4ge1xuXHRcdFx0dGhpcy5idXR0b25zW2UuYnV0dG9uXSA9IHRydWU7XG5cdFx0fSApO1xuXHRcdHRoaXMuZWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCAnbW91c2V1cCcsICggZSApID0+IHtcblx0XHRcdHRoaXMuYnV0dG9uc1tlLmJ1dHRvbl0gPSBmYWxzZTtcblx0XHR9ICk7XG5cdFx0dGhpcy5lbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoICd3aGVlbCcsICggZSApID0+IHtcblx0XHRcdHRoaXMud2hlZWwueCArPSBlLmRlbHRhWDtcblx0XHRcdHRoaXMud2hlZWwueSArPSBlLmRlbHRhWTtcblx0XHRcdHRoaXMud2hlZWwueiArPSBlLmRlbHRhWjtcblx0XHR9ICk7XG5cdFx0dGhpcy5lbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoICdtb3VzZW1vdmUnLCAoIGUgKSA9PiB7XG5cdFx0XHR0aGlzLnBvc2l0aW9uLnggPSBlLmNsaWVudFg7XG5cdFx0XHR0aGlzLnBvc2l0aW9uLlkgPSBlLmNsaWVudFk7XG5cdFx0fSApO1xuXHR9XG59O1xuIiwiLyoqXG4gKiBBbmltYXRpb24gc3lzdGVtLlxuICpcbiAqIEBjbGFzc1xuICovXG5QbGFuYXIuU3lzdGVtLkFuaW1hdGlvbiA9IGNsYXNzIGV4dGVuZHMgUGxhbmFyLlN5c3RlbSB7XG5cdC8qKlxuXHQgKiBAaW5oZXJpdGRvY1xuXHQgKi9cblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0c3VwZXIoKTtcblx0XHR0aGlzLnR3ZWVucyA9IG5ldyBNYXAoKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBAaW5oZXJpdGRvY1xuXHQgKi9cblx0aXNSZWxhdGVkKCBlbnRpdHkgKSB7XG5cdFx0cmV0dXJuIGVudGl0eS5oYXMoICdhbmltYXRpb24nICk7XG5cdH1cblxuXHQvKipcblx0ICogQGluaGVyaXRkb2Ncblx0ICovXG5cdGFkZCggZW50aXR5ICkge1xuXHRcdHN1cGVyLmFkZCggZW50aXR5ICk7XG5cdFx0dGhpcy50d2VlbnMuc2V0KCBlbnRpdHkua2V5LCB7IHZhbHVlOiAwIH0gKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBAaW5oZXJpdGRvY1xuXHQgKi9cblx0ZGVsZXRlKCBlbnRpdHkgKSB7XG5cdFx0c3VwZXIuZGVsZXRlKCBlbnRpdHkgKTtcblx0XHR0aGlzLnR3ZWVucy5kZWxldGUoIGVudGl0eS5rZXkgKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBAaW5oZXJpdGRvY1xuXHQgKi9cblx0dXBkYXRlKCBkZWx0YSApIHtcblx0XHRmb3IgKCBsZXQgZW50aXR5IG9mIHRoaXMuZW50aXRpZXMgKSB7XG5cdFx0XHRsZXQgdHdlZW4gPSB0aGlzLnR3ZWVucy5nZXQoIGVudGl0eS5rZXkgKTtcblx0XHRcdHR3ZWVuLnZhbHVlICs9IGRlbHRhO1xuXHRcdFx0aWYgKCB0d2Vlbi52YWx1ZSAlIDEwMCA9PT0gMCApIHtcblx0XHRcdFx0bGV0IGluZGV4ID0gTWF0aC5yb3VuZCggTWF0aC5yYW5kb20oKSAqIDIgKTtcblx0XHRcdFx0ZW50aXR5LmNoYW5nZSggeyBzaGFwZTogeyB0eXBlOiBbJ3JlY3RhbmdsZScsICdjaXJjbGUnLCAnbmdvbiddW2luZGV4XSB9IH0gKTtcblx0XHRcdH1cblx0XHRcdGVudGl0eS5jaGFuZ2UoIHtcblx0XHRcdFx0d2FycDoge1xuXHRcdFx0XHRcdHNjYWxlOiBuZXcgUGxhbmFyLlBvaW50KFxuXHRcdFx0XHRcdFx0MS41ICsgKCBNYXRoLnNpbiggdHdlZW4udmFsdWUgKiAoIE1hdGguUEkgLyAxMDAwICkgKSAqIDAuNSApLFxuXHRcdFx0XHRcdFx0MS41ICsgKCBNYXRoLmNvcyggdHdlZW4udmFsdWUgKiAoIE1hdGguUEkgLyAxMDAwICkgKSAqIDAuNSApXG5cdFx0XHRcdFx0KVxuXHRcdFx0XHR9XG5cdFx0XHR9ICk7XG5cdFx0fVxuXHR9XG59O1xuIiwiLyoqXG4gKiBHZW9tZXRyeSBzeXN0ZW0uXG4gKlxuICogQGNsYXNzXG4gKi9cblBsYW5hci5TeXN0ZW0uR2VvbWV0cnkgPSBjbGFzcyBleHRlbmRzIFBsYW5hci5TeXN0ZW0ge1xuXHQvKipcblx0ICogQGluaGVyaXRkb2Ncblx0ICovXG5cdGlzUmVsYXRlZCggZW50aXR5ICkge1xuXHRcdHJldHVybiBlbnRpdHkuaGFzKCAnc2hhcGUnICk7XG5cdH1cblxuXHQvKipcblx0ICogQGluaGVyaXRkb2Ncblx0ICovXG5cdGFkZCggZW50aXR5ICkge1xuXHRcdHN1cGVyLmFkZCggZW50aXR5ICk7XG5cdFx0ZW50aXR5LmNoYW5nZSggeyBzaGFwZTogY3JlYXRlUG9pbnRzIH0gKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBAaW5oZXJpdGRvY1xuXHQgKi9cblx0dXBkYXRlKCBkZWx0YSApIHtcblx0XHQvKmpzaGludCBsb29wZnVuYzogdHJ1ZSAqL1xuXHRcdGZvciAoIGxldCBlbnRpdHkgb2YgdGhpcy5lbnRpdGllcyApIHtcblx0XHRcdGVudGl0eS5oYW5kbGUoIHtcblx0XHRcdFx0c2hhcGU6ICggc2hhcGUgKSA9PiB7XG5cdFx0XHRcdFx0ZW50aXR5LmNoYW5nZSggeyBzaGFwZTogY3JlYXRlUG9pbnRzIH0gKTtcblx0XHRcdFx0fVxuXHRcdFx0fSApO1xuXHRcdH1cblx0fVxufTtcblxuLyoqXG4gKiBDcmVhdGUgcG9pbnRzLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAcGFyYW0ge1BsYW5hci5Db21wb25lbnR9IHNoYXBlIFNoYXBlIGNvbXBvbmVudFxuICovXG5mdW5jdGlvbiBjcmVhdGVQb2ludHMoIHNoYXBlICkge1xuXHR2YXIgcG9pbnRzO1xuXHRzd2l0Y2ggKCBzaGFwZS50eXBlICkge1xuXHRcdGNhc2UgJ3JlY3RhbmdsZSc6XG5cdFx0XHRjb25zdCBodyA9IHNoYXBlLndpZHRoIC8gMixcblx0XHRcdFx0aGggPSBzaGFwZS5oZWlnaHQgLyAyO1xuXHRcdFx0cG9pbnRzID0gW1xuXHRcdFx0XHR7IHg6IC1odywgeTogLWhoIH0sXG5cdFx0XHRcdHsgeDogaHcsIHk6IC1oaCB9LFxuXHRcdFx0XHR7IHg6IGh3LCB5OiBoaCB9LFxuXHRcdFx0XHR7IHg6IC1odywgeTogaGggfVxuXHRcdFx0XTtcblx0XHRcdGJyZWFrO1xuXHRcdGNhc2UgJ2NpcmNsZSc6XG5cdFx0Y2FzZSAnbmdvbic6XG5cdFx0XHRsZXQgeyByYWRpdXMsIHNpZGVzIH0gPSBzaGFwZTtcblx0XHRcdGlmICggc2hhcGUudHlwZSA9PT0gJ2NpcmNsZScgfHwgc2lkZXMgPCAzICkge1xuXHRcdFx0XHQvLyBBcHByb3hpbWF0ZSBhIGNpcmNsZVxuXHRcdFx0XHRzaWRlcyA9IE1hdGguY2VpbCggTWF0aC5tYXgoIDEwLCBNYXRoLm1pbiggMjUsIHJhZGl1cyApICkgKTtcblx0XHRcdH1cblx0XHRcdGNvbnN0IHRoZXRhID0gMiAqIE1hdGguUEkgLyBzaWRlcyxcblx0XHRcdFx0b2Zmc2V0ID0gdGhldGEgKiAwLjU7XG5cdFx0XHRwb2ludHMgPSBbXTtcblx0XHRcdGZvciAoIGxldCBpID0gMDsgaSA8IHNpZGVzOyBpKysgKSB7XG5cdFx0XHRcdGxldCBhbmdsZSA9IG9mZnNldCArICggaSAqIHRoZXRhICk7XG5cdFx0XHRcdHBvaW50c1tpXSA9IHtcblx0XHRcdFx0XHR4OiBNYXRoLmNvcyggYW5nbGUgKSAqIHJhZGl1cyxcblx0XHRcdFx0XHR5OiBNYXRoLnNpbiggYW5nbGUgKSAqIHJhZGl1c1xuXHRcdFx0XHR9O1xuXHRcdFx0fVxuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSAncG9seWdvbic6XG5cdFx0XHRwb2ludHMgPSBzaGFwZS5wb2ludHM7XG5cdFx0XHRicmVhaztcblx0XHRkZWZhdWx0OlxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCBgXCIke3NoYXBlLnR5cGV9XCIgc2hhcGUgdHlwZSBpcyBpbnZhbGlkLmAgKTtcblx0fVxuXHRyZXR1cm4geyBwb2ludHM6IHBvaW50cyB9O1xufVxuIiwiLyoqXG4gKiBHcmFwaGljcyBzeXN0ZW0uXG4gKlxuICogQGNsYXNzXG4gKi9cblBsYW5hci5TeXN0ZW0uR3JhcGhpY3MgPSBjbGFzcyBleHRlbmRzIFBsYW5hci5TeXN0ZW0ge1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcigpO1xuXHRcdHRoaXMucmVuZGVyZXIgPSBQSVhJLmF1dG9EZXRlY3RSZW5kZXJlciggNTEyLCA1MTIsIGZhbHNlLCB0cnVlICk7XG5cdFx0dGhpcy5zdGFnZSA9IG5ldyBQSVhJLkNvbnRhaW5lcigpO1xuXHRcdHRoaXMuZ3JhcGhpY3MgPSBuZXcgTWFwKCk7XG5cdFx0ZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCggdGhpcy5yZW5kZXJlci52aWV3ICk7XG5cdH1cblxuXHRpc1JlbGF0ZWQoIGVudGl0eSApIHtcblx0XHRyZXR1cm4gZW50aXR5LmhhcyggJ2RyYXcnLCAnc2hhcGUnLCAndHJhbnNmb3JtJyApO1xuXHR9XG5cblx0YWRkKCBlbnRpdHkgKSB7XG5cdFx0c3VwZXIuYWRkKCBlbnRpdHkgKTtcblx0XHRjb25zdCBncmFwaGljID0gbmV3IFBJWEkuR3JhcGhpY3MoKTtcblx0XHR0aGlzLmdyYXBoaWNzLnNldCggZW50aXR5LmtleSwgZ3JhcGhpYyApO1xuXHRcdHRoaXMuc3RhZ2UuYWRkQ2hpbGQoIGdyYXBoaWMgKTtcblx0fVxuXG5cdGRlbGV0ZSggZW50aXR5ICkge1xuXHRcdHN1cGVyLmRlbGV0ZSggZW50aXR5ICk7XG5cdFx0Y29uc3QgZ3JhcGhpYyA9IHRoaXMuZ3JhcGhpY3MuZ2V0KCBlbnRpdHkua2V5ICk7XG5cdFx0dGhpcy5ncmFwaGljcy5kZWxldGUoIGVudGl0eS5rZXkgKTtcblx0XHR0aGlzLnN0YWdlLnJlbW92ZUNoaWxkKCBncmFwaGljICk7XG5cdH1cblxuXHR1cGRhdGUoIGRlbHRhICkge1xuXHRcdC8qanNoaW50IGxvb3BmdW5jOiB0cnVlICovXG5cdFx0Zm9yICggbGV0IGVudGl0eSBvZiB0aGlzLmVudGl0aWVzICkge1xuXHRcdFx0Y29uc3QgZ3JhcGhpYyA9IHRoaXMuZ3JhcGhpY3MuZ2V0KCBlbnRpdHkua2V5ICk7XG5cdFx0XHRlbnRpdHkuaGFuZGxlKCBbICdzaGFwZScsICdkcmF3JyBdLCAoIHNoYXBlLCBkcmF3ICkgPT4ge1xuXHRcdFx0XHRncmFwaGljLmNsZWFyKCk7XG5cdFx0XHRcdHN3aXRjaCAoIHNoYXBlLnR5cGUgKSB7XG5cdFx0XHRcdFx0Y2FzZSAnY2lyY2xlJzpcblx0XHRcdFx0XHRcdGRyYXdDaXJjbGUoIGdyYXBoaWMsIHNoYXBlLnJhZGl1cywgZHJhdyApO1xuXHRcdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRcdGRyYXdQb2x5Z29uKCBncmFwaGljLCBzaGFwZS5wb2ludHMsIGRyYXcgKTtcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHR9ICk7XG5cdFx0XHRlbnRpdHkuaGFuZGxlKCB7XG5cdFx0XHRcdHRyYW5zZm9ybTogKCB0cmFuc2Zvcm0gKSA9PiB7XG5cdFx0XHRcdFx0Z3JhcGhpYy5wb3NpdGlvbi5jb3B5KCB0cmFuc2Zvcm0ucG9zaXRpb24gKTtcblx0XHRcdFx0XHRncmFwaGljLnJvdGF0aW9uID0gdHJhbnNmb3JtLnJvdGF0aW9uO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHR3YXJwOiAoIHdhcnAgKSA9PiB7XG5cdFx0XHRcdFx0Z3JhcGhpYy5zY2FsZS5jb3B5KCB3YXJwLnNjYWxlICk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdGZpbHRlcjogKCBmaWx0ZXIgKSA9PiB7XG5cdFx0XHRcdFx0Z3JhcGhpYy5hbHBoYSA9IGZpbHRlci5hbHBoYTtcblx0XHRcdFx0fVxuXHRcdFx0fSApO1xuXHRcdH1cblx0XHR0aGlzLnJlbmRlcmVyLnJlbmRlciggdGhpcy5zdGFnZSApO1xuXHR9XG59O1xuXG5mdW5jdGlvbiBkcmF3Q2lyY2xlKCBncmFwaGljLCByYWRpdXMsIGRyYXcgKSB7XG5cdGNvbnN0IHBpeGlQb2ludHMgPSBbXTtcblx0aWYgKCBkcmF3LmZpbGxBbHBoYSApIHtcblx0XHRncmFwaGljLmJlZ2luRmlsbCggZHJhdy5maWxsQ29sb3IsIGRyYXcuZmlsbEFscGhhICk7XG5cdH1cblx0aWYgKCBkcmF3LnN0cm9rZVdpZHRoICYmIGRyYXcuc3Ryb2tlQWxwaGEgKSB7XG5cdFx0Z3JhcGhpYy5saW5lU3R5bGUoIGRyYXcuc3Ryb2tlV2lkdGgsIGRyYXcuc3Ryb2tlQ29sb3IsIGRyYXcuc3Ryb2tlQWxwaGEgKTtcblx0fVxuXHRncmFwaGljLmRyYXdDaXJjbGUoIDAsIDAsIHJhZGl1cyApO1xuXHRpZiAoIGRyYXcuZmlsbEFscGhhICkge1xuXHRcdGdyYXBoaWMuZW5kRmlsbCgpO1xuXHR9XG5cdGdyYXBoaWMuY2FjaGVBc0JpdG1hcCA9ICFkcmF3LmlzRHluYW1pYztcbn1cblxuZnVuY3Rpb24gZHJhd1BvbHlnb24oIGdyYXBoaWMsIHBvaW50cywgZHJhdyApIHtcblx0Y29uc3QgcGl4aVBvaW50cyA9IFtdO1xuXHRpZiAoIGRyYXcuZmlsbEFscGhhICkge1xuXHRcdGdyYXBoaWMuYmVnaW5GaWxsKCBkcmF3LmZpbGxDb2xvciwgZHJhdy5maWxsQWxwaGEgKTtcblx0fVxuXHRpZiAoIGRyYXcuc3Ryb2tlV2lkdGggJiYgZHJhdy5zdHJva2VBbHBoYSApIHtcblx0XHRncmFwaGljLmxpbmVTdHlsZSggZHJhdy5zdHJva2VXaWR0aCwgZHJhdy5zdHJva2VDb2xvciwgZHJhdy5zdHJva2VBbHBoYSApO1xuXHR9XG5cdGZvciAoIGxldCBpID0gMCwgbGVuID0gcG9pbnRzLmxlbmd0aDsgaSA8IGxlbjsgaSsrICkge1xuXHRcdHBpeGlQb2ludHNbaV0gPSBuZXcgUElYSS5Qb2ludCggcG9pbnRzW2ldLngsIHBvaW50c1tpXS55ICk7XG5cdH1cblx0Z3JhcGhpYy5kcmF3UG9seWdvbiggcGl4aVBvaW50cyApO1xuXHRpZiAoIGRyYXcuZmlsbEFscGhhICkge1xuXHRcdGdyYXBoaWMuZW5kRmlsbCgpO1xuXHR9XG5cdGdyYXBoaWMuY2FjaGVBc0JpdG1hcCA9ICFkcmF3LmlzRHluYW1pYztcbn1cbiIsIi8qKlxuICogUGh5c2ljcyBzeXN0ZW0uXG4gKlxuICogQGNsYXNzXG4gKi9cblBsYW5hci5TeXN0ZW0uUGh5c2ljcyA9IGNsYXNzIGV4dGVuZHMgUGxhbmFyLlN5c3RlbSB7XG5cdC8qKlxuXHQgKiBAaW5oZXJpdGRvY1xuXHQgKi9cblx0Y29uc3RydWN0b3IoKSB7XG5cdFx0c3VwZXIoKTtcblx0XHR0aGlzLmVuZ2luZSA9IE1hdHRlci5FbmdpbmUuY3JlYXRlKCB7IGVuYWJsZVNsZWVwOiB0cnVlIH0gKTtcblx0XHR0aGlzLndvcmxkID0gdGhpcy5lbmdpbmUud29ybGQ7XG5cdFx0dGhpcy5ib2RpZXMgPSBuZXcgTWFwKCk7XG5cdFx0dGhpcy5zaWduYXR1cmVzID0gbmV3IE1hcCgpO1xuXHR9XG5cblx0LyoqXG5cdCAqIEBpbmhlcml0ZG9jXG5cdCAqL1xuXHRpc1JlbGF0ZWQoIGVudGl0eSApIHtcblx0XHRyZXR1cm4gZW50aXR5LmhhcyggJ3NoYXBlJywgJ21vdGlvbicsICd0cmFuc2Zvcm0nICk7XG5cdH1cblxuXHQvKipcblx0ICogQGluaGVyaXRkb2Ncblx0ICovXG5cdGFkZCggZW50aXR5ICkge1xuXHRcdHN1cGVyLmFkZCggZW50aXR5ICk7XG5cdFx0Y29uc3QgYm9keSA9IGNyZWF0ZUJvZHkoIGVudGl0eSApO1xuXHRcdHRoaXMuYm9kaWVzLnNldCggZW50aXR5LmtleSwgYm9keSApO1xuXHRcdHRoaXMuc2lnbmF0dXJlcy5zZXQoIGVudGl0eS5rZXksIGVudGl0eS5jb21wb25lbnRzLnNoYXBlLnNpZ25hdHVyZSApO1xuXHRcdE1hdHRlci5Xb3JsZC5hZGQoIHRoaXMud29ybGQsIGJvZHkgKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBAaW5oZXJpdGRvY1xuXHQgKi9cblx0ZGVsZXRlKCBlbnRpdHkgKSB7XG5cdFx0c3VwZXIuZGVsZXRlKCBlbnRpdHkgKTtcblx0XHRjb25zdCBib2R5ID0gdGhpcy5ib2RpZXMuZ2V0KCBlbnRpdHkua2V5ICk7XG5cdFx0dGhpcy5ib2RpZXMuZGVsZXRlKCBlbnRpdHkua2V5ICk7XG5cdFx0dGhpcy5zaWduYXR1cmVzLmRlbGV0ZSggZW50aXR5LmtleSApO1xuXHRcdE1hdHRlci5Xb3JsZC5yZW1vdmUoIHRoaXMud29ybGQsIGJvZHkgKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBAaW5oZXJpdGRvY1xuXHQgKi9cblx0dXBkYXRlKCBkZWx0YSApIHtcblx0XHQvKmpzaGludCBsb29wZnVuYzogdHJ1ZSAqL1xuXHRcdGZvciAoIGxldCBlbnRpdHkgb2YgdGhpcy5lbnRpdGllcyApIHtcblx0XHRcdGxldCBib2R5ID0gdGhpcy5ib2RpZXMuZ2V0KCBlbnRpdHkua2V5ICk7XG5cdFx0XHRlbnRpdHkuaGFuZGxlKCBbICdzaGFwZScsICd3YXJwJyBdLCAoIHNoYXBlLCB3YXJwICkgPT4ge1xuXHRcdFx0XHRpZiAoIHNoYXBlLnNpZ25hdHVyZSAhPT0gdGhpcy5zaWduYXR1cmVzLmdldCggZW50aXR5LmtleSApICkge1xuXHRcdFx0XHRcdC8vIFJlcGxhY2UgYm9keVxuXHRcdFx0XHRcdE1hdHRlci5Xb3JsZC5yZW1vdmUoIHRoaXMud29ybGQsIGJvZHkgKTtcblx0XHRcdFx0XHRib2R5ID0gY3JlYXRlQm9keSggZW50aXR5ICk7XG5cdFx0XHRcdFx0dGhpcy5ib2RpZXMuc2V0KCBlbnRpdHkua2V5LCBib2R5ICk7XG5cdFx0XHRcdFx0dGhpcy5zaWduYXR1cmVzLnNldCggZW50aXR5LmtleSwgc2hhcGUuc2lnbmF0dXJlICk7XG5cdFx0XHRcdFx0TWF0dGVyLldvcmxkLmFkZCggdGhpcy53b3JsZCwgYm9keSApO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHVwZGF0ZUJvZHkoIGVudGl0eSwgYm9keSApO1xuXHRcdFx0XHR9XG5cdFx0XHR9ICk7XG5cdFx0XHRlbnRpdHkuaGFuZGxlKCB7XG5cdFx0XHRcdG1hdGVyaWFsOiAoIG1hdGVyaWFsICkgPT4ge1xuXHRcdFx0XHRcdE1hdHRlci5Cb2R5LnNldCggYm9keSwge1xuXHRcdFx0XHRcdFx0ZGVuc2l0eTogbWF0ZXJpYWwuZGVuc2l0eSxcblx0XHRcdFx0XHRcdGZyaWN0aW9uOiBtYXRlcmlhbC5keW5hbWljRnJpY3Rpb24sXG5cdFx0XHRcdFx0XHRhaXJGcmljdGlvbjogbWF0ZXJpYWwuYWlyRnJpY3Rpb24sXG5cdFx0XHRcdFx0XHRmcmljdGlvblN0YXRpYzogbWF0ZXJpYWwuc3RhdGljRnJpY3Rpb24sXG5cdFx0XHRcdFx0XHRyZXN0aXR1dGlvbjogbWF0ZXJpYWwucmVzdGl0dXRpb25cblx0XHRcdFx0XHR9ICk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdG1vdGlvbjogKCBtb3Rpb24gKSA9PiB7XG5cdFx0XHRcdFx0TWF0dGVyLkJvZHkuc2V0KCBib2R5LCB7XG5cdFx0XHRcdFx0XHRpc1N0YXRpYzogbW90aW9uLmlzU3RhdGljLFxuXHRcdFx0XHRcdFx0aXNTZW5zb3I6IG1vdGlvbi5pc1NlbnNvcixcblx0XHRcdFx0XHRcdHRpbWVTY2FsZTogbW90aW9uLnRpbWVTY2FsZVxuXHRcdFx0XHRcdH0gKTtcblx0XHRcdFx0XHRpZiAoIG1vdGlvbi5mb3JjZSApIHtcblx0XHRcdFx0XHRcdGJvZHkuZm9yY2UueCArPSBtb3Rpb24uZm9yY2UueDtcblx0XHRcdFx0XHRcdGJvZHkuZm9yY2UueSArPSBtb3Rpb24uZm9yY2UueTtcblx0XHRcdFx0XHRcdG1vdGlvbi5mb3JjZS54ID0gMDtcblx0XHRcdFx0XHRcdG1vdGlvbi5mb3JjZS55ID0gMDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKCBtb3Rpb24udG9ycXVlICkge1xuXHRcdFx0XHRcdFx0Ym9keS50b3JxdWUgKz0gbW90aW9uLnRvcnF1ZTtcblx0XHRcdFx0XHRcdG1vdGlvbi50b3JxdWUgPSAwO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSApO1xuXHRcdH1cblx0XHRNYXR0ZXIuRW5naW5lLnVwZGF0ZSggdGhpcy5lbmdpbmUsIGRlbHRhICk7XG5cdFx0Zm9yICggbGV0IGVudGl0eSBvZiB0aGlzLmVudGl0aWVzICkge1xuXHRcdFx0bGV0IGJvZHkgPSB0aGlzLmJvZGllcy5nZXQoIGVudGl0eS5rZXkgKTtcblx0XHRcdGVudGl0eS5jaGFuZ2UoIHtcblx0XHRcdFx0dHJhbnNmb3JtOiB7XG5cdFx0XHRcdFx0cG9zaXRpb246IG5ldyBQbGFuYXIuUG9pbnQoIGJvZHkucG9zaXRpb24gKSxcblx0XHRcdFx0XHRyb3RhdGlvbjogYm9keS5hbmdsZVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRtb3Rpb246IHtcblx0XHRcdFx0XHRhcmVhOiBib2R5LmFyZWEsXG5cdFx0XHRcdFx0bWFzczogYm9keS5tYXNzLFxuXHRcdFx0XHRcdGluZXJ0aWE6IGJvZHkuaW5lcnRpYSxcblx0XHRcdFx0XHRsaW5lYXJTcGVlZDogYm9keS5zcGVlZCxcblx0XHRcdFx0XHRsaW5lYXJWZWxvY2l0eTogbmV3IFBsYW5hci5Qb2ludCggYm9keS52ZWxvY2l0eSApLFxuXHRcdFx0XHRcdGFuZ3VsYXJTcGVlZDogYm9keS5hbmd1bGFyU3BlZWQsXG5cdFx0XHRcdFx0YW5ndWxhclZlbG9jaXR5OiBib2R5LmFuZ3VsYXJWZWxvY2l0eVxuXHRcdFx0XHR9XG5cdFx0XHR9ICk7XG5cdFx0fVxuXHR9XG59O1xuXG4vKipcbiAqIENyZWF0ZSBhIHBoeXNpY3MgYm9keS5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtQbGFuYXIuRW50aXR5fSBlbnRpdHkgRW50aXR5IHRvIGNyZWF0ZSBib2R5IGZvci5cbiAqIEByZXR1cm4ge01hdHRlci5Cb2R5fVxuICovXG5mdW5jdGlvbiBjcmVhdGVCb2R5KCBlbnRpdHkgKSB7XG5cdGNvbnN0IHsgc2hhcGUsIHRyYW5zZm9ybSwgd2FycCB9ID0gZW50aXR5LmNvbXBvbmVudHMsXG5cdFx0Ym9keSA9IE1hdHRlci5Cb2RpZXMuZnJvbVZlcnRpY2VzKCAwLCAwLCBbIHNoYXBlLnBvaW50cyBdICk7XG5cdGlmICggIWJvZHkgKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKCAnSW52YWxpZCBzaGFwZS4nICk7XG5cdH1cblx0TWF0dGVyLkJvZHkudHJhbnNsYXRlKCBib2R5LCB0cmFuc2Zvcm0ucG9zaXRpb24gKTtcblx0aWYgKCB3YXJwICkge1xuXHRcdE1hdHRlci5Cb2R5LnNjYWxlKCBib2R5LCB3YXJwLnNjYWxlLngsIHdhcnAuc2NhbGUueSApO1xuXHR9XG5cdE1hdHRlci5Cb2R5LnJvdGF0ZSggYm9keSwgdHJhbnNmb3JtLnJvdGF0aW9uICk7XG5cdHJldHVybiBib2R5O1xufVxuXG4vKipcbiAqIFVwZGF0ZSBhIHBoeXNpY3MgYm9keS5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHBhcmFtIHtQbGFuYXIuRW50aXR5fSBlbnRpdHkgRW50aXR5IHRvIGNyZWF0ZSBib2R5IGZvci5cbiAqIEBwYXJhbSB7TWF0dGVyLkJvZHl9IGJvZHkgQm9keSB0byB1cGRhdGVcbiAqL1xuZnVuY3Rpb24gdXBkYXRlQm9keSggZW50aXR5LCBib2R5ICkge1xuXHRjb25zdCB7IHNoYXBlLCB0cmFuc2Zvcm0sIHdhcnAgfSA9IGVudGl0eS5jb21wb25lbnRzLFxuXHRcdHZlcnRpY2VzID0gYm9keS52ZXJ0aWNlcztcblx0Zm9yICggbGV0IGkgPSAwLCBsZW4gPSBzaGFwZS5wb2ludHMubGVuZ3RoOyBpIDwgbGVuOyBpKysgKSB7XG5cdFx0KCB7IHg6IHZlcnRpY2VzW2ldLngsIHk6IHZlcnRpY2VzW2ldLnkgfSA9IHNoYXBlLnBvaW50c1tpXSApO1x0XG5cdH1cblx0aWYgKCB3YXJwICkge1xuXHRcdE1hdHRlci5WZXJ0aWNlcy5zY2FsZSggdmVydGljZXMsIHdhcnAuc2NhbGUueCwgd2FycC5zY2FsZS55LCB0cmFuc2Zvcm0ucGl2b3QgKTtcblx0fVxuXHRNYXR0ZXIuVmVydGljZXMucm90YXRlKCB2ZXJ0aWNlcywgdHJhbnNmb3JtLnJvdGF0aW9uLCB0cmFuc2Zvcm0ucGl2b3QgKTtcblx0TWF0dGVyLkJvZHkuc2V0VmVydGljZXMoIGJvZHksIHZlcnRpY2VzICk7XG59XG4iLCIvKipcbiAqIFBsYXllciBzeXN0ZW0uXG4gKlxuICogQGNsYXNzXG4gKi9cblBsYW5hci5TeXN0ZW0uUGxheWVyID0gY2xhc3MgZXh0ZW5kcyBQbGFuYXIuU3lzdGVtIHtcblx0LyoqXG5cdCAqIEBpbmhlcml0ZG9jXG5cdCAqL1xuXHRjb25zdHJ1Y3RvcigpIHtcblx0XHRzdXBlcigpO1xuXHRcdHRoaXMua2V5Ym9hcmQgPSBuZXcgUGxhbmFyLklucHV0LktleWJvYXJkKCB3aW5kb3cgKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBAaW5oZXJpdGRvY1xuXHQgKi9cblx0aXNSZWxhdGVkKCBlbnRpdHkgKSB7XG5cdFx0cmV0dXJuIGVudGl0eS5oYXMoICdwbGF5ZXInLCAnbW90aW9uJyApO1xuXHR9XG5cblx0LyoqXG5cdCAqIEBpbmhlcml0ZG9jXG5cdCAqL1xuXHR1cGRhdGUoIGRlbHRhICkge1xuXHRcdGNvbnN0IGsgPSB0aGlzLmtleWJvYXJkLmtleXMsXG5cdFx0XHRjID0gUGxhbmFyLklucHV0LktleWJvYXJkLmNvZGVzO1xuXHRcdC8qanNoaW50IGxvb3BmdW5jOiB0cnVlICovXG5cdFx0Zm9yICggbGV0IGVudGl0eSBvZiB0aGlzLmVudGl0aWVzICkge1xuXHRcdFx0aWYgKCBrW2MuVVBdIHx8IGtbYy5ET1dOXSB8fCBrW2MuTEVGVF0gfHwga1tjLlJJR0hUXSB8fCBrW2MuU1BBQ0VCQVJdICkge1xuXHRcdFx0XHRlbnRpdHkuY2hhbmdlKCB7XG5cdFx0XHRcdFx0bW90aW9uOiAoIG1vdGlvbiApID0+IHtcblx0XHRcdFx0XHRcdGNvbnN0IHBvd2VyID0gbW90aW9uLm1hc3MgKiAwLjAwNTtcblx0XHRcdFx0XHRcdGlmICgga1tjLlVQXSApIHtcblx0XHRcdFx0XHRcdFx0bW90aW9uLmZvcmNlLnkgLT0gcG93ZXI7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRpZiAoIGtbYy5ET1dOXSApIHtcblx0XHRcdFx0XHRcdFx0bW90aW9uLmZvcmNlLnkgKz0gcG93ZXI7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRpZiAoIGtbYy5MRUZUXSApIHtcblx0XHRcdFx0XHRcdFx0bW90aW9uLmZvcmNlLnggLT0gcG93ZXIgLyAyO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0aWYgKCBrW2MuUklHSFRdICkge1xuXHRcdFx0XHRcdFx0XHRtb3Rpb24uZm9yY2UueCArPSBwb3dlciAvIDI7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRpZiAoIGtbYy5TUEFDRUJBUl0gKSB7XG5cdFx0XHRcdFx0XHRcdG1vdGlvbi50b3JxdWUgKz0gcG93ZXI7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9ICk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG59O1xuIiwiLyoqXG4gKiBTdGF0cyBzeXN0ZW0uXG4gKlxuICogQGNsYXNzXG4gKi9cblBsYW5hci5TeXN0ZW0uU3RhdHMgPSBjbGFzcyBleHRlbmRzIFBsYW5hci5TeXN0ZW0ge1xuXHQvKipcblx0ICogQGluaGVyaXRkb2Ncblx0ICovXG5cdGNvbnN0cnVjdG9yKCkge1xuXHRcdHN1cGVyKCk7XG5cdFx0dGhpcy5zdGF0cyA9IG5ldyBTdGF0cygpO1xuXHRcdGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoIHRoaXMuc3RhdHMuZG9tICk7XG5cdH1cblxuXHQvKipcblx0ICogQGluaGVyaXRkb2Ncblx0ICovXG5cdGlzUmVsYXRlZCggZW50aXR5ICkge1xuXHRcdHJldHVybiBmYWxzZTtcblx0fVxuXG5cdC8qKlxuXHQgKiBAaW5oZXJpdGRvY1xuXHQgKi9cblx0dXBkYXRlKCBkZWx0YSApIHtcblx0XHR0aGlzLnN0YXRzLmJlZ2luKCk7XG5cdFx0dGhpcy5zdGF0cy5lbmQoKTtcblx0fVxufTtcbiJdfQ==
