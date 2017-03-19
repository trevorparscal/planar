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
