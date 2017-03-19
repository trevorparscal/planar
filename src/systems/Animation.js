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
			tween.value += delta;
			if ( tween.value % 100 === 0 ) {
				let index = Math.round( Math.random() * 2 );
				entity.change( { shape: { type: ['rectangle', 'circle', 'ngon'][index] } } );
			}
			entity.change( {
				warp: {
					scale: new Planar.Point(
						1.5 + ( Math.sin( tween.value * ( Math.PI / 1000 ) ) * 0.5 ),
						1.5 + ( Math.cos( tween.value * ( Math.PI / 1000 ) ) * 0.5 )
					)
				}
			} );
		}
	}
};
