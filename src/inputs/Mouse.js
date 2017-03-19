/**
 * Mouse input.
 *
 * @class
 */
Planar.Input.Mouse = class extends Planar.Input {
	/**
	 * @inheritdoc
	 */
	constructor( element ) {
		super( element );

		this.over = false;
		this.buttons = {};
		this.wheel = { x: 0, y: 0, z: 0 };
		this.position = { x: 0, y: 0 };

		this.element.addEventListener( 'mouseover', ( e ) => {
			this.over = true;
		} );
		this.element.addEventListener( 'mouseout', ( e ) => {
			this.over = false;
		} );
		this.element.addEventListener( 'mousedown', ( e ) => {
			this.buttons[e.button] = true;
		} );
		this.element.addEventListener( 'mouseup', ( e ) => {
			this.buttons[e.button] = false;
		} );
		this.element.addEventListener( 'wheel', ( e ) => {
			this.wheel.x += e.deltaX;
			this.wheel.y += e.deltaY;
			this.wheel.z += e.deltaZ;
		} );
		this.element.addEventListener( 'mousemove', ( e ) => {
			this.position.x = e.clientX;
			this.position.Y = e.clientY;
		} );
	}
};
