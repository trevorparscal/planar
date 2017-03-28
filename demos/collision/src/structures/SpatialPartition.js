/**
 * Spatial partition.
 *
 * @class
 */
class SpatialPartition {
	/**
	 * @typedef {Object} SpatialPartitionRegion
	 * @property {number} x Region horizontal position on the left side
	 * @property {number} y Region vertical position at the top side
	 * @property {number} width Region width
	 * @property {number} height Region height
	 */

	/**
	 * Create a space.
	 *
	 * @constructor
	 */

	/**
	 * Add an entry to the space.
	 *
	 * If the entry already exists in the space, it's region will be updated.
	 *
	 * @method add
	 * @param {string} key Entry key
	 * @param {SpatialPartitionRegion} region Entry region
	 *
	 */

	/*
	 * Clear all entries.
	 *
	 * @method clear
	 */

	/**
	 * Find entries within a region.
	 *
	 * @method find
	 * @param {SpatialPartitionRegion} region Region to find keys in
	 * @return {Iterator} Iterator containing keys of rectangles in the region
	 */
}

window.SpatialPartition = SpatialPartition;
