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
		this.dpad = new DirectionalPad( this.keyboard );
		this.movement = {
			up: { x: 0, y: -1 },
			down: { x: 0, y: 1 },
			left: { x: -1, y: 0 },
			right: { x: 1, y: 0 }
		};
	}

	/**
	 * @inheritdoc
	 */
	isRelated( entity ) {
		return entity.has( 'player' );
	}

	/**
	 * @inheritdoc
	 */
	update( delta ) {
		const move = ( motion ) => {
			var factors = this.movement[this.dpad.direction];
			if ( factors ) {
				motion.force.x += factors.x * delta / 10000;
				motion.force.y += factors.y * delta / 10000;
			}
		};
		this.dpad.update();
		for ( let entity of this.entities ) {
			if ( this.dpad.pressed ) {
				entity.change( { motion: move } );
				entity.change( { player: { direction: this.dpad.direction } } );
			}
			entity.change( { player: { walking: this.dpad.pressed } } );
		}
	}
};

Planar.Component.define( {
	/**
	 * Player component.
	 *
	 * @class
	 * @extends {Planar.Component}
	 * @memberof Components
	 */
	player: {
		walking: [ 'boolean', false ],
		direction: [ 'string', 'up' ]
	}
} );

class DirectionalPad {
	constructor( keyboard ) {
		const codes = Planar.Input.Keyboard.codes;
		this.keyboard = keyboard;
		this.pressed = [];
		this.actions = [
			{ name: 'up', code: codes.UP },
			{ name: 'down', code: codes.DOWN },
			{ name: 'left', code: codes.LEFT },
			{ name: 'right', code: codes.RIGHT },
		];
	}

	update() {
		const keys = this.keyboard.keys;

		for ( let action of this.actions ) {
			let index = this.pressed.indexOf( action.name ),
				wasPressed = index !== -1,
				isPressed = keys[action.code];
			if ( isPressed && !wasPressed ) {
				this.pressed.push( action.name );
			} else if ( !isPressed && wasPressed ) {
				this.pressed.splice( index, 1 );
			}
		}
	}

	get direction() {
		return this.pressed[this.pressed.length - 1] || null;
	}
}
