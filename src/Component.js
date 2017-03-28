/**
 * Component.
 *
 * @class
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
	 */
	animation: {},
	/**
	 * Motion component.
	 *
	 * @class
	 * @extends {Planar.Component}
	 */
	motion: {
		isStatic: [ Boolean, false ],
		isSensor: [ Boolean, false ],
		preventRotation: [ Boolean, false ],
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
	 * Sprite component.
	 *
	 * @class
	 * @extends {Planar.Component}
	 */
	sprite: {
		texture: [ String, '' ],
		resource: [ String, '' ],
		anchor: [ Planar.Point, () => new Planar.Point( 0.5, 0.5 ) ]
	},
	/**
	 * Draw component.
	 *
	 * @class
	 * @extends {Planar.Component}
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
	 */
	filter: {
		alpha: [ Number, 1 ]
	},
	/**
	 * Material component.
	 *
	 * @class
	 * @extends {Planar.Component}
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
	 */
	player: {},
	/**
	 * Shape component.
	 *
	 * @class
	 * @extends {Planar.Component}
	 */
	shape: {
		type: [ String, 'rectangle' ],
		radius: [ Number, 0 ],
		sides: [ Number, 0 ],
		width: [ Number, 0 ],
		height: [ Number, 0 ],
		points: [ Array, [] ],
		hash: function () {
			switch ( this.type ) {
				case 'rectangle':
					return 'r:' + this.width + ',' + this.height;
				case 'circle':
					return 'c:' + this.radius;
				case 'ngon':
					return 'n:' + this.radius + ',' + this.sides;
				case 'polygon':
					return 'p:' + this.points.length;
				default:
					throw new Error( `"${this.type}" shape type is invalid.` );
			}
		}
	},
	/**
	 * Transform component.
	 *
	 * @class
	 * @extends {Planar.Component}
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
	 */
	warp: {
		scale: [ Planar.Point, () => new Planar.Point( 1, 1 ) ],
		skew: [ Planar.Point, () => new Planar.Point( 0, 0 ) ]
	}
} );
