const expect = chai.expect;

function createKeyboardEvent( type, keyCode ) {
	let event = new Event( type );
	event.keyCode = keyCode;
	return event;
}

describe( 'Input', function () {
	describe( 'Keyboard', function () {
		const element = document.createElement( 'div' ),
			keyboard = new Planar.Input.Keyboard( element ),
			codes = Planar.Input.Keyboard.codes;
		describe( '#keys', function () {
			it( 'should capture keydowns', function () {
				element.dispatchEvent( createKeyboardEvent( 'keydown', codes.A ) );
				expect( keyboard.keys[codes.A] ).to.equal( true );
			} );
			it( 'should capture keyups', function () {
				element.dispatchEvent( createKeyboardEvent( 'keyup', codes.A ) );
				expect( keyboard.keys[codes.A] ).to.equal( false );
			} );
		} );
	} );
} );
