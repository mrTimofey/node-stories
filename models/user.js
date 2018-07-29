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

	/**
	 * Try to fetch authorized user.
	 * @param {Object} req request object
	 * @returns {Promise<User|null>} user data or null
	 */
	static async fromRequest(req) {
		const token = req.headers.authorization && req.headers.authorization.substr(7);
		if (!token) return null;
		return await this.findOne({ tokens: { $elemMatch: token } });
	}

	/**
	 * Authenticate user by email and password.
	 * @param {string} email email
	 * @param {string} password password
	 * @returns {Promise<{user: User, token: string}>} user data and token
	 * @throws {Error} wrong credentials
	 */
	static async authenticate({ email, password }) {
		const user = await this.findOne({ email });
		if (user && hash.verify(password, user.password))
			return {
				user,
				token: await user.issueToken()
			};
		throw new Error('Wrong credentials');
	}

	/**
	 * Generate and store new authorization token for this user.
	 * @returns {Promise<string>} generated token
	 */
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

	static async allowIndex(req) {
		const user = await req.loadUser();
		return user && user.admin;
	}

	static async allowCreate(req) {
		return await this.allowIndex(req);
	}

	async allowShow(req) {
		const user = await req.loadUser();
		return user && user.admin || user._id === this._id;
	}

	async allowUpdate(req) {
		return await this.allowShow(req);
	}

	async allowDelete(req) {
		return await this.allowUpdate(req);
	}

	async fillFromRequest(req, body) {
		const user = await req.loadUser();
		// let admin modify some restricted data
		if (user && user.admin) {
			if (body.hasOwnProperty('quota')) this.quota = body.quota;
			// set admin role but don't let user himself to mess things up
			if (body.hasOwnProperty('admin') && user._id !== this._id) this.admin = body.admin;
		}
	}

	preSave() {
		// normalize email
		this.email = this.email.toString().toLowerCase();
		// ensure quota to be null or number
		if (isNaN(this.quota)) this.quota = null;
		else {
			this.quota = parseInt(this.quota);
			if (this.quota < 0) this.quota = null;
		}
		// ensure boolean value
		this.admin = !!this.admin;
		// hash new password
		if (this.password && !hash.isHashed(this.password)) this.password = hash.generate(this.password);
	}

	preDelete() {
		// delete all stories of this user
		return require('./story').deleteMany({ user: this._id });
	}

	/**
	 * Reveal user's own data.
	 * @returns {Object} user data
	 */
	toProfileJSON() {
		return this.toJSON();
	}
};