/**
 * App.
 *
 * @class
 */
Planar.Scene = class {
	/**
	 * Create a scene.
	 *
	 * @constructor
	 */
	constructor() {
		// Properties
		this.app = null;
		this.entities = new Set();
		this.additions = new Set();
		this.deletions = new Set();
	}

	/**
	 * Attach scene to an app.
	 *
	 * @param {Planar.App} app App to attach to
	 * @throws {Error} If already attached to an app
	 * @chainable
	 */
	attach( app ) {
		if ( this.app ) {
			throw new Error( 'Already attached to an app.' );
		}
		this.app = app;
		for ( let system of this.app.systems ) {
			for ( let entity of this.entities ) {
				if ( system.isRelated( entity ) ) {
					system.add( entity );
				}
			}
		}
		return this;
	}

	/**
	 * Detach scene from the app.
	 *
	 * @throws {Error} If not attached to an app
	 * @chainable
	 */
	detach() {
		if ( !this.app ) {
			throw new Error( 'Not attached to an app.' );
		}
		for ( let system of this.app.systems ) {
			for ( let entity of this.entities ) {
				if ( system.has( entity ) ) {
					system.delete( entity );
				}
			}
		}
		this.app = null;
		return this;
	}

	/**
	 * Flush queued additions and deletions.
	 *
	 * Adds entities queued for addition calling #sync for each of them after they are added,
	 * deletes entities queued for deletion calling #drop for each of them after they are deleted
	 * and clears the addition and deletion queues.
	 *
	 * @throws {Error} If not attached to an app
	 * @chainable
	 */
	flush() {
		if ( !this.app ) {
			throw new Error( 'Not attached to an app.' );
		}
		for ( let entity of this.additions ) {
			this.entities.add( entity );
			for ( let system of this.app.systems ) {
				if ( system.isRelated( entity ) ) {
					system.add( entity );
				}
			}
		}
		for ( let entity of this.deletions ) {
			this.entities.delete( entity );
			for ( let system of this.app.systems ) {
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
	 * @param {...Planar.Entities} entities Entities enqueue for addition
	 * @throws {Error} If entity has already exists
	 * @throws {Error} If entity has already been added to addition queue
	 * @chainable
	 */
	add( ...entities ) {
		for ( let entity of entities ) {
			if ( this.deletions.has( entity ) ) {
				this.deletions.delete( entity );
			} else if ( this.entities.has( entity ) ) {
				throw new Error( `"${entity.key}" already exists.` );
			}
			if ( this.additions.has( entity ) ) {
				throw new Error( `"${entity.key}" has already been added to addition queue.` );
			}
			this.additions.add( entity );
		}
		return this;
	}

	/**
	 * Queue entity to be deleted.
	 *
	 * Adds entity to the deletion queue, removing it from the addition queue if present.
	 *
	 * @param {...Planar.Entities} entities Entities enqueue for deletion
	 * @throws {Error} If entity has already been added to deletion queue
	 * @throws {Error} If entity key doesn't exist
	 * @chainable
	 */
	delete( ...entities ) {
		for ( let entity of entities ) {
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
		}
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
	 * Update scene.
	 *
	 * @param {number} delta Time ellapsed since last update in milliseconds
	 * @chainable
	 */
	update( delta ) {
		for ( let entity of this.entities ) {
			entity.update( delta );
		}
		return this;
	}
};
