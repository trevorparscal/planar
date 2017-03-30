/**
 * Graphics system.
 *
 * @class
 */
Planar.System.Graphics = class extends Planar.System {
	/**
	 * Create graphics system.
	 *
	 * @constructor
	 * @param {Object} options Initialization options
	 * @param {number} options.width Viewport width
	 * @param {number} options.height Viewport height
	 * @param {number} options.transparent Transparent background
	 * @param {number} options.antialias Anialias rendering
	 */
	constructor( options = {} ) {
		const {
			width = 512,
			height = 512,
			transparent = false,
			antialias = false,
			roundPixels = false
		} = options;
		super();
		this.renderer = PIXI.autoDetectRenderer(
			options.width,
			options.height,
			options.transparent,
			options.antialias
		);
		this.renderer.roundPixels = options.roundPixels;
		this.stage = new PIXI.Container();
		this.objects = new Map();
		document.body.appendChild( this.renderer.view );
	}

	/**
	 * @inheritdoc
	 */
	isRelated( entity ) {
		return entity.has( 'transform' ) &&
			( entity.has( 'shape', 'draw' ) || entity.has( 'sprite' ) || entity.has( 'camera' ) );
	}

	/**
	 * @inheritdoc
	 */
	add( entity ) {
		super.add( entity );
		var object;
		if ( entity.has( 'shape', 'draw' ) ) {
			object = new PIXI.Graphics();
		} else if ( entity.has( 'sprite' ) ) {
			const { sprite: { resource, texture, anchor } } = entity.components;
			object = new PIXI.Sprite( texture ?
				PIXI.loader.resources[resource].textures[texture] :
				PIXI.loader.resources[resource].texture
			);
			object.anchor.x = anchor.x;
			object.anchor.y = anchor.y;
		}
		if ( !object ) {
			throw new Error( 'Invalid entity.' );
		}
		this.objects.set( entity.key, object );
		this.stage.addChild( object );
	}

	/**
	 * @inheritdoc
	 */
	delete( entity ) {
		super.delete( entity );
		const object = this.objects.get( entity.key );
		this.objects.delete( entity.key );
		this.stage.removeChild( object );
	}

	/**
	 * @inheritdoc
	 */
	update( delta ) {
		/*jshint loopfunc: true */
		for ( let entity of this.entities ) {
			const object = this.objects.get( entity.key );
			if ( object instanceof PIXI.Sprite ) {
				entity.handle( 'sprite', ( sprite ) => {
					const { resource, texture, anchor } = sprite;
					object.texture = texture ?
						PIXI.loader.resources[resource].textures[texture] :
						PIXI.loader.resources[resource].texture;
					object.anchor.x = anchor.x;
					object.anchor.y = anchor.y;
				} );
			} else if ( object instanceof PIXI.Graphics ) {
				entity.handle( [ 'shape', 'draw' ], ( shape, draw ) => {
					object.clear();
					if ( shape.type === 'circle' ) {
						drawCircle( object, shape.radius, draw );
					} else {
						drawPolygon( object, shape.points, draw );
					}
				} );
			}
			entity.handle( {
				transform: ( transform ) => {
					object.position.copy( transform.position );
					object.rotation = transform.rotation;
				},
				warp: ( warp ) => {
					object.scale.copy( warp.scale );
					object.skew.copy( warp.skew );
				},
				filter: ( filter ) => {
					object.alpha = filter.alpha;
				}
			} );
		}
		this.renderer.render( this.stage );
	}
};

function drawCircle( graphic, radius, draw ) {
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
