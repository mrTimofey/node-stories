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

	get visible() {
		return true;
	}

	get fillable() {
		return true;
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

	allowShow(req) {
		return true;
	}

	allowUpdate(req) {
		return true;
	}

	allowDelete(req) {
		return true;
	}

	async validateFields() {
		return await validateAll(this.toJSON(), this.validationRules, this.validationMessages);
	}

	fill(data) {
		const fillableFields = this.fillable === true ?
			Object.keys(data) :
			Object.keys(data).filter(name => this.fillable.includes(name));
		for (const name of fillableFields) this[name] = data[name];
	}


	fillFromRequest(req, body) {
		//
	}

	toSafeJSON() {
		const safeObj = {},
			visibleFields = this.visible === true ?
				Object.keys(this).filter(name => name === '_id' || !name.startsWith('_')) :
				this.visible;
		for (const name of visibleFields) if (this.hasOwnProperty(name))
			safeObj[name] = this[name] instanceof Resource ? this[name].toSafeJSON() : this[name];
		return safeObj;
	}
};