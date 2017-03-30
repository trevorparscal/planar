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
	 * @property {string} 0 Property type, equivilant to using `typeof` on a valid value
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
				let [ type, defaultValue ] = definition;
				if ( state[property] !== undefined ) {
					if ( typeof state[property] !== type ) {
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
	 * Camera component.
	 *
	 * @class
	 * @extends {Planar.Component}
	 */
	camera: {
		view: [ Planar.Point, () => new Planar.Point() ]
	},
	/**
	 * Motion component.
	 *
	 * @class
	 * @extends {Planar.Component}
	 */
	motion: {
		isStatic: [ 'boolean', false ],
		isSensor: [ 'boolean', false ],
		preventRotation: [ 'boolean', false ],
		timeScale: [ 'number', 1 ],
		force: [ 'object', () => ( { x: 0, y: 0 } ) ],
		torque: [ 'number', 0 ],
		area: [ 'number', 0 ],
		mass: [ 'number', 0 ],
		inertia: [ 'number', 0 ],
		linearSpeed: [ 'number', 0 ],
		linearVelocity: [ 'object', () => ( { x: 0, y: 0 } ) ],
		angularSpeed: [ 'number', 0 ],
		angularVelocity: [ 'number', 0 ]
	},
	/**
	 * Sprite component.
	 *
	 * @class
	 * @extends {Planar.Component}
	 */
	sprite: {
		texture: [ 'string', '' ],
		resource: [ 'string', '' ],
		anchor: [ 'object', () => ( { x: 0.5, y: 0.5 } ) ]
	},
	/**
	 * Tilemap grid component.
	 *
	 * @class
	 * @extends {Planar.Component}
	 */
	tilemapGrid: {
		size: [ 'object', () => ( { x: 0, y: 0 } ) ],
		unit: [ 'number', 1 ],
		resource: [ 'string', '' ]
	},
	/**
	 * Tilemap tile component.
	 *
	 * @class
	 * @extends {Planar.Component}
	 */
	tilemapTile: {
		grid: [ 'number', NaN ],
		cell: [ 'object', () => ( { x: 0, y: 0 } ) ],
		texture: [ 'string', '' ],
		block: [ 'boolean', false ]
	},
	/**
	 * Draw component.
	 *
	 * @class
	 * @extends {Planar.Component}
	 */
	draw: {
		fillColor: [ 'number', 0 ],
		fillAlpha: [ 'number', 1 ],
		strokeWidth: [ 'number', 0 ],
		strokeColor: [ 'number', 0 ],
		strokeAlpha: [ 'number', 1 ],
		isDynamic: ['boolean', true]
	},
	/**
	 * Filter component.
	 *
	 * @class
	 * @extends {Planar.Component}
	 */
	filter: {
		alpha: [ 'number', 1 ]
	},
	/**
	 * Material component.
	 *
	 * @class
	 * @extends {Planar.Component}
	 */
	material: {
		density: [ 'number', 0.001 ],
		dynamicFriction: [ 'number', 0.1 ],
		airFriction: [ 'number', 0.01 ],
		staticFriction: [ 'number', 0.05 ],
		restitution: [ 'number', 0 ]
	},
	/**
	 * Shape component.
	 *
	 * @class
	 * @extends {Planar.Component}
	 */
	shape: {
		type: [ 'string', 'rectangle' ],
		radius: [ 'number', 0 ],
		sides: [ 'number', 0 ],
		size: [ 'object', () => ( { x: 0, y: 0 } ) ],
		points: [ Array, [] ],
		hash: function () {
			switch ( this.type ) {
				case 'rectangle':
					return 'r:' + this.size.x + ',' + this.size.y;
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
		position: [ 'object', () => ( { x: 0, y: 0 } ) ],
		pivot: [ 'object', () => ( { x: 0, y: 0 } ) ],
		rotation: [ 'number', 0 ]
	},
	/**
	 * Warp component.
	 *
	 * @class
	 * @extends {Planar.Component}
	 */
	warp: {
		scale: [ 'object', () => ( { x: 1, y: 1 } ) ],
		skew: [ 'object', () => ( { x: 0, y: 0 } ) ]
	}
} );
