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

	static async indexQuery(req) {
		const conditions = {},
			user = await req.loadUser();
		// let admin filter by user
		if (user.admin) {
			if (req.query.user) conditions.user = req.query.user;
		}
		// non-admin users can see only their own stories
		else conditions.user = user._id;
		return this.find(conditions, { populate: ['user']});
	}

	static async allowCreate(req) {
		// check user quota
		const user = await req.loadUser();
		if (!user) return false;
		if (user.quota === 0)
			// eslint-disable-next-line
			throw { statusCode: 403, jsonData: { message: 'Permission denied', quota: 0 } };
		if (!user.quota) return true;
		const count = await this.count({ user: user._id });
		if (user.quota > count) return true;
		// eslint-disable-next-line
		throw { statusCode: 403, jsonData: { message: 'Quota exceeded', quota: user.quota, storiesCount: count } };
	}

	async allowUpdate(req) {
		const user = await req.loadUser();
		// only admin or story owner
		return user && (user.admin || user._id === (this.user._id || this.user));
	}

	allowDelete(req) {
		return this.allowUpdate(req);
	}

	async fillFromRequest(req) {
		// set current user as an author of this story
		if (!this.user) {
			const user = await req.loadUser();
			this.user = user._id;
		}
	}

	async postSave() {
		await this.populate('user');
	}
};