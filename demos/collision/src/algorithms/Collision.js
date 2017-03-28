/**
 * Based on SAT.js by Jim Riecken.
 * @licence MIT
 * @link https://git.io/vSfLD
 */

/**
 */
class Collision {
	/**
	 * Check for a collision.
	 *
	 * @param {CollisionCircle|CollisionBox|CollisionPolygon} a First shape
	 * @param {CollisionCircle|CollisionBox|CollisionPolygon} b Second shape
	 * @param {Collision.Response} response Response to modify, omit to not produce a response
	 * @return {boolean} Collision detected
	 */
	test( a, b, response ) {
		const aType = a.radius ? 'circle' : ( a.points ? 'polygon' : 'box' ),
			bType = b.radius ? 'circle' : ( b.points ? 'polygon' : 'box' );

		switch ( aType ) {
			case 'circle':
				switch ( bType ) {
					case 'circle':
						return testCircleCircle( a, b, response );
					case 'box':
						return testCircleBox( a, b, response );
					case 'polygon':
						return testCirclePolygon( a, b, response );
				}
				break;
			case 'box':
				switch ( bType ) {
					case 'circle':
						return testPolygonCircle( a, b, response );
					case 'box':
						return testBoxBox( a, b, response );
					case 'polygon':
						return testPolygonPolygon( a, b, response );
				}
				break;
			case 'polygon':
				switch ( bType ) {
					case 'circle':
						return testPolygonCircle( a, b, response );
					case 'box':
						return testPolygonBox( a, b, response );
					case 'polygon':
						return testPolygonPolygon( a, b, response );
				}
				break;
		}

		throw new Error( 'Invalid shapes, must be a combination of circles, boxes or polygons.' );
	}

	/**
	 * Check if a point is in a shape.
	 *
	 * @param {CollisionVector} point Point to check at
	 * @param {CollisionPolygon|CollisionCircle} shape Shape to check in
	 * @return {boolean} Point is inside the shape
	 * @throws {Error} If shape is invalid
	 * @throws {Error} If point is invalid
	 */
	hit( point, shape ) {
		if ( 'x' in point && 'y' in point ) {
			if ( 'position' in shape ) {
				if ( 'points' in shape ) {
					return pointInPolygon( point, shape );
				}
				if ( 'radius' in shape ) {
					return pointInCircle( point, shape );
				}
			}
			throw new Error( 'Shape is invalid.' );
		}
		throw new Error( 'Point is invalid.' );
	}
}

/**
 * @typedef {Object} CollisionVector
 * @property {number} x Horizontal position
 * @property {number} y Vertical position
 */

/**
 * Vector utiltiies.
 */
