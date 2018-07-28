const hash = require('password-hash'),
	Resource = require('../api/resource');

const TOKENS_LIMIT = 10;

function randomString(l = 60) {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-+=()$%&^#!@';
	let str = '';
	for (let i = 0; i < l; ++i) {
		const pos = Math.round(Math.random() * chars.length);
		str += chars.substring(pos, pos + 1);
	}
	return str;
}

module.exports = class User extends Resource {
	constructor() {
		super();
		this.schema({
			email: String,
			password: String,
			quota: Number,
			admin: {
				type: Boolean,
				default: false
			},
			tokens: [String]
		});
	}

	get visible() {
		return ['_id', 'email', 'admin'];
	}

	get fillable() {
		return ['email', 'password', 'password'];
	}

	get validationRules() {
		return {
			email: 'required|email|unique:users,email' + (this._id ? (',' + this._id) : ''),
			password: 'required|min:5'
		};
	}

	get validationMessages() {
		return {
			'password.min': '{{ field }} must be at least {{ argument.0 }} characters long'
		};
	}

	static async fromRequest(req) {
		const token = req.headers.authorization && req.headers.authorization.substr(7);
		if (!token) return null;
		return await this.findOne({ tokens: { $elemMatch: token } });
	}

	static async authenticate({ email, password }) {
		const user = await this.findOne({ email });
		if (user && hash.verify(password, user.password))
			return {
				user,
				token: await user.issueToken()
			};
		throw new Error('Wrong credentials');
	}

	async issueToken() {
		if (!this.tokens) this.tokens = [];
		const token = randomString();
		this.tokens.push(token);
		// limit
		if (this.tokens.length >= TOKENS_LIMIT)
			this.tokens = this.tokens.slice(this.tokens.length - TOKENS_LIMIT);
		await this.save();
		return token;
	}

	static async allowCreate(req) {
		const user = await req.loadUser();
		return user && user.admin;
	}

	async allowUpdate(req) {
		const user = await req.loadUser();
		return user && (user.admin || user._id === this._id);
	}

	async allowDelete(req) {
		return await this.allowUpdate(req);
	}

	preSave() {
		this.email = this.email.toString().toLowerCase();
		if (isNaN(this.quota)) this.quota = null;
		else {
			this.quota = parseInt(this.quota);
			if (this.quota <= 0) this.quota = null;
		}
		this.admin = !!this.admin;
		if (this.password && !hash.isHashed(this.password)) this.password = hash.generate(this.password);
	}

	async preDelete() {
		return await Promise.all(this.stories.map(story => story.delete()));
	}

	toProfileJSON() {
		return this.toJSON();
	}
};