window.CollisionDemo = class extends Demo {
	/**
	 * Create collision demo.
	 *
	 * @constructor
	 */
	constructor( id ) {
		super( id );
		this.theta = 0;
	}

	/*
	 * Render animation frame.
	 */
	render( dt ) {
		const ctx = this.context;
		this.theta += dt / 1000;

		const radius = 256,
			a = {
				position: {
					x: 256 + radius * Math.cos( this.theta ),
					y: 256 + radius * Math.sin( this.theta )
				},
				half: { x: 64, y: 64 }
			},
			b = {
				position: { x: 256, y: 256 },
				half: { x: 64, y: 64 }
			},
			destination = { x: this.cursor.x, y: this.cursor.y },
			delta = { x: destination.x - a.position.x, y: destination.y - a.position.y };

		const sweep = Collision.AABB.sweepAABB( b, a, delta ),
			hit = sweep.hit;

		// Clear all
		ctx.clearRect( 0, 0, this.canvas.width, this.canvas.height );

		// A box
		ctx.fillStyle = 'rgb(0,255,128)';
		ctx.fillRect(
			a.position.x - a.half.x,
			a.position.y - a.half.y,
			a.half.x * 2,
			a.half.y * 2
		);

		// B box
		ctx.fillStyle = 'rgb(0,128,255)';
		ctx.fillRect(
			b.position.x - b.half.x,
			b.position.y - b.half.y,
			b.half.x * 2,
			b.half.y * 2
		);

		// Destination
		ctx.strokeStyle = 'rgb(255,0,255)';
		ctx.strokeRect(
			destination.x - a.half.x,
			destination.y - a.half.y,
			a.half.x * 2,
			a.half.y * 2
		);

		// Intersection
		if ( hit ) {
			ctx.strokeStyle = 'rgba(0,128,255,0.5)';
			ctx.strokeRect(
				( a.position.x - a.half.x ) + hit.delta.x,
				( a.position.y - a.half.y ) + hit.delta.y,
				a.half.x * 2,
				a.half.y * 2
			);
			ctx.beginPath();
			ctx.moveTo( destination.x, destination.y );
			ctx.lineTo( a.position.x + hit.delta.x, a.position.y + hit.delta.y );
			ctx.stroke();
		}
	}
};
