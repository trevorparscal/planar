/**
 * Based on Quadtree by Timo Hausmann.
 * @licence MIT
 * @link https://git.io/vSev1
 */

/**
 * Quadtree.
 *
 * @class
 */
class Quadtree extends SpatialPartition {
	/**
	 * Create a quadtree.
	 *
	 * @constructor
	 * @param {SpatialPartitionRegion} field Region of the space
	 * @param {Object} [options] Configuration options
	 * @param {number} [options.threshold=10] Number of objects a node can hold before splitting
	 * @param {number} [options.depth=4] Maximum levels of division
	 * @param {number} [options.level=0] Subnode level, used internally
	 */
	constructor( field, { threshold = 10, depth = 4, level = 0 } = {} ) {
		super();
		this.field = field;
		this.options = {
			threshold: threshold,
			depth: depth,
			level: level
		};
		this.nodes = [];
		this.objects = {};
		this.count = 0;
	}

	/**
	 * @inheritdoc
	 */
	add( key, region ) {
		if ( !isInField( this.field, region ) ) {
			return;
		}
		const { nodes, objects, field, options } = this;
		// if we have subnodes ...
		if ( nodes[0] !== undefined ) {
			let index = getIndex( field, region );
			if ( index !== -1 ) {
				nodes[index].add( key, region );
				return;
			}
		}
		this.count++;
		objects[key] = region;
		if ( this.count > options.threshold && options.level < options.depth ) {
			// split if we don't already have subnodes
			if ( nodes[0] === undefined ) {
				const opts = Object.create( options ),
					sw = Math.round( field.width / 2 ),
					sh = Math.round( field.height / 2 ),
					x = Math.round( field.x ),
					y = Math.round( field.y );
				opts.level++;
				// Top right node
				nodes[0] = new Quadtree( { x: x + sw, y: y, width: sw, height: sh }, opts );
				// Top left node
				nodes[1] = new Quadtree( { x: x, y: y, width: sw, height: sh }, opts );
				// Bottom left node
				nodes[2] = new Quadtree( { x: x, y: y + sh, width: sw, height: sh }, opts );
				// Rottom right node
				nodes[3] = new Quadtree( { x: x + sw, y: y + sh, width: sw, height: sh }, opts );
			}
			// Set all objects to there corresponding subnodes
			for ( let key in objects ) {
				let index = getIndex( field, objects[key] );
				if ( index !== -1 ) {
					let val = objects[key];
					delete objects[key];
					this.count--;
					nodes[index].add( key, val );
				}
			}
		}
	}

	/**
	 * @inheritdoc
	 */
	clear() {
		this.nodes = [];
		this.objects = {};
		this.count = 0;
	}

	/**
	 * @inheritdoc
	 */
	find( region ) {
		if ( !region || !isInField( this.field, region ) ) {
			return [];
		}
		const index = getIndex( this.field, region ),
			nodes = this.nodes,
			keys = Object.keys( this.objects );
		var len = keys.length;
		if ( nodes[0] !== undefined ) {
			// We have subnodes...
			if ( index !== -1 ) {
				// Region fits into a subnode
				for ( let key of nodes[index].find( region ) ) {
					keys[len++] = key;
				}
			} else {
				// Region does not fit into a subnode, check it against all subnodes
				for ( let node of nodes ) {
					for ( let key of node.find( region ) ) {
						keys[len++] = key;
					}
				}
			}
		}
		return keys;
	}
}

function isInField( field, region ) {
	const
		aMinX = field.x,
		aMinY = field.y,
		aMaxX = aMinX + field.width,
		aMaxY = aMinY + field.height,
		bMinX = region.x,
		bMinY = region.y,
		bMaxX = bMinX + region.width,
		bMaxY = bMinY + region.height;
	return !( aMaxX < bMinX || aMinX > bMaxX || aMaxY < bMinY || aMinY > bMaxY );
}

/*
 * Determine which node the object belongs to.
 *
 * @private
 * @param {SpatialPartitionRegion} field Space to get index within
 * @param {SpatialPartitionRegion} region Region to get index for
 * @return [number] Index of the subnode [0..3] indicating which quadrant the region is inside of,
 *   or -1 if the region doesn't entirely fit inside a quadrant
 */
function getIndex( field, region ) {
	const midY = field.x + ( field.width / 2 ),
		midX = field.y + ( field.height / 2 ),
		inTop = ( region.y < midX && region.y + region.height < midX ),
		inBottom = ( region.y > midX ),
		inLeft = region.x < midY && region.x + region.width < midY,
		inRight = region.x > midY;
	if ( inLeft ) {
		if ( inTop ) {
			return 1;
		} else if ( inBottom ) {
			return 2;
		}
	} else if ( inRight ) {
		if ( inTop ) {
			return 0;
		} else if ( inBottom ) {
			return 3;
		}
	}
	return -1;
}

window.Quadtree = Quadtree;