const Vector = {
	/**
	 * Create a vector.
	 *
	 * Represents a point in space with a horizontal and vertical position.
	 *
	 * @param {number} x Horizontal position
	 * @param {number} y Vertical position
	 * @return {CollisionVector} Created vector
	 */
	create: function ( x, y ) {
		return { x: x, y: y };
	},

	/**
	 * Copy values from one vector to another.
	 *
	 * @param {CollisionVector} dst Vector to copy values to
	 * @param {CollisionVector} src Vector with values to copy
	 */
	copy: function ( dst, src ) {
		dst.x = src.x;
		dst.y = src.y;
	},

	/**
	 * Create a new vector with the same values as another.
	 *
	 * @param {CollisionVector} src Vector to clone
	 */
	clone: function ( vec ) {
		return { x: vec.x, y: vec.y };
	},

	/**
	 * Change a vector to be perpendicular to what it was before.
	 *
	 * Effectively roatates the vector 90 degrees in a clockwise direction.
	 *
	 * @param {CollisionVector} src Vector to rotate
	 */
	perp: function ( vec ) {
		const x = vec.x;
		vec.x = vec.y;
		vec.y = -x;
	},

	/**
	 * Reverse a vector.
	 *
	 * Effectively roatates the vector 180 degrees.
	 *
	 * @param {CollisionVector} vec Vector to rotate
	 */
	reverse: function ( vec ) {
		vec.x *= -1;
		vec.y *= -1;
	},

	/**
	 * Rotate a vector.
	 *
	 * Rotation direction is counter-clockwise and expressed in radians.
	 *
	 * @param {CollisionVector} vec Vector to rotate
	 * @param {number} angle Amount to rotate vector by, in radians
	 */
	rotate: function ( vec, angle ) {
		const { x, y } = vec;
		vec.x = x * Math.cos( angle ) - y * Math.sin( angle );
		vec.y = x * Math.sin( angle ) + y * Math.cos( angle );
	},

	/**
	 * Normalize a vector.
	 *
	 * @param {CollisionVector} vec Vector to normalize
	 */
	normalize: function ( vec ) {
		const d = Vector.len( vec );
		if ( d > 0 ) {
			vec.x /= d;
			vec.y /= d;
		}
	},

	/**
	 * Add values from one vector to another.
	 *
	 * @param {CollisionVector} dst Vector to add values to
	 * @param {CollisionVector} src Vector with values to add
	 */
	add: function ( dst, src ) {
		dst.x += src.x;
		dst.y += src.y;
	},

	/**
	 * Copy values from one vector to another.
	 *
	 * @param {CollisionVector} dst Vector to subtract values from
	 * @param {CollisionVector} src Vector with values to subtract
	 */
	sub: function ( dst, src ) {
		dst.x -= src.x;
		dst.y -= src.y;
	},

	/**
	 * Copy values from one vector to another.
	 *
	 * @param {CollisionVector} vec Vector to scale values of
	 * @param {number} x Horizontal scaling factor
	 * @param {number} [y=x] Vertical scaling factor
	 */
	scale: function ( vec, x, y = x ) {
		vec.x *= x;
		vec.y *= y;
	},

	/**
	 * Project a vector onto another vector.
	 *
	 * Effectively makes `dst` paralell to 'src'.
	 *
	 * @param {CollisionVector} dst Vector to project
	 * @param {CollisionVector} src Vector to project onto
	 */
	project: function ( dst, src ) {
		const amt = Vector.dot( dst, src ) / Vector.len2( src );
		dst.x = amt * src.x;
		dst.y = amt * src.y;
	},

	/**
	 * Project a vector onto another vector of unit length.
	 *
	 * Effectively makes `dst` paralell to 'src'. This is slightly more efficient than using
	 * #project when dealing with unit vectors.
	 *
	 * @param {CollisionVector} dst Vector to project
	 * @param {CollisionVector} src Vector to project onto
	 */
	projectN: function ( dst, src ) {
		const amt = Vector.dot( dst, src );
		dst.x = amt * src.x;
		dst.y = amt * src.y;
	},

	/**
	 * Reflect a vector on an abritrary axis.
	 *
	 * Effectively makes `dst` paralell to 'src'.
	 *
	 * @param {CollisionVector} dst Vector to reflect
	 * @param {CollisionVector} axis Vector represnting the axis
	 */
	reflect: function ( vec, axis ) {
		const { x, y } = vec;
		Vector.project( vec, axis );
		Vector.scale( vec, 2 );
		vec.x -= x;
		vec.y -= y;
	},

	/**
	 * Reflect a vector on an abritrary axis specified by a unit vector.
	 *
	 * Effectively makes `dst` paralell to 'src'. This is slightly more efficient than using
	 * #reflect when dealing with unit vectors.
	 *
	 * @param {CollisionVector} vec Vector to reflect
	 * @param {CollisionVector} axis Vector represnting the axis
	 */
	reflectN: function ( vec, axis ) {
		const { x, y } = vec;
		Vector.projectN( vec, axis );
		Vector.scale( vec, 2 );
		vec.x -= x;
		vec.y -= y;
	},

	/**
	 * Get the dot product of two vectors.
	 *
	 * @param {CollisionVector} a First vector
	 * @param {CollisionVector} b Second vector
	 * @return {number} Dot product
	 */
	dot: function ( a, b ) {
		return a.x * b.x + a.y * b.y;
	},

	/**
	 * Get the squared length of a vector.
	 *
	 * @param {CollisionVector} vec Vector to get squared length of
	 * @return {number} Squared length
	 */
	len2: function ( vec ) {
		return Vector.dot( vec, vec );
	},

	/**
	 * Get the length of a vector.
	 *
	 * @param {CollisionVector} vec Vector to get length of
	 * @return {number} Length
	 */
	len: function ( vec ) {
		return Math.sqrt( Vector.len2( vec ) );
	}
};

/**
 * @typedef {Object} CollisionCircle
 * @property {CollisionVector} position Position of circle at the center
 * @property {number} radius Radius of circle
 */

/**
 * Circle utiltiies.
 *
 * @type {Object}
 */
const Circle = {
	/**
	 * Create a circle.
	 *
	 * Represents a circle with a position and a radius.
	 *
	 * @param {CollisionVector} [position={ x: 0, y: 0 }] Position of circle at the center
	 * @param {number} [radius=0] Radius of circle
	 * @return {CollisionCircle} Created circle
	 */
	create: function ( { x = 0, y = 0 } = {}, radius = 0 ) {
		return {
			position: { x: x, y: y },
			radius: radius
		};
	},

	/**
	 * Compute the axis-aligned bounding box (AABB) of a circle.
	 *
	 * @param {CollisionCircle} circle Circle to compute AABB for
	 * @return {CollisionPolygon} AABB for the circle
	 */
	getAABB: function ( circle ) {
		const { radius, position } = circle;
		return Box.toPolygon( {
			position: {
				x: position.x - radius,
				y: position.y - radius
			},
			width: radius * 2,
			height: radius * 2
		} );
	}
};

