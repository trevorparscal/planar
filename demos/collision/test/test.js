var assert = chai.assert,
	collision = new Collision();

describe( 'collision of', function () {
	it( 'two circles', function () {
		const circle1 = { position: { x: 0, y: 0 }, radius: 20 };
		const circle2 = { position: { x: 30, y: 0 }, radius: 20 };
		const response = new Collision.Response();
		const collided = collision.test( circle1, circle2, response );
		assert( collided, 'test is correct' );
		assert( response.overlap === 10, 'overlap is correct' );
		assert( response.overlapV.x === 10 && response.overlapV.y === 0, 'overlapV is correct' );
	} );

	it( 'circle and polygon', function () {
		const circle = { position: { x: 50, y: 50 }, radius: 20 };
		// A square
		const polygon = Collision.Polygon.create(
			{ x: 0, y: 0 },
			[
				{ x: 0, y: 0 },
				{ x: 40, y: 0 },
				{ x: 40, y: 40 },
				{ x: 0, y: 40 }
			]
		);
		const response = new Collision.Response();
		const collided = collision.test( polygon, circle, response );
		assert( collided, 'test is correct' );
		assert( response.overlap.toFixed( 2 ) == '5.86', 'overlap is correct' );
		assert(
			response.overlapV.x.toFixed( 2 ) == '4.14' &&
			response.overlapV.y.toFixed( 2 ) == '4.14',
			'overlapV is correct'
		);
	} );

	it( 'polygon and polygon', function () {
		// A square
		const polygon1 = Collision.Polygon.create(
			{ x: 0, y: 0 },
			[
				{ x: 0, y: 0 },
				{ x: 40, y: 0 },
				{ x: 40, y: 40 },
				{ x: 0, y: 40 }
			]
		);
		// A triangle
		const polygon2 = Collision.Polygon.create(
			{ x: 30, y: 0 },
			[
				{ x: 0, y: 0 },
				{ x: 30, y: 0 },
				{ x: 0, y: 30 }
			]
		);
		const response = new Collision.Response();
		const collided = collision.test( polygon1, polygon2, response );
		assert( collided, 'test is correct' );
		assert( response.overlap === 10, 'overlap is correct' );
		assert( response.overlapV.x === 10 && response.overlapV.y === 0, 'overlapV is correct' );
	} );
} );

describe( 'No collision between', function () {
	it( 'two boxes', function () {
		const box1 = Collision.Box.toPolygon( { position: { x: 0, y: 0 }, width: 20, height: 20 } );
		const box2 = Collision.Box.toPolygon( { position: { x: 100, y: 100 }, width: 20, height: 20 } );
		const collided = collision.test( box1, box2 );
	} );
} );

describe( 'Hit testing', function () {
	it( 'a circle', function () {
		const circle = { position: { x: 100, y: 100 }, radius: 20 };
		assert( !collision.hit( { x: 0, y: 0 }, circle ), 'test is correct' ); // false
		assert( collision.hit( { x: 110, y: 110 }, circle ), 'test is correct' ); // true
	} );
	it( 'a polygon', function () {
		const triangle = Collision.Polygon.create(
			{ x: 30, y: 0 },
			[
				{ x: 0, y: 0 },
				{ x: 30, y: 0 },
				{ x: 0, y: 30 }
			]
		);
		assert( !collision.hit( { x: 0, y: 0 }, triangle ), 'test is correct' ); // false
		assert( collision.hit( { x: 35, y: 5 }, triangle ), 'test is correct' ); // true
	} );
	it( 'a small polygon', function () {
		const v1 = { x: 1, y: 1.1 };
		const p1 = Collision.Polygon.create(
			{ x: 0, y: 0 },
			[
				{ x: 2, y: 1 },
				{ x: 2, y: 2 },
				{ x: 1, y: 3 },
				{ x: 0, y: 2 },
				{ x: 0, y: 1 },
				{ x: 1, y: 0 }
			]
		);
		assert( collision.hit( v1, p1 ), 'test is correct' );
	} );
} );
