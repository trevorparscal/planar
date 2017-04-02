window.Demo = class {
	/**
	 * Create demo.
	 *
	 * @constructor
	 * @param {string} id HTML ID of canvas to render to.
	 */
	constructor( id ) {
		// Properties
		this.canvas = document.getElementById( id );
		this.context = this.canvas.getContext( '2d' );
		this.cursor = { x: 0, y: 0 };
		this.loop = this.loop.bind( this );
		this.then = null;

		// Events
		this.canvas.addEventListener( 'mousemove', ( e ) => {
			this.cursor.x = e.offsetX;
			this.cursor.y = e.offsetY;
		} );
		this.canvas.addEventListener( 'mouseover', ( e ) => {
			this.start();
		} );
		this.canvas.addEventListener( 'mouseout', ( e ) => {
			this.stop();
		} );
	}

	/**
	 * Start animation.
	 */
	start() {
		this.running = true;
		this.then = performance.now();
		this.loop();
	}

	/**
	 * Stop animation.
	 */
	stop() {
		this.running = false;
	}

	/**
	 * Loop animation.
	 */
	loop() {
		const now = performance.now(),
			delta = this.then - now;
		if ( this.running ) {
			this.render( delta );
			this.then = now;
			requestAnimationFrame( this.loop );
		}
	}

	/*
	 * Render animation frame.
	 */
	render( delta ) {
		//
	}
};
