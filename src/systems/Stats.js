/**
 * Stats system.
 *
 * @class
 */
Planar.System.Stats = class extends Planar.System {
	/**
	 * @inheritdoc
	 */
	constructor() {
		super();
		this.stats = new Stats();
		document.body.appendChild( this.stats.dom );
	}

	/**
	 * @inheritdoc
	 */
	isRelated( entity ) {
		return false;
	}

	/**
	 * @inheritdoc
	 */
	update( delta ) {
		this.stats.begin();
		this.stats.end();
	}
};