/**
 * @typedef {Object} CollisionPolygon
 * @property {CollisionVector} position Position of polygon that points are relative to
 * @property {CollisionVector[]} points Points in polygon in counter-clockwise order
 * @property {number} angle Angle of polygon, in radians
 * @property {CollisionVector} offset Offset point
 */

const Polygon = {
	/**
	 * Create a convex polygon.
	 *
	 * Do not manually modify points, angle and offset directly while working with separation.
	 * Instead, use Polygon utilties, which will update these properties correctly.
	 *
	 * @param {CollisionVector} [position={ x: 0, y: 0 }] Position of polygon that points are
	 *   relative to
	 * @param {CollisionVector[]} [points=[]] Points in polygon in counter-clockwise order
	 * @return {CollisionPolygon} Created polygon
	 */
	create: function ( position = { x: 0, y: 0 }, points = [] ) {
		const polygon = {
			position: position,
			// Do not modify directly
			angle: 0,
			offset: { x: 0, y: 0 }
			/**
			 * @private
			 * @property {CollisionVector[]} points Points in polygon in counter-clockwise order
			 *   relative to local coordinates
			 */
			/**
			 * @private
			 * @property {CollisionVector[]} calcPoints Calculated points used for underlying
			 *   collisions and takes into account.
			 */
			/**
			 * @private
			 * @property {CollisionVector[]} edges Direction of each edge of the polygon, relative
			 * to the preceeding point. If you want to draw a given edge from the edge value, you
			 * must first translate to the position of the starting point.
			 */
			/**
			 * @private
			 * @property {CollisionVector[]} normals Normals of each edge of the polygon, relative
			 * relative to the preceeding point. If you want to draw an edge normal, you must first
			 * translate to the position of the starting point.
			 */
		};
		Polygon.setPoints( polygon, points );
		return polygon;
	},

	/**
	 * Set the points of the polygon.
	 *
	 * Note: The points are counter-clockwise with respect to the coordinate system. If you
	 * directly draw the points on a screen that has the origin at the top-left corner it will
	 * appear visually that the points are being specified clockwise. This is just because of the
	 * inversion of the Y-axis when being displayed.
	 *
	 * @param {CollisionPolygon} polygon Polygon to set points of
	 * @param {CollisionVector[]} newPoints Points to set, in counter-clockwise order
	 */
	setPoints: function ( polygon, points ) {
		if ( !polygon.points || polygon.points.length !== points.length ) {
			const calcPoints = polygon.calcPoints = [],
				edges = polygon.edges = [],
				normals = polygon.normals = [];
			// Allocate the vector arrays for the calculated properties
			for ( let i = 0, len = points.length; i < len; i++) {
				calcPoints.push( { x: 0, y: 0 } );
				edges.push( { x: 0, y: 0 } );
				normals.push({ x: 0, y: 0 } );
			}
		}
		polygon.points = points;
		recalcPolygon( polygon );
	},

	/**
	 * Set the rotation angle of a polygon.
	 *
	 * @param {CollisionPolygon} polygon Polygon to set angle of
	 * @param {number} angle Angle to rotate polygon to, in radians
	 */
	setAngle: function ( polygon, angle ) {
		polygon.angle = angle;
		recalcPolygon( polygon );
	},

	/**
	 * Set the position offset of a polygon.
	 *
	 * @param {CollisionPolygon} polygon Polygon to set offset of
	 * @param {CollisionVector} offset Distance to offset polygon by
	 */
	setOffset: function ( polygon, offset ) {
		polygon.offset = offset;
		recalcPolygon( polygon );
	},

	/**
	 * Rotate a polygon counter-clockwise around the origin of its local coordinate system.
	 *
	 * This changes the original points, so any angle value will be applied in addition to the
	 * rotation angle.
	 *
	 * @param {CollisionPolygon} polygon Polygon to rotate
	 * @param {number} angle Angle to rotate polygon to, in radians
	 */
	rotate: function ( polygon, angle ) {
		const points = this.points;
		for ( let i = 0, len = points.length; i < len; i++ ) {
			Vector.rotate( points[i], angle );
		}
		recalcPolygon( polygon );
	},

	/**
	 * Translate a polygon's points relative to the origin of its local coordinate system.
	 *
	 * This is useful to move the origin of a polygon.
	 *
	 * This changes the original points, so any offset values will be applied in addition to the
	 * translation distance.
	 *
	 * @param {CollisionPolygon} polygon [description]
	 * @param {number} x Horizontal distance to move by
	 * @param {number} y Vertical distance to move by
	 */
	translate: function ( polygon, x, y ) {
		const points = this.points;
		for ( let i = 0, len = points.length; i < len; i++ ) {
			const point = points[i];
			point.x += x;
			point.y += y;
		}
		recalcPolygon( polygon );
	},

	/**
	 * Compute the axis-aligned bounding box (AABB) of a polygon.
	 *
	 * Any angle or offset values will be applied before creating the AABB.
	 *
	 * @param {CollisionPolygon} polygon Polygon to compute AABB for
	 * @return {CollisionPolygon} AABB for the polygon
	 */
	getAABB: function ( polygon ) {
		const points = polygon.calcPoints;
		var xMin = points[0].x,
			yMin = points[0].y,
			xMax = points[0].x,
			yMax = points[0].y;
		for ( let i = 1, len = points.length; i < len; i++ ) {
			var point = points[i];
			if (point.x < xMin) {
				xMin = point.x;
			}
			else if (point.x > xMax) {
				xMax = point.x;
			}
			if (point.y < yMin) {
				yMin = point.y;
			}
			else if (point.y > yMax) {
				yMax = point.y;
			}
		}
		const position = Vector.clone( polygon.position );
		Vector.add( position, { x: xMin, y: yMin } );
		return Box.toPolygon(
			Box.create( position, xMax - xMin, yMax - yMin )
		);
	}
};

