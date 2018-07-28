const Resource = require('../api/resource'),
	User = require('./user');

module.exports = class Story extends Resource {
	constructor() {
		super();
		this.schema({
			body: String,
			user: {
				type: User,
				required: true
			}
		});
	}

	static collectionName() {
		return 'stories';
	}

	static indexQuery(req) {
		return this.find({}, { populate: ['user'] });
	}
};