/**
 * Geometry system.
 *
 * @class
 */
Planar.System.Geometry = class extends Planar.System {
	/**
	 * @inheritdoc
	 */
	isRelated( entity ) {
		return entity.has( 'shape' );
	}

	/**
	 * @inheritdoc
	 */
	add( entity ) {
		super.add( entity );
		entity.change( { shape: createPoints } );
	}

	/**
	 * @inheritdoc
	 */
	update( delta ) {
		/*jshint loopfunc: true */
		for ( let entity of this.entities ) {
			entity.handle( {
				shape: ( shape ) => {
					entity.change( { shape: createPoints } );
				}
			} );
		}
	}
};

/**
 * Create points.
 *
 * @private
 * @param {Planar.Component} shape Shape component
 */
function createPoints( shape ) {
	var points;
	switch ( shape.type ) {
		case 'rectangle':
			const hw = shape.width / 2,
				hh = shape.height / 2;
			points = [
				{ x: -hw, y: -hh },
				{ x: hw, y: -hh },
				{ x: hw, y: hh },
				{ x: -hw, y: hh }
			];
			break;
		case 'circle':
		case 'ngon':
			let { radius, sides } = shape;
			if ( shape.type === 'circle' || sides < 3 ) {
				// Approximate a circle
				sides = Math.ceil( Math.max( 10, Math.min( 25, radius ) ) );
			}
			const theta = 2 * Math.PI / sides,
				offset = theta * 0.5;
			points = [];
			for ( let i = 0; i < sides; i++ ) {
				let angle = offset + ( i * theta );
				points[i] = {
					x: Math.cos( angle ) * radius,
					y: Math.sin( angle ) * radius
				};
			}
			break;
		case 'polygon':
			points = shape.points;
			break;
		default:
			throw new Error( `"${shape.type}" shape type is invalid.` );
	}
	return { points: points };
}
