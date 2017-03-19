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
		this.systems = new Set();
		this.scenes = new Set();
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
	 * Add a scene.
	 *
	 * Attaches scene and adds it to the scenes list.
	 *
	 * @param {...Planar.Scene} scenes Scenes to add
	 * @chainable
	 */
	add( ...scenes ) {
		for ( let scene of scenes ) {
			this.scenes.add( scene );
			scene.attach( this );
		}
		return this;
	}

	/**
	 * Delete a scene.
	 *
	 * Detaches scene and removes it from the scenes list.
	 *
	 * @param {...Planar.Scene} scenes Scenes to delete
	 * @chainable
	 */
	delete( ...scenes ) {
		for ( let scene of scenes ) {
			scene.detach();
			this.scenes.delete( scene );
		}
		return this;
	}

	/**
	 * Delete all scenes.
	 *
	 * Detaches each scene and clears the scenes list.
	 *
	 * @chainable
	 */
	clear() {
		for ( let scene of this.scenes ) {
			scene.detach();
		}
		this.scenes.clear();
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
			this.loop();
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
	 */
	loop() {
		let now = performance.now();
		if ( this.running ) {
			let delta = Math.min( now - this.then, 200 );
			this.then = now;
			for ( let scene of this.scenes ) {
				scene.flush();
			}
			for ( let system of this.systems ) {
				system.update( delta );
			}
			for ( let scene of this.scenes ) {
				scene.update( delta );
			}
			this.request = requestAnimationFrame( this.loop );
		}
	}
};