/**
 * @typedef {Object} CollisionBox
 * @property {CollisionVector} position Position of the top-left of the box
 * @property {number} width Width of the box
 * @property {number} height Height of the box
 */

const Box = {
	/**
	 * Create a box.
	 *
	 * Represents a box with a position, width and height.
	 *
	 * @param {CollisionVector} [position={ x: 0, y: 0 }] Position of the top-left of the box
	 * @param {number} [width=0] Width of the box
	 * @param {number} [height=0] Height of the box
	 * @return {CollisionBox} Created box
	 */
	create: function ( { x = 0, y = 0 } = {}, width = 0, height = 0 ) {
		return { position: { x: x, y: y }, width: width, height: height };
	},

	/**
	 * Get a polygon that is the same shape as a box.
	 *
	 * @param {CollisionBox} box Box to get polygon for
	 * @return {CollisionPolygon} Created polygon
	 */
	toPolygon: function ( box ) {
		const { position, width, height } = box;
		return Polygon.create( { x: position.x, y: position.y }, [
			{ x: 0, y: 0 },
			{ x: width, y: 0 },
			{ x: width, y: height },
			{ x: 0, y: height }
		] );
	}
};

/**
 * Response.
 *
 * A response represents the result of an intersection.
 *
 * @class
 */
class Response {
	/**
	 * Create a response.
	 *
	 * @constructor
	 */
	constructor() {
		/**
		 * @property {Object} First object in the collision
		 */
		this.a = null;
		/**
		 * @property {Object} Second object in the collision
		 */
		this.b = null;
		/**
		 * @property {number} Magnitude of the overlap on the shortest colliding axis
		 */
		this.overlap = Number.MAX_VALUE;
		/**
		 * @property {CollisionVector} The shortest colliding axis (unit-vector)
		 */
		this.overlapN = { x: 0, y: 0 };
		/**
		 * @property {CollisionVector} The overlap vector
		 *   (i.e. overlapN * overlap), which if subtracted from the position
		 *   of the first object, both objects will no longer be colliding.
		 */
		this.overlapV = { x: 0, y: 0 };
		/**
		 * @property {boolean} The first object is completely inside of the second object
		 */
		this.aInB = true;
		/**
		 * @property {boolean} The second object is completely inside of the first object
		 */
		this.bInA = true;
	}

	/**
	 * Clear the response.
	 *
	 * Resets some values back to their defaults. Call this between tests if you are going to reuse
	 * a single Response object for multiple intersection tests (recommented as it will avoid
	 * allcating extra memory).
	 *
	 * @chainable
	 */
	clear() {
		this.overlap = Number.MAX_VALUE;
		this.aInB = true;
		this.bInA = true;
		return this;
	}
}

