const { Document } = require('camo'),
	{ validateAll } = require('indicative');

/**
 * Resource is a model containing additional logic related to REST API including:
 * - available API methods
 * - API visible attributes
 * - API fillable attributes
 * - declarative validation description
 * - index/item query building
 * - permission management
 */
module.exports = class Resource extends Document {
	/**
	 * Exposed API methods.
	 * @returns {string[]} array of methods
	 */
	static get methods() {
		return ['index', 'item', 'create', 'update', 'delete'];
	}

	/**
	 * Validation rules used in create/update API methods.
	 * @returns {Object} { [fieldName]: 'rule1|rule2...' }
	 * @see https://indicative.adonisjs.com/
	 */
	get validationRules() {
		return {};
	}

	/**
	 * Validation messages used to provide human readable information about a validation failure.
	 * @returns {Object} { `${fieldName}.${validationRule}`: 'validation failed on field {{ field }}' }
	 * @see https://indicative.adonisjs.com/
	 */
	get validationMessages() {
		return {};
	}

	/**
	 * Public API fields visible for everyone.
	 * @returns {boolean|string[]} true for all fields or array of field names
	 */
	get visible() {
		return true;
	}

	/**
	 * Only these fields are filled on create/update API methods.
	 * @returns {boolean|string[]} true for all fields or array of field names
	 */
	get fillable() {
		return true;
	}

	/**
	 * Build query for index request.
	 * @param {Object} req request object
	 * @returns {Promise} query promise
	 */
	static indexQuery(req) {
		return this.find({}, { populate: false });
	}

	/**
	 * Build query for single item request.
	 * @param {Object} req request object
	 * @returns {Promise} query promise
	 */
	static itemQuery(req) {
		return this.findOne({ _id: req.params.id });
	}

	/**
	 * Index query security check.
	 * @param {Object} req request object
	 * @returns {boolean|Promise<boolean>} allowed
	 * @throws {{ statusCode: number, message: string|undefined, jsonData: any||undefined }}
	 * 			alternatively error with status code and message/jsonData can be thrown
	 */
	static allowIndex(req) {
		return true;
	}

	/**
	 * Create request security check.
	 * @param {Object} req request object
	 * @returns {boolean|Promise<boolean>} allowed
	 * @throws {{ statusCode: number, message: string|undefined, jsonData: any||undefined }}
	 * 			alternatively error with status code and message/jsonData can be thrown
	 */
	static allowCreate(req) {
		return true;
	}

	/**
	 * Single item request security check.
	 * @param {Object} req request object
	 * @returns {boolean|Promise<boolean>} allowed
	 * @throws {{ statusCode: number, message: string|undefined, jsonData: any||undefined }}
	 * 			alternatively error with status code and message/jsonData can be thrown
	 */
	allowShow(req) {
		return true;
	}

	/**
	 * Update request security check.
	 * @param {Object} req request object
	 * @returns {boolean|Promise<boolean>} allowed
	 * @throws {{ statusCode: number, message: string|undefined, jsonData: any||undefined }}
	 * 			alternatively error with status code and message/jsonData can be thrown
	 */
	allowUpdate(req) {
		return true;
	}

	/**
	 * Delete request security check.
	 * @param {Object} req request object
	 * @returns {boolean|Promise<boolean>} allowed
	 * @throws {{ statusCode: number, message: string|undefined, jsonData: any||undefined }}
	 * 			alternatively error with status code and message/jsonData can be thrown
	 */
	allowDelete(req) {
		return true;
	}

	/**
	 * Validate fields.
	 * @returns {Promise} everything OK
	 * @throws {{ field: string, validation: string, message: string }[]} array of validation errors
	 */
	async validateFields() {
		return await validateAll(this.toJSON(), this.validationRules, this.validationMessages);
	}

	/**
	 * Fill object with data, API safe.
	 * @param {Object} data { [fieldName]: value }
	 * @returns {undefined}
	 */
	fill(data) {
		const fillableFields = this.fillable === true ?
			Object.keys(data) :
			Object.keys(data).filter(name => this.fillable.includes(name));
		for (const name of fillableFields) this[name] = data[name];
	}

	/**
	 * Optionally fill some additional data based on request and JSON request body data.
	 * @param {Object} req request object
	 * @param {Object} body request body object
	 * @returns {undefined|Promise} method can be async
	 */
	fillFromRequest(req, body) {
		//
	}

	/**
	 * Return API safe resource representation.
	 * @returns {Object} data
	 */
	toSafeJSON() {
		const safeObj = {},
			visibleFields = this.visible === true ?
				Object.keys(this).filter(name => name === '_id' || !name.startsWith('_')) :
				this.visible;
		for (const name of visibleFields) if (this.hasOwnProperty(name))
			safeObj[name] = this[name] instanceof Resource ? this[name].toSafeJSON() : this[name];
		return safeObj;
	}

	/**
	 * JSON representation for API index.
	 * @param {Object} req request object
	 * @returns {Object} data
	 */
	toListJSON(req) {
		return this.toSafeJSON();
	}

	/**
	 * JSON representation for API single item response (can be async).
	 * @param {Object} req request object
	 * @returns {Object|Promise<Object>} data
	 */
	toDetailedJSON(req) {
		return this.toSafeJSON();
	}
};