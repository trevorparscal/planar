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