// Check whether two convex polygons are separated by the specified
// axis (must be a unit vector)
/**
 * @param {Vector} aPos The position of the first polygon.
 * @param {Vector} bPos The position of the second polygon.
 * @param {Array.<Vector>} aPoints The points in the first polygon.
 * @param {Array.<Vector>} bPoints The points in the second polygon.
 * @param {Vector} axis The axis (unit sized) to test against.  The points of both polygons
 *   will be projected onto this axis.
 * @param {Response=} response A Response object (optional) which will be populated
 *   if the axis is not a separating axis.
 * @return {boolean} true if it is a separating axis, false otherwise.  If false,
 *   and a response is passed in, information about how much overlap and
 *   the direction of the overlap will be populated.
 */
function isSeparatingAxis( aPos, bPos, aPoints, bPoints, axis, response ) {
	const { arrays, vectors } = pools,
		rangeA = arrays.pop(),
		rangeB = arrays.pop();

	// The magnitude of the offset between the two polygons
	const offsetV = vectors.pop();
	Vector.copy( offsetV, bPos );
	Vector.sub( offsetV, aPos);

	const projectedOffset = Vector.dot( offsetV, axis );

	// Project the polygons onto the axis
	flattenPointsOn( aPoints, axis, rangeA );
	flattenPointsOn( bPoints, axis, rangeB );

	// Move B's range to its position relative to A
	rangeB[0] += projectedOffset;
	rangeB[1] += projectedOffset;

	// Check if there is a gap. If there is, this is a separating axis and we can stop
	if ( rangeA[0] > rangeB[1] || rangeB[0] > rangeA[1] ) {
		vectors.push( offsetV );
		arrays.push( rangeA );
		arrays.push( rangeB );
		return true;
	}
	// This is not a separating axis. If we're calculating a response, calculate the overlap
	if ( response ) {
		let overlap = 0;
		// A starts further left than B
		if ( rangeA[0] < rangeB[0] ) {
			response.aInB = false;
			// A ends before B does. We have to pull A out of B
			if ( rangeA[1] < rangeB[1] ) {
				overlap = rangeA[1] - rangeB[0];
				response.bInA = false;
			// B is fully inside A.  Pick the shortest way out
			} else {
				let option1 = rangeA[1] - rangeB[0];
				let option2 = rangeB[1] - rangeA[0];
				overlap = option1 < option2 ? option1 : -option2;
			}
		// B starts further left than A
		} else {
			response.bInA = false;
			// B ends before A ends. We have to push A out of B
			if ( rangeA[1] > rangeB[1] ) {
				overlap = rangeA[0] - rangeB[1];
				response.aInB = false;
			// A is fully inside B.  Pick the shortest way out
			} else {
				let option1 = rangeA[1] - rangeB[0];
				let option2 = rangeB[1] - rangeA[0];
				overlap = option1 < option2 ? option1 : -option2;
			}
		}
		// If this is the smallest amount of overlap we've seen so far, set it as the minimum
		// overlap
		let absOverlap = Math.abs( overlap );
		if ( absOverlap < response.overlap ) {
			response.overlap = absOverlap;
			Vector.copy( response.overlapN, axis );
			if ( overlap < 0 ) {
				// Reverse
				Vector.reverse( response.overlapN );
			}
		}
	}
	vectors.push( offsetV );
	arrays.push( rangeA );
	arrays.push( rangeB );
	return false;
}

// ## Collision Tests

// Check if a point is inside a circle
/**
 * @param {Vector} point The point to test.
 * @param {Circle} circle The circle to test.
 * @return {boolean} true if the point is inside the circle, false if it is not.
 */
function pointInCircle( point, circle ) {
	const { vectors } = pools;

	var diff = vectors.pop();
	diff.x = point.x - circle.position.x;
	diff.y = point.y - circle.position.y;
	var radiusSq = circle.radius * circle.radius;
	var distanceSq = Vector.len2( diff );
	vectors.push( diff );
	// If the distance between is smaller than the radius then the point is inside the circle
	return distanceSq <= radiusSq;
}

// Check if a point is inside a convex polygon
/**
 * @param {Vector} point The point to test.
 * @param {Polygon} polygon The polygon to test.
 * @return {boolean} true if the point is inside the polygon, false if it is not.
 */
function pointInPolygon( point, polygon ) {
	const { testPoint, response } = pools;
	testPoint.position.x = point.x;
	testPoint.position.y = point.y;
	response.clear();
	if ( testPolygonPolygon( testPoint, polygon, response ) ) {
		return response.aInB;
	}
	return false;
}

// Check if two circles collide
/**
 * @param {Circle} a The first circle.
 * @param {Circle} b The second circle.
 * @param {Response=} response Response object (optional) that will be populated if
 *   the circles intersect.
 * @return {boolean} true if the circles intersect, false if they don't.
 */
