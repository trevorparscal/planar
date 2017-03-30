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
	 * @param {...Planar.Entities} entities Entities enqueue for addition
	 */
	constructor( ...entities ) {
		// Properties
		this.app = null;
		this.entities = new Set();
		this.additions = new Set();
		this.deletions = new Set();
		this.reconciliations = new Set();
		this.add( ...entities );
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
	 * Adds entities in the additions queue calling #sync for each of them after they are added,
	 * deletes entities in deletions queue calling #drop for each of them after they are deleted,
	 * reevaluates which systems entities in the reconciliations queue should be in and clears the
	 * additions, deletions and reconciliations queues.
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
			entity.attach( this );
			for ( let system of this.app.systems ) {
				if ( system.isRelated( entity ) ) {
					system.add( entity );
				}
			}
		}
		for ( let entity of this.deletions ) {
			entity.detach();
			this.entities.delete( entity );
			for ( let system of this.app.systems ) {
				if ( system.has( entity ) ) {
					system.delete( entity );
				}
			}
			this.onDelete( entity );
		}
		for ( let entity of this.reconciliations ) {
			for ( let system of this.app.systems ) {
				let related = system.isRelated( entity ),
					has = system.has( entity );
				if ( has && !related ) {
					system.delete( entity );
				} else if ( !has && related ) {
					system.add( entity );
				}
			}
		}
		this.additions.clear();
		this.deletions.clear();
		this.reconciliations.clear();
		return this;
	}

	/**
	 * Queue entity to be added.
	 *
	 * Adds entity to the additions queue, removing it from the deletions and reconciliations queues
	 * if present.
	 *
	 * @param {...Planar.Entities} entities Entities enqueue for addition
	 * @throws {Error} If entity has already exists
	 * @chainable
	 */
	add( ...entities ) {
		for ( let entity of entities ) {
			if ( this.entities.has( entity ) ) {
				throw new Error( `"${entity.key}" already exists.` );
			}
			this.deletions.delete( entity );
			this.reconciliations.delete( entity );
			this.additions.add( entity );
		}
		return this;
	}

	/**
	 * Queue entity to be deleted.
	 *
	 * Adds entity to the deletions queue, removing it from the additions and reconciliations queues
	 * if present.
	 *
	 * @param {...Planar.Entities} entities Entities enqueue for deletion
	 * @throws {Error} If entity doesn't exist
	 * @chainable
	 */
	delete( ...entities ) {
		for ( let entity of entities ) {
			if ( !this.entities.has( entity ) ) {
				throw new Error( `"${entity.key}" doesn't exist.` );
			}
			this.additions.delete( entity );
			this.reconciliations.delete( entity );
			this.deletions.add( entity );
		}
		return this;
	}

	/**
	 * Queue entity to be changed.
	 *
	 * Adds entity to the reconciliations queue if not present in the additions or deletions queues.
	 *
	 * @param {...Planar.Entities} entities Entities enqueue for reconciliation
	 * @throws {Error} If entity doesn't exist
	 * @chainable
	 */
	reconcile( ...entities ) {
		for ( let entity of entities ) {
			if ( !this.entities.has( entity ) ) {
				throw new Error( `"${entity.key}" doesn't exist.` );
			}
			if ( !this.deletions.has( entity ) && !this.additions.has( entity ) ) {
				this.reconciliations.add( entities );
			}
		}
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
