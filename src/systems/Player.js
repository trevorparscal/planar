/**
 * Player system.
 *
 * @class
 */
Planar.System.Player = class extends Planar.System {
	/**
	 * @inheritdoc
	 */
	constructor() {
		super();
		this.keyboard = new Planar.Input.Keyboard( window );
	}

	/**
	 * @inheritdoc
	 */
	isRelated( entity ) {
		return entity.has( 'player', 'motion' );
	}

	/**
	 * @inheritdoc
	 */
	update( delta ) {
		const k = this.keyboard.keys,
			c = Planar.Input.Keyboard.codes;
		/*jshint loopfunc: true */
		for ( let entity of this.entities ) {
			if ( k[c.UP] || k[c.DOWN] || k[c.LEFT] || k[c.RIGHT] || k[c.SPACEBAR] ) {
				entity.change( {
					motion: ( motion ) => {
						const power = motion.mass * 0.005;
						if ( k[c.UP] ) {
							motion.force.y -= power;
						}
						if ( k[c.DOWN] ) {
							motion.force.y += power;
						}
						if ( k[c.LEFT] ) {
							motion.force.x -= power / 2;
						}
						if ( k[c.RIGHT] ) {
							motion.force.x += power / 2;
						}
						if ( k[c.SPACEBAR] ) {
							motion.torque += power;
						}
					}
				} );
			}
		}
	}
};