function testCircleCircle( a, b, response ) {
	const { vectors } = pools;
	// Check if the distance between the centers of the two
	// circles is greater than their combined radius
	const diff = vectors.pop();
	diff.x = b.position.x - a.position.x;
	diff.y = b.position.y - a.position.y;

	const totalRadius = a.radius + b.radius,
		totalRadiusSq = totalRadius * totalRadius,
		distanceSq = Vector.len2( diff );
	// If the distance is bigger than the combined radius, they don't intersect
	if ( distanceSq > totalRadiusSq ) {
		vectors.push( diff );
		return false;
	}
	// They intersect.  If we're calculating a response, calculate the overlap
	if ( response ) {
		const dist = Math.sqrt( distanceSq );
		response.a = a;
		response.b = b;
		response.overlap = totalRadius - dist;
		Vector.normalize( diff );
		response.overlapN.x = diff.x;
		response.overlapN.y = diff.y;
		response.overlapV.x = diff.x * response.overlap;
		response.overlapV.y = diff.y * response.overlap;
		response.aInB = a.radius <= b.radius && dist <= b.radius - a.radius;
		response.bInA = b.radius <= a.radius && dist <= a.radius - b.radius;
	}
	vectors.push( diff );
	return true;
}

// Check if a polygon and a circle collide
/**
 * @param {Polygon} polygon The polygon.
 * @param {Circle} circle The circle.
 * @param {Response=} response Response object (optional) that will be populated if
 *   they interset.
 * @return {boolean} true if they intersect, false if they don't.
 */
function testPolygonCircle( polygon, circle, response ) {
	const { vectors } = pools;

	// Get the position of the circle relative to the polygon.
	const circlePos = vectors.pop();
	Vector.copy( circlePos, circle.position );
	Vector.sub( circlePos, polygon.position );
	const radius = circle.radius;
	const radius2 = radius * radius;
	const points = polygon.calcPoints;
	const len = points.length;
	const edge = vectors.pop();
	const point = vectors.pop();

	// For each edge in the polygon:
	for ( let i = 0; i < len; i++) {
		var next = i === len - 1 ? 0 : i + 1;
		var prev = i === 0 ? len - 1 : i - 1;
		var overlap = 0;
		var overlapN = null;

		// Get the edge.
		Vector.copy( edge, polygon.edges[i] );
		// Calculate the center of the circle relative to the starting point of the edge.
		Vector.copy( point, circlePos );
		Vector.sub( point, points[i] );

		// If the distance between the center of the circle and the point
		// is bigger than the radius, the polygon is definitely not fully in
		// the circle.
		if ( response && Vector.len2( point ) > radius2 ) {
			response.aInB = false;
		}

		// Calculate which Voronoi region the center of the circle is in.
		var region = voronoiRegion( edge, point );
		// If it's the left region:
		if ( region === LEFT_VORONOI_REGION ) {
			// We need to make sure we're in the RIGHT_VORONOI_REGION of the previous edge.
			Vector.copy( edge, polygon.edges[prev] );
			// Calculate the center of the circle relative the starting point of the previous edge
			var point2 = vectors.pop();
			Vector.copy( point2, circlePos );
			Vector.sub( point2, points[prev] );
			region = voronoiRegion( edge, point2 );
			if ( region === RIGHT_VORONOI_REGION ) {
			// It's in the region we want.  Check if the circle intersects the point.
			let dist = Vector.len( point );
			if ( dist > radius ) {
				// No intersection
				vectors.push( circlePos );
				vectors.push( edge );
				vectors.push( point );
				vectors.push( point2 );
				return false;
			} else if (response) {
				// It intersects, calculate the overlap.
				response.bInA = false;
				overlapN = point;
				Vector.normalize( overlapN );
				overlap = radius - dist;
			}
		}
		vectors.push(point2);
	// If it's the right region:
	} else if ( region === RIGHT_VORONOI_REGION ) {
		// We need to make sure we're in the left region on the next edge
		Vector.copy( edge, polygon.edges[next] );
		// Calculate the center of the circle relative to the starting point of the next edge.
		Vector.copy( point, circlePos );
		Vector.sub( point, points[next] );
		region = voronoiRegion( edge, point );
		if ( region === LEFT_VORONOI_REGION ) {
			// It's in the region we want.  Check if the circle intersects the point.
			let dist = Vector.len( point );
			if ( dist > radius ) {
				// No intersection
				vectors.push( circlePos );
				vectors.push( edge );
				vectors.push( point );
				return false;
			} else if (response) {
				// It intersects, calculate the overlap.
				response.bInA = false;
				overlapN = point;
				Vector.normalize( overlapN );
				overlap = radius - dist;
			}
		}
		// Otherwise, it's the middle region:
		} else {
			// Need to check if the circle is intersecting the edge,
			// Change the edge into its "edge normal".
			var normal = edge;
			Vector.perp( normal );
			Vector.normalize( normal );
			// Find the perpendicular distance between the center of the
			// circle and the edge.
			var dist = Vector.dot( point, normal );
			var distAbs = Math.abs( dist );
			// If the circle is on the outside of the edge, there is no intersection.
			if ( dist > 0 && distAbs > radius ) {
				// No intersection
				vectors.push( circlePos );
				vectors.push( normal );
				vectors.push( point );
				return false;
			} else if ( response ) {
				// It intersects, calculate the overlap.
				overlapN = normal;
				overlap = radius - dist;
				// If the center of the circle is on the outside of the edge, or part of the
				// circle is on the outside, the circle is not fully inside the polygon.
				if ( dist >= 0 || overlap < 2 * radius ) {
					response.bInA = false;
				}
			}
		}

		// If this is the smallest overlap we've seen, keep it.
		// (overlapN may be null if the circle was in the wrong Voronoi region).
		if (overlapN && response && Math.abs( overlap ) < Math.abs( response.overlap ) ) {
			response.overlap = overlap;
			Vector.copy( response.overlapN, overlapN );
		}
	}

	// Calculate the final overlap vector - based on the smallest overlap.
	if ( response ) {
		response.a = polygon;
		response.b = circle;
		Vector.copy( response.overlapV, response.overlapN );
		Vector.scale( response.overlapV, response.overlap );
	}
	vectors.push( circlePos );
	vectors.push( edge );
	vectors.push( point );
	return true;
}

