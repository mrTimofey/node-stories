const hash = require('password-hash'),
	Resource = require('../api/resource'),
	Story = require('./story');

module.exports = class User extends Resource {
	get validationRules() {
		return {
			email: 'required|email',
			password: 'required|min:5'
		};
	}

	get validationMessages() {
		return {
			'password.min': '{{ field }} must be at least {{ argument.0 }} characters long'
		};
	}

	constructor() {
		super();
		this.schema({
			email: String,
			password: String,
			quota: Number
		});
	}

	preSave() {
		if (this.password && !hash.isHashed(this.password)) this.password = hash.generate(this.password);
	}

	async preDelete() {
		return await Promise.all(this.stories.map(story => story.delete()));
	}
};