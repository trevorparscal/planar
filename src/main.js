/**
 * Planar.
 *
 * @namespace
 * @type {Object}
 */
window.Planar = {
	debug: true,
	getJSON: function( url ) {
		return new Promise( function ( resolve, reject ) {
			var xhr = new XMLHttpRequest();
			xhr.open( 'GET', url, true );
			xhr.responseType = 'json';
			xhr.onload = function () {
				var status = xhr.status;
				if ( status == 200 ) {
					resolve( xhr.response );
				} else {
					reject( status );
				}
			};
			xhr.send();
		} );
	}
};
