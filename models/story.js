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
		const conditions = {};
		if (req.query.user) conditions.user = req.query.user;
		return this.find(conditions, { populate: ['user']});
	}
};