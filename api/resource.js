const { Document } = require('camo'),
	{ validateAll } = require('indicative');

module.exports = class Resource extends Document {
	static get methods() {
		return ['index', 'item', 'create', 'update', 'delete'];
	}

	get validationRules() {
		return {};
	}

	get validationMessages() {
		return {};
	}

	static indexQuery(req) {
		return this.find({}, { populate: false });
	}

	static itemQuery(req) {
		return this.findOne({ _id: req.params.id });
	}

	static allowIndex(req) {
		return true;
	}

	static allowCreate(req) {
		return true;
	}

	async validateFields() {
		return await validateAll(this.toJSON(), this.validationRules, this.validationMessages);
	}

	allowShow(req) {
		return true;
	}

	allowUpdate(req) {
		return true;
	}

	allowDelete(req) {
		return true;
	}
};