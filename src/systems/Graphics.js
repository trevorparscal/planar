/**
 * Graphics system.
 *
 * @class
 */
Planar.System.Graphics = class extends Planar.System {
	constructor() {
		super();
		this.renderer = PIXI.autoDetectRenderer( 512, 512, false, true );
		this.stage = new PIXI.Container();
		this.graphics = new Map();
		document.body.appendChild( this.renderer.view );
	}

	isRelated( entity ) {
		return entity.has( 'draw', 'shape', 'transform' );
	}

	add( entity ) {
		super.add( entity );
		const graphic = new PIXI.Graphics();
		this.graphics.set( entity.key, graphic );
		this.stage.addChild( graphic );
	}

	delete( entity ) {
		super.delete( entity );
		const graphic = this.graphics.get( entity.key );
		this.graphics.delete( entity.key );
		this.stage.removeChild( graphic );
	}

	update( delta ) {
		/*jshint loopfunc: true */
		for ( let entity of this.entities ) {
			const graphic = this.graphics.get( entity.key );
			entity.handle( [ 'shape', 'draw' ], ( shape, draw ) => {
				graphic.clear();
				switch ( shape.type ) {
					case 'circle':
						drawCircle( graphic, shape.radius, draw );
						break;
					default:
						drawPolygon( graphic, shape.points, draw );
						break;
				}
			} );
			entity.handle( {
				transform: ( transform ) => {
					graphic.position.copy( transform.position );
					graphic.rotation = transform.rotation;
				},
				warp: ( warp ) => {
					graphic.scale.copy( warp.scale );
				},
				filter: ( filter ) => {
					graphic.alpha = filter.alpha;
				}
			} );
		}
		this.renderer.render( this.stage );
	}
};

function drawCircle( graphic, radius, draw ) {
	const pixiPoints = [];
	if ( draw.fillAlpha ) {
		graphic.beginFill( draw.fillColor, draw.fillAlpha );
	}
	if ( draw.strokeWidth && draw.strokeAlpha ) {
		graphic.lineStyle( draw.strokeWidth, draw.strokeColor, draw.strokeAlpha );
	}
	graphic.drawCircle( 0, 0, radius );
	if ( draw.fillAlpha ) {
		graphic.endFill();
	}
	graphic.cacheAsBitmap = !draw.isDynamic;
}

function drawPolygon( graphic, points, draw ) {
	const pixiPoints = [];
	if ( draw.fillAlpha ) {
		graphic.beginFill( draw.fillColor, draw.fillAlpha );
	}
	if ( draw.strokeWidth && draw.strokeAlpha ) {
		graphic.lineStyle( draw.strokeWidth, draw.strokeColor, draw.strokeAlpha );
	}
	for ( let i = 0, len = points.length; i < len; i++ ) {
		pixiPoints[i] = new PIXI.Point( points[i].x, points[i].y );
	}
	graphic.drawPolygon( pixiPoints );
	if ( draw.fillAlpha ) {
		graphic.endFill();
	}
	graphic.cacheAsBitmap = !draw.isDynamic;
}