// Check if a circle and a polygon collide
//
// **NOTE:** This is slightly less efficient than polygonCircle as it just
// runs polygonCircle and reverses everything at the end
/**
 * @param {Circle} circle The circle.
 * @param {Polygon} polygon The polygon.
 * @param {Response=} response Response object (optional) that will be populated if
 *   they interset.
 * @return {boolean} true if they intersect, false if they don't.
 */
function testCirclePolygon( circle, polygon, response ) {
	// Test the polygon against the circle
	var result = testPolygonCircle( polygon, circle, response );
	if ( result && response ) {
		// Swap A and B in the response
		var a = response.a;
		var aInB = response.aInB;
		Vector.reverse( response.overlapN );
		Vector.reverse( response.overlapV );
		response.a = response.b;
		response.b = a;
		response.aInB = response.bInA;
		response.bInA = aInB;
	}
	return result;
}

// Checks whether polygons collide
 /**
 * @param {Polygon} a The first polygon.
 * @param {Polygon} b The second polygon.
 * @param {Response=} response Response object (optional) that will be populated if
 *   they interset.
 * @return {boolean} true if they intersect, false if they don't
 */
function testPolygonPolygon( a, b, response ) {
	var aPoints = a.calcPoints;
	var aLen = aPoints.length;
	var bPoints = b.calcPoints;
	var bLen = bPoints.length;
	// If any of the edge normals of A is a separating axis, no intersection
	for ( let i = 0; i < aLen; i++ ) {
		if ( isSeparatingAxis( a.position, b.position, aPoints, bPoints, a.normals[i], response ) ) {
			return false;
		}
	}
	// If any of the edge normals of B is a separating axis, no intersection
	for ( let i = 0; i < bLen; i++ ) {
		if ( isSeparatingAxis( a.position, b.position, aPoints, bPoints, b.normals[i], response ) ) {
			return false;
		}
	}
	// Since none of the edge normals of A or B are a separating axis, there is an intersection
	// and we've already calculated the smallest overlap (in isSeparatingAxis).  Calculate the
	// final overlap vector
	if ( response ) {
		response.a = a;
		response.b = b;
		response.overlapV.x = response.overlapN.x * response.overlap;
		response.overlapV.y = response.overlapN.y * response.overlap;
	}
	return true;
}

Collision.Vector = Vector;
Collision.Circle = Circle;
Collision.Box = Box;
Collision.Polygon = Polygon;
Collision.Response = Response;
window.Collision = Collision;

// ## Helper Functions

/**
 * @private
 * @param {[type]} polygon [description]
 * @return {[type]} [description]
 */
