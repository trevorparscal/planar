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
