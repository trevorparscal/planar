const assert = chai.assert,
	AABB = Collision.AABB,
	Hit = Collision.Hit,
	Sweep = Collision.Sweep;

describe( 'Collision', function () {
	it( 'intersectPoint should return null when not colliding', function () {
		let aabb = { position: { x: 0, y: 0 }, half: { x: 8, y: 8 } };
		let points = [
			{ x: -16, y: -16 },
			{ x: 0, y: -16 },
			{ x: 16, y: -16 },
			{ x: 16, y: 0 },
			{ x: 16, y: 16 },
			{ x: 0, y: 16 },
			{ x: -16, y: 16 },
			{ x: -16, y: 0 }
		];
		for ( let point of Array.from( points ) ) {
			assert.equal( AABB.intersectPoint( aabb,  point ), null );
		}
	} );
	it( 'intersectPoint should return hit when colliding', function () {
		let aabb = { position: { x: 0, y: 0 }, half: { x: 8, y: 8 } };
		let point = { x: 4, y: 4 };
		let hit = AABB.intersectPoint( aabb,  point );
		assert.notEqual( hit, null );
		assert.ok( hit instanceof Hit );
	} );
	it( 'intersectPoint should set hit.position and normal to nearest edge of box', function () {
		let aabb = { position: { x: 0, y: 0 }, half: { x: 8, y: 8 } };
		let hit = AABB.intersectPoint( aabb,  { x: -4, y: -2 } );
		assertAlmostEqual( hit.position.x, -8 );
		assertAlmostEqual( hit.position.y, -2 );
		assertAlmostEqual( hit.delta.x, -4 );
		assertAlmostEqual( hit.delta.y, 0 );
		assertAlmostEqual( hit.normal.x, -1 );
		assertAlmostEqual( hit.normal.y, 0 );
		hit = AABB.intersectPoint( aabb,  { x: 4, y: -2 } );
		assertAlmostEqual( hit.position.x, 8 );
		assertAlmostEqual( hit.position.y, -2 );
		assertAlmostEqual( hit.delta.x, 4 );
		assertAlmostEqual( hit.delta.y, 0 );
		assertAlmostEqual( hit.normal.x, 1 );
		assertAlmostEqual( hit.normal.y, 0 );
		hit = AABB.intersectPoint( aabb,  { x: 2, y: -4 } );
		assertAlmostEqual( hit.position.x, 2 );
		assertAlmostEqual( hit.position.y, -8 );
		assertAlmostEqual( hit.delta.x, 0 );
		assertAlmostEqual( hit.delta.y, -4 );
		assertAlmostEqual( hit.normal.x, 0 );
		assertAlmostEqual( hit.normal.y, -1 );
		hit = AABB.intersectPoint( aabb,  { x: 2, y: 4 } );
		assertAlmostEqual( hit.position.x, 2 );
		assertAlmostEqual( hit.position.y, 8 );
		assertAlmostEqual( hit.delta.x, 0 );
		assertAlmostEqual( hit.delta.y, 4 );
		assertAlmostEqual( hit.normal.x, 0 );
		assertAlmostEqual( hit.normal.y, 1 );
	} );
	it( 'intersectSegment should return null when not colliding', function () {
		let aabb = { position: { x: 0, y: 0 }, half: { x: 8, y: 8 } };
		assert.equal( AABB.intersectSegment( aabb, { x: -16, y: -16 }, { x: 32, y: 0 } ), null );
	} );
	it( 'intersectSegment should return hit when colliding', function () {
		let aabb = { position: { x: 0, y: 0 }, half: { x: 8, y: 8 } };
		let point = { x: -16, y: 4 };
		let delta = { x: 32, y: 0 };
		let hit = AABB.intersectSegment( aabb, point, delta );
		assert.notEqual( hit, null );
		assert.ok( hit instanceof Hit );
		let time = 0.25;
		assert.equal( hit.collider, aabb );
		assertAlmostEqual( hit.time, time );
		assertAlmostEqual( hit.position.x, point.x + ( delta.x * time ) );
		assertAlmostEqual( hit.position.y, point.y + ( delta.y * time ) );
		assertAlmostEqual( hit.delta.x, delta.x * time );
		assertAlmostEqual( hit.delta.y, delta.y * time );
		assertAlmostEqual( hit.normal.x, -1 );
		assertAlmostEqual( hit.normal.y, 0 );
	} );
	it( 'intersectSegment should set hit.time to zero when segment starts inside box', function () {
		let aabb = { position: { x: 0, y: 0 }, half: { x: 8, y: 8 } };
		let point = { x: -4, y: 4 };
		let delta = { x: 32, y: 0 };
		let hit = AABB.intersectSegment( aabb, point, delta );
		assertAlmostEqual( hit.time, 0 );
		assertAlmostEqual( hit.position.x, -4 );
		assertAlmostEqual( hit.position.y, 4 );
		assertAlmostEqual( hit.delta.x, 0 );
		assertAlmostEqual( hit.delta.y, 0 );
		assertAlmostEqual( hit.normal.x, -1 );
		assertAlmostEqual( hit.normal.y, 0 );
	} );
	it( 'intersectSegment should add padding to half size of box', function () {
		let aabb = { position: { x: 0, y: 0 }, half: { x: 8, y: 8 } };
		let point = { x: -16, y: 4 };
		let delta = { x: 32, y: 0 };
		let padding = 4;
		let hit = AABB.intersectSegment( aabb, point, delta, { x: padding, y: padding } );
		let time = 0.125;
		assert.equal( hit.collider, aabb );
		assertAlmostEqual( hit.time, time );
		assertAlmostEqual( hit.position.x, point.x + ( delta.x * time ) );
		assertAlmostEqual( hit.position.y, point.y + ( delta.y * time ) );
		assertAlmostEqual( hit.delta.x, delta.x * time );
		assertAlmostEqual( hit.delta.y, delta.y * time );
		assertAlmostEqual( hit.normal.x, -1 );
		assertAlmostEqual( hit.normal.y, 0 );
	} );
	it( 'intersectSegment should have consistent results in both directions', function () {
		// If moving from far away to the near edge of the box doesn't cause a
		// collision, then moving away from the near edge shouldn't either.
		let aabb = { position: { x: 0, y: 0 }, half: { x: 32, y: 32 } };
		let farPos = { x: 64, y: 0 };
		let farToNearDelta = { x: -32, y: 0 };
		assert.equal( AABB.intersectSegment( aabb, farPos, farToNearDelta ), null );
		let nearPos = { x: 32, y: 0 };
		let nearToFarDelta = { x: 32, y: 0 };
		assert.equal( AABB.intersectSegment( aabb, nearPos, nearToFarDelta ), null );
	} );
	it( 'intersectSegment should work when segment is axis aligned', function () {
		// When the segment is axis aligned, it will cause the near and far values
		// to be Infinity and -Infinity. Make sure that this case works.
		let aabb = { position: { x: 0, y: 0 }, half: { x: 16, y: 16 } };
		let pos = { x: -32, y: 0 };
		let delta = { x: 64, y: 0 };
		let hit = AABB.intersectSegment( aabb, pos, delta );
		assert.equal( hit.time, 0.25 );
		assert.equal( hit.normal.x, -1 );
		assert.equal( hit.normal.y, 0 );
	} );
	it( 'intersectAABB should return null when not colliding', function () {
		let aabb1 = { position: { x: 0, y: 0 }, half: { x: 8, y: 8 } };
		let aabb2 = { position: { x: 32, y: 0 }, half: { x: 8, y: 8 } };
		assert.equal( AABB.intersectAABB( aabb1, aabb2 ), null );
		aabb2.position = { x: -32, y: 0 };
		assert.equal( AABB.intersectAABB( aabb1, aabb2 ), null );
		aabb2.position = { x: 0, y: 32 };
		assert.equal( AABB.intersectAABB( aabb1, aabb2 ), null );
		aabb2.position = { x: 0, y: -32 };
		assert.equal( AABB.intersectAABB( aabb1, aabb2 ), null );
		aabb2.position = { x: 0, y: -32 };
		assert.equal( AABB.intersectAABB( aabb1, aabb2 ), null );
	} );
	it( 'intersectAABB should return null when edges are flush', function () {
		let aabb1 = { position: { x: 0, y: 0 }, half: { x: 8, y: 8 } };
		let aabb2 = { position: { x: 16, y: 0 }, half: { x: 8, y: 8 } };
		assert.equal( AABB.intersectAABB( aabb1, aabb2 ), null );
		aabb2.position = { x: -16, y: 0 };
		assert.equal( AABB.intersectAABB( aabb1, aabb2 ), null );
		aabb2.position = { x: 0, y: 16 };
		assert.equal( AABB.intersectAABB( aabb1, aabb2 ), null );
		aabb2.position = { x: 0, y: -16 };
		assert.equal( AABB.intersectAABB( aabb1, aabb2 ), null );
		aabb2.position = { x: 0, y: -16 };
		assert.equal( AABB.intersectAABB( aabb1, aabb2 ), null );
	} );
	it( 'intersectAABB should return hit when colliding', function () {
		let aabb1 = { position: { x: 0, y: 0 }, half: { x: 8, y: 8 } };
		let aabb2 = { position: { x: 8, y: 0 }, half: { x: 8, y: 8 } };
		let hit = AABB.intersectAABB( aabb1, aabb2 );
		assert.notEqual( hit, null );
		assert.ok( hit instanceof Hit );
	} );
	it( 'intersectAABB should set hit.position and hit.normal to nearest edge of box 1', function () {
		let aabb1 = { position: { x: 0, y: 0 }, half: { x: 8, y: 8 } };
		let aabb2 = { position: { x: 4, y: 0 }, half: { x: 8, y: 8 } };
		let hit = AABB.intersectAABB( aabb1, aabb2 );
		assertAlmostEqual( hit.position.x, 8 );
		assertAlmostEqual( hit.position.y, 0 );
		assertAlmostEqual( hit.normal.x, 1 );
		assertAlmostEqual( hit.normal.y, 0 );

		aabb2.position = { x: -4, y: 0 };
		hit = AABB.intersectAABB( aabb1, aabb2 );
		assertAlmostEqual( hit.position.x, -8 );
		assertAlmostEqual( hit.position.y, 0 );
		assertAlmostEqual( hit.normal.x, -1 );
		assertAlmostEqual( hit.normal.y, 0 );

		aabb2.position = { x: 0, y: 4 };
		hit = AABB.intersectAABB( aabb1, aabb2 );
		assertAlmostEqual( hit.position.x, 0 );
		assertAlmostEqual( hit.position.y, 8 );
		assertAlmostEqual( hit.normal.x, 0 );
		assertAlmostEqual( hit.normal.y, 1 );

		aabb2.position = { x: 0, y: -4 };
		hit = AABB.intersectAABB( aabb1, aabb2 );
		assertAlmostEqual( hit.position.x, 0 );
		assertAlmostEqual( hit.position.y, -8 );
		assertAlmostEqual( hit.normal.x, 0 );
		assertAlmostEqual( hit.normal.y, -1 );
	} );
	it( 'intersectAABB should set hit.delta to move box 2 out of collision', function () {
		let aabb1 = { position: { x: 0, y: 0 }, half: { x: 8, y: 8 } };
		let aabb2 = { position: { x: 4, y: 0 }, half: { x: 8, y: 8 } };
		let hit = AABB.intersectAABB( aabb1, aabb2 );
		assertAlmostEqual( hit.delta.x, 12 );
		assertAlmostEqual( hit.delta.y, 0 );
		aabb2.position.x += hit.delta.x;
		aabb2.position.y += hit.delta.y;
		assert.equal( AABB.intersectAABB( aabb1, aabb2 ), null );

		aabb2.position = { x: -4, y: 0 };
		hit = AABB.intersectAABB( aabb1, aabb2 );
		assertAlmostEqual( hit.delta.x, -12 );
		assertAlmostEqual( hit.delta.y, 0 );
		aabb2.position.x += hit.delta.x;
		aabb2.position.y += hit.delta.y;
		assert.equal( AABB.intersectAABB( aabb1, aabb2 ), null );

		aabb2.position = { x: 0, y: 4 };
		hit = AABB.intersectAABB( aabb1, aabb2 );
		assertAlmostEqual( hit.delta.x, 0 );
		assertAlmostEqual( hit.delta.y, 12 );
		aabb2.position.x += hit.delta.x;
		aabb2.position.y += hit.delta.y;
		assert.equal( AABB.intersectAABB( aabb1, aabb2 ), null );

		aabb2.position = { x: 0, y: -4 };
		hit = AABB.intersectAABB( aabb1, aabb2 );
		assertAlmostEqual( hit.delta.x, 0 );
		assertAlmostEqual( hit.delta.y, -12 );
		aabb2.position.x += hit.delta.x;
		aabb2.position.y += hit.delta.y;
		assert.equal( AABB.intersectAABB( aabb1, aabb2 ), null );

	} );
	it( 'sweepAABB should return sweep when not colliding', function () {
		let aabb1 = { position: { x: 0, y: 0 }, half: { x: 16, y: 16 } };
		let aabb2 = { position: { x: 64, y: -64 }, half: { x: 8, y: 8 } };
		let delta = { x: 0, y: 128 };
		let sweep = AABB.sweepAABB( aabb1, aabb2, delta );
		assert.ok( sweep instanceof Sweep );
		assert.ok( typeof sweep.position === 'object' );
		assert.equal( sweep.hit, null );
		assertAlmostEqual( sweep.position.x, aabb2.position.x + delta.x );
		assertAlmostEqual( sweep.position.y, aabb2.position.y + delta.y );
	} );
	it( 'sweepAABB should return sweep with sweep.hit when colliding', function () {
		let aabb1 = { position: { x: 0, y: 0 }, half: { x: 16, y: 16 } };
		let aabb2 = { position: { x: 0, y: -64 }, half: { x: 8, y: 8 } };
		let delta = { x: 0, y: 128 };
		let sweep = AABB.sweepAABB( aabb1, aabb2, delta );
		assert.ok( sweep instanceof Sweep );
		assert.ok( sweep.hit instanceof Hit );
		assert.ok( typeof sweep.position === 'object' );
	} );
	it( 'sweepAABB should place sweep.position at a non-colliding point', function () {
		let aabb1 = { position: { x: 0, y: 0 }, half: { x: 16, y: 16 } };
		let aabb2 = { position: { x: 0, y: -64 }, half: { x: 8, y: 8 } };
		let delta = { x: 0, y: 128 };
		let sweep = AABB.sweepAABB( aabb1, aabb2, delta );
		let time = 0.3125 - Collision.epsilon;
		assertAlmostEqual( sweep.time, time );
		assertAlmostEqual( sweep.position.x, aabb2.position.x + ( delta.x * time ) );
		assertAlmostEqual( sweep.position.y, aabb2.position.y + ( delta.y * time ) );
	} );
	it( 'sweepAABB should place sweep.hit.position on the edge of the box', function () {
		let aabb1 = { position: { x: 0, y: 0 }, half: { x: 16, y: 16 } };
		let aabb2 = { position: { x: 0, y: -64 }, half: { x: 8, y: 8 } };
		let delta = { x: 0, y: 128 };
		let sweep = AABB.sweepAABB( aabb1, aabb2, delta );
		let time = 0.3125;
		let direction = { x: delta.x, y: delta.y };
		normalize( direction );
		assertAlmostEqual( sweep.hit.time, time );
		assertAlmostEqual( sweep.hit.position.x, aabb2.position.x + ( delta.x * time ) + ( direction.x * aabb2.half.x ) );
		assertAlmostEqual( sweep.hit.position.y, aabb2.position.y + ( delta.y * time ) + ( direction.y * aabb2.half.y ) );
		assertAlmostEqual( sweep.hit.delta.x, delta.x * time );
		assertAlmostEqual( sweep.hit.delta.y, delta.y * time );
	} );
	it( 'sweepAABB should set sweep.hit.normal to normals of box 1', function () {
		let aabb1 = { position: { x: 0, y: 0 }, half: { x: 16, y: 16 } };
		let aabb2 = { position: { x: 0, y: -64 }, half: { x: 8, y: 8 } };
		let delta = { x: 0, y: 128 };
		let sweep = AABB.sweepAABB( aabb1, aabb2, delta );
		assertAlmostEqual( sweep.hit.normal.x, 0 );
		assertAlmostEqual( sweep.hit.normal.y, -1 );
	} );
	it( 'sweepAABB should not move when the start position is colliding', function () {
		let aabb1 = { position: { x: 0, y: 0 }, half: { x: 16, y: 16 } };
		let aabb2 = { position: { x: 0, y: -4 }, half: { x: 8, y: 8 } };
		let delta = { x: 0, y: 128 };
		let sweep = AABB.sweepAABB( aabb1, aabb2, delta );
		assertAlmostEqual( sweep.position.x, 0 );
		assertAlmostEqual( sweep.position.y, -4 );
		assertAlmostEqual( sweep.hit.time, 0 );
		assertAlmostEqual( sweep.hit.delta.x, 0 );
		assertAlmostEqual( sweep.hit.delta.y, 0 );
	} );
} );

function assertAlmostEqual( actual, expected, message ) {
	if ( Math.abs( actual - expected ) > 1e-8 ) {
		return assert.equal( actual, expected, message );
	}
}

/**
 * Normalize a point so it is in the same direction but in the range of [0..1].
 *
 * Modifies the point in place.
 *
 * @param {Point} point Point to normalize
 */
function normalize( point ) {
	var length = point.x * point.x + point.y * point.y;
	if ( length > 0 ) {
		length = Math.sqrt( length );
		const inverseLength = 1.0 / length;
		point.x *= inverseLength;
		point.y *= inverseLength;
	}
}
