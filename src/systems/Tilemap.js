/**
 * Tilemap system.
 *
 * @class
 */
Planar.System.Tilemap = class extends Planar.System {
	/**
	 * Create tilemap system.
	 *
	 * @constructor
	 * @param {Object} options Initialization options
	 */
	constructor() {
		super();
		this.grids = new Map();
	}

	/**
	 * @inheritdoc
	 */
	isRelated( entity ) {
		return entity.has( 'tilemapGrid' ) || entity.has( 'tilemapTile' );
	}

	/**
	 * Add a tilemap grid or tile.
	 *
	 * @param {Planar.Entity} entity Entity with `tilemapGrid` or `tilemapTile` components
	 * @throws {Error} If adding a tilemap grid and the tilemap grid already exists
	 * @throws {Error} If adding a tilemap tile and the related tilemap grid doesn't exists
	 */
	add( entity ) {
		super.add( entity );
		if ( entity.has( 'tilemapGrid' ) ) {
			const { tilemapGrid } = entity.components;
			if ( this.grids.get( entity.key ) ) {
				throw new Error( `Tilemap grid "${entity.key}" already exists.` );
			}
			this.grids.set( entity.key, { entity: entity, tiles: new Set() } );
		} else if ( entity.has( 'tilemapTile' ) ) {
			const { tilemapTile } = entity.components;
			let grid = this.grids.get( tilemapTile.grid );
			if ( !grid ) {
				throw new Error( `Tilemap grid "${tilemapTile.grid}" doesn't exist.` );
			}
			const { tilemapGrid } = grid.entity.components;
			entity.add( {
				transform: {
					position: {
						x: tilemapTile.cell.x * tilemapGrid.unit,
						y: tilemapTile.cell.y * tilemapGrid.unit
					}
				},
				shape: {
					type: 'rectangle',
					size: { x: tilemapGrid.unit, y: tilemapGrid.unit }
				},
				sprite: {
					resource: tilemapGrid.resource,
					texture: tilemapTile.texture
				}
			} );
			if ( tilemapTile.block ) {
				entity.add( { motion: { isStatic: true } } );
			}
			grid.tiles.add( entity );
		}
	}

	/**
	 * Delete a tilemap grid or tile.
	 *
	 * @param {Planar.Entity} entity Entity with `tilemapGrid` or `tilemapTile` components
	 */
	delete( entity ) {
		super.delete( entity );
		if ( entity.has( 'tilemapGrid' ) ) {
			if ( !this.grids.has( entity.key ) ) {
				throw new Error( `Tilemap grid "${entity.key}" doesn't exist.` );
			}
			this.grids.delete( entity.key );
		} else if ( entity.has( 'tilemapTile' ) ) {
			const { tilemapTile } = entity.components;
			const grid = this.grids.get( tilemapTile.grid );
			if ( !grid ) {
				throw new Error( `Tilemap grid "${tilemapTile.grid}" doesn't exist.` );
			}
			entity.delete( 'position', 'shape', 'sprite' );
			grid.tiles.delete( entity );
		}
	}

	/**
	 * @inheritdoc
	 */
	update( delta ) {
		/*jshint loopfunc: true */
		for ( let [ key, grid ] of this.grids ) {
			for ( let tile of grid.tiles ) {
				tile.handle( 'tilemapTile', ( tilemapTile ) => {
					if ( tilemapTile.grid !== key ) {
						// Relocate tile
						this.delete( tile );
						this.add( tile );
					}
				} );
			}
		}
	}
};