function recalcPolygon( polygon ) {
	// Calculated points - this is what is used for underlying collisions and takes into account
	// the angle/offset set on the polygon.
	const calcPoints = polygon.calcPoints;
	// The edges here are the direction of the `n`th edge of the polygon, relative to
	// the `n`th point. If you want to draw a given edge from the edge value, you must
	// first translate to the position of the starting point.
	const edges = polygon.edges;
	// The normals here are the direction of the normal for the `n`th edge of the polygon, relative
	// to the position of the `n`th point. If you want to draw an edge normal, you must first
	// translate to the position of the starting point.
	const normals = polygon.normals;
	// Copy the original points array and apply the offset/angle
	const points = polygon.points;
	const offset = polygon.offset;
	const angle = polygon.angle;
	const len = points.length;
	for ( let i = 0; i < len; i++) {
		const calcPoint = calcPoints[i];
		Vector.copy( calcPoint, points[i] );
		calcPoint.x += offset.x;
		calcPoint.y += offset.y;
		if ( angle !== 0 ) {
			Vector.rotate( calcPoint, angle );
		}
	}
	// Calculate the edges/normals
	for ( let i = 0; i < len; i++) {
		const p1 = calcPoints[i];
		const p2 = i < len - 1 ? calcPoints[i + 1] : calcPoints[0];
		const e = edges[i];
		Vector.copy( e, p2 );
		Vector.sub( e, p1 );
		Vector.copy( normals[i], e );
		Vector.perp( normals[i] );
		Vector.normalize( normals[i] );
	}
}

// Flattens the specified array of points onto a unit vector axis,
// resulting in a one dimensional range of the minimum and
// maximum value on that axis
/**
 * @param {Array.<Vector>} points The points to flatten.
 * @param {Vector} normal The unit vector axis to flatten on.
 * @param {Array.<number>} result An array.  After calling this function,
 *   result[0] will be the minimum value,
 *   result[1] will be the maximum value.
 */
function flattenPointsOn( points, normal, result ) {
	var min = Number.MAX_VALUE;
	var max = -Number.MAX_VALUE;
	for ( let i = 0, len = points.length; i < len; i++ ) {
		// The magnitude of the projection of the point onto the normal
		var dot = Vector.dot( points[i], normal );
		if ( dot < min ) {
			min = dot;
		}
		if ( dot > max ) {
			max = dot;
		}
	}
	result[0] = min;
	result[1] = max;
}

// Calculates which Voronoi region a point is on a line segment
// It is assumed that both the line and the point are relative to `(0,0)`
//
//            |       (0)      |
//     (-1)  [S]--------------[E]  (1)
//            |       (0)      |
/**
 * @param {Vector} line The line segment.
 * @param {Vector} point The point.
 * @return  {number} LEFT_VORONOI_REGION (-1) if it is the left region,
 *   MIDDLE_VORONOI_REGION (0) if it is the middle region,
 *   RIGHT_VORONOI_REGION (1) if it is the right region.
 */
function voronoiRegion( line, point ) {
	var len2 = Vector.len2( line );
	var dp = Vector.dot( point, line );
	// If the point is beyond the start of the line, it is in the
	// left voronoi region
	if ( dp < 0 ) {
		return LEFT_VORONOI_REGION;
	}
	// If the point is beyond the end of the line, it is in the
	// right voronoi region
	else if ( dp > len2 ) {
		return RIGHT_VORONOI_REGION;
	}
	// Otherwise, it's in the middle one
	else {
		return MIDDLE_VORONOI_REGION;
	}
}

// Constants for Voronoi regions
/**
 * @const
 */
const LEFT_VORONOI_REGION = -1; // Symbol( 'LEFT_VORONOI_REGION' );
/**
 * @const
 */
const MIDDLE_VORONOI_REGION = 0; // Symbol( 'MIDDLE_VORONOI_REGION' );
/**
 * @const
 */
const RIGHT_VORONOI_REGION = 1; // Symbol( 'RIGHT_VORONOI_REGION' );

/**
 * Object pools.
 *
 * Objects used in calculations to avoid allocating memory.
 *
 * @type {Object}
 */
const pools = {
	/**
	 * @property {CollisionVector[]} A pool of vector objects used in calculations
	 */
	vectors: ( () => {
		const items = [];
		for ( let i = 0; i < 10; i++ ) {
			items[i] = { x: 0, y: 0 };
		}
		return items;
	} )(),
	/**
	 * @property {Array.<number[]>} A pool of arrays of numbers used in calculations
	 */
	arrays: ( () => {
		const items = [];
		for ( let i = 0; i < 10; i++ ) {
			items[i] = [];
		}
		return items;
	} )(),
	/**
	 * @property {Response} Temporary response used for polygon hit detection.
	 */
	response: new Response(),
	/**
	 * @property {CollisionPolygon} Tiny "point" polygon used for polygon hit detection.
	 */
	testPoint: Box.toPolygon( { position: { x: 0, y: 0 }, width: 0.000001, height: 0.000001 } )
};
