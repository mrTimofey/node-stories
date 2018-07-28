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

	get fillable() {
		return ['body'];
	}

	get validationRules() {
		return {
			body: 'required'
		};
	}

	static collectionName() {
		return 'stories';
	}

	static indexQuery(req) {
		const conditions = {};
		if (req.query.user) conditions.user = req.query.user;
		return this.find(conditions, { populate: ['user']});
	}

	static async allowCreate(req) {
		// check user quota
		const user = await req.loadUser();
		if (!user || user.quota === 0) return false;
		if (user.quota === null) return true;
		const count = await this.count({ user: user._id });
		return user.quota > count;
	}

	allowUpdate(req) {
		return req.loadUser().then(user => user && (user.admin || user._id === (this.user._id || this.user)));
	}

	allowDelete(req) {
		return this.allowUpdate(req);
	}

	async fillFromRequest(req) {
		const user = await req.loadUser();
		this.user = user._id;
	}
};