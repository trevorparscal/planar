/**
 * Animation system.
 *
 * @class
 */
Planar.System.Animation = class extends Planar.System {
	/**
	 * @inheritdoc
	 */
	constructor() {
		super();
		this.tweens = new Map();
	}

	/**
	 * @inheritdoc
	 */
	isRelated( entity ) {
		return entity.has( 'animation', 'shape' );
	}

	/**
	 * @inheritdoc
	 */
	add( entity ) {
		super.add( entity );
		this.tweens.set( entity.key, { value: 0 } );
	}

	/**
	 * @inheritdoc
	 */
	delete( entity ) {
		super.delete( entity );
		this.tweens.delete( entity.key );
	}

	/**
	 * @inheritdoc
	 */
	update( delta ) {
		for ( let entity of this.entities ) {
			let tween = this.tweens.get( entity.key );
			tween.value++;
			// Change the shape every now and then
			if ( tween.value % 100 === 0 ) {
				let index = Math.round( Math.random() * 3 ),
					size = 32,
					hash = entity.components.shape.hash;
				entity.change( { shape: [
					{ type: 'rectangle', size: { x: size, y: size } },
					{ type: 'circle', radius: size / 2 },
					{ type: 'ngon', radius: size / 2, sides: 3 },
					{ type: 'ngon', radius: size / 2, sides: 5 }
				][index] } );
			}
			// Constantly change the scale and skew
			entity.change( {
				warp: {
					scale: {
						x: 1.5 + ( Math.sin( tween.value * ( Math.PI / 100 ) ) * 0.5 ),
						y: 1.5 + ( Math.cos( tween.value * ( Math.PI / 100 ) ) * 0.5 )
					},
					skew: {
						x: Math.sin( tween.value * ( Math.PI / 100 ) ) * 0.5,
						y: Math.cos( tween.value * ( Math.PI / 100 ) ) * 0.5
					}
				}
			} );
		}
	}
};

Planar.Component.define( {
	/**
	 * Animation component.
	 *
	 * @class
	 * @extends {Planar.Component}
	 * @memberof Components
	 */
	animation: {}
} );
