/**
 * Based on SpacialHash by Christer Bystrom.
 * @licence MIT
 * @link https://git.io/vSevK
 */

/**
 * Spatial hash.
 *
 * @class
 */
class SpatialHash extends SpatialPartition {
	/**
	 * Create a spacial hash.
	 *
	 * @constructor
	 * @param {SpatialPartitionRegion} field Region of the space
	 * @param {Object} [options] Configuration options
	 * @param {number} [options.divisions=8] Number of horizontal and vertical divisions of the
	 *   field after rounding the maximum dimension of the field up to the nearest power of two
	 */
	constructor( field, { divisions = 8 } = {} ) {
		const max = Math.max( field.width, field.height ),
			nearest = Math.pow( 2, Math.ceil( Math.log( max ) / Math.log( 2 ) ) ),
			shift = Math.log2( nearest / divisions );
		super();
		this.field = field;
		this.divisions = divisions;
		this.getHashes = getHashes.bind( null, field.x, field.y, ( max >> shift ) - 1, shift );
		this.objects = {};
		this.keys = [];
		this.count = 0;

		// Initialization
		for ( let x = 0; x < divisions; x++ ) {
			for ( let y = 0; y < divisions; y++ ) {
				this.objects[x + ':' + y] = [];
			}
		}
	}

	/**
	 * @inheritdoc
	 */
	add( key, region ) {
		const objects = this.objects,
			hashes = this.getHashes( region );
		this.keys[this.count++] = key;
		for ( let hash of hashes ) {
			objects[hash].push( key );
		}
	}

	/**
	 * @inheritdoc
	 */
	clear() {
		let objects = this.objects;
		for ( let hash in objects ) {
			objects[hash] = [];
		}
		this.keys = [];
		this.count = 0;
	}

	/**
	 * @inheritdoc
	 */
	find( region ) {
		if ( !region ) {
			return [];
		}

		var keys = [],
			len = 0,
			objects = this.objects;

		for ( let hash of this.getHashes( region ) ) {
			let nearby = objects[hash];
			if ( nearby ) {
				for ( let key of nearby ) {
					keys[len++] = key;
				}
			}
		}
		return keys;
	}
}

/**
 * Make spacial hashes.
 *
 * @private
 * @param {number} max
 * @param {number} size Bucket size, as a power-of-two
 * @param {SpatialPartitionRegion} region Region
 * @return {string[]} Hashes for region
 */
function getHashes( offsetX, offsetY, max, size, region ) {
	const x = region.x - offsetX,
		y = region.y - offsetY,
		sx = Math.max( x >> size, 0 ),
		sy = Math.max( y >> size, 0 ),
		ex = Math.min( ( x + region.width ) >> size, max ),
		ey = Math.min( ( y + region.height ) >> size, max ),
		hashes = [];
	var len = 0;
	for ( let y = sy; y <= ey; y++ ) {
		for ( let x = sx; x <= ex; x++ ) {
			hashes[len++] = x + ':' + y;
		}
	}
	return hashes;
}

window.SpatialHash = SpatialHash;
