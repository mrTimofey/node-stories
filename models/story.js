const Resource = require('../api/resource');

module.exports = class Story extends Resource {
	constructor() {
		super();
		this.schema({
			body: String
		});
	}

	static collectionName() {
		return 'stories';
	}
};