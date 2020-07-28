const { execSync } = require('child_process'),
	createApp = require('../app'),
	Axios = require('axios'),
	User = require('../models/user'),
	Story = require('../models/story');

const DATA_FOLDER = 'data-test',
	DATA_FOLDER_ABS = process.cwd() + '/' + DATA_FOLDER,
	PORT = 8000;

let app;

const axios = Axios.create({
	baseURL: 'http://localhost:' + PORT + '/api/',
	validateStatus: status => status < 500,
	headers: {
		'Content-Type': 'application/json'
	}
});

beforeAll(async () => {
	execSync('rm -rf "' + DATA_FOLDER_ABS + '" && mkdir "' + DATA_FOLDER_ABS + '"');
	app = (await createApp({ dataFolder: DATA_FOLDER })).listen(PORT);
});

afterAll(() => {
	app.server.close();
	// wipe database
	execSync('rm -rf "' + DATA_FOLDER_ABS + '"');
});

// generate unique email on each call
function nextEmail() {
	if (!nextEmail.counter) nextEmail.counter = 0;
	return 'test@domain' + (nextEmail.counter++) + '.com';
}

async function createUser(data) {
	return await User.create({ password: '123456', ...data, email: nextEmail() }).save();
}

async function createUserAndAuthenticate(data = {}) {
	const password = 'password',
		user = await createUser({ password, ...data });
	return await axios.post('auth', { email: user.email, password });
}

async function createAdminAndAuthenticate() {
	return await createUserAndAuthenticate({ admin: true });
}

describe('Auth API', () => {
	test('POST /auth should return 400 on wrong credentials', async () => {
		const res = await axios.post('auth', {
			email: 'wrong@email.com',
			password: 'password'
		});
		expect(res.status).toBe(400);
	});
	test('POST /auth should return { user, token } on correct credentials', async () => {
		const res = await createUserAndAuthenticate();
		expect(res.status).toBe(200);
		expect(typeof res.data.token).toBe('string');
		expect(typeof res.data.user).toBe('object');
	});
	test('GET /me should return authorized user data', async () => {
		const authRes = await createUserAndAuthenticate(),
			res = await axios.get('me', {
				headers: { Authorization: 'Bearer ' + authRes.data.token }
			});
		expect(res.status).toBe(200);
		expect(res.data._id).toBe(authRes.data.user._id);
		expect(res.data.email).toBe(authRes.data.user.email);
		expect(res.data.tokens).toContain(authRes.data.token);
	});
});

describe('Users API', () => {
	test('GET /users should return 401 without authorization', async () => {
		const res = await axios.get('/users');
		expect(res.status).toBe(401);
	});
	test('GET /users should return 403 for non-admin', async () => {
		const authRes = await createUserAndAuthenticate(),
			res = await axios.get('users', {
				headers: { Authorization: 'Bearer ' + authRes.data.token }
			});
		expect(res.status).toBe(403);
	});
	test('GET /users should return user list for admin', async () => {
		const authRes = await createAdminAndAuthenticate(),
			res = await axios.get('users', {
				headers: { Authorization: 'Bearer ' + authRes.data.token }
			});
		expect(res.status).toBe(200);
		expect(Array.isArray(res.data)).toBe(true);
		expect(res.data[0]).toHaveProperty('_id');
		expect(res.data[0]).toHaveProperty('email');
	});
	test('POST /users should return 403 for non-admin', async () => {
		const authRes = await createUserAndAuthenticate(),
			res = await axios.post('users', { email: 'new-user@test.com', password: 'secret' }, {
				headers: { Authorization: 'Bearer ' + authRes.data.token }
			});
		expect(res.status).toBe(403);
	});
	test('POST /users should create new user for admin', async () => {
		const authRes = await createAdminAndAuthenticate(),
			email = 'new-user@test.com',
			res = await axios.post('users', { email, password: 'secret' }, {
				headers: { Authorization: 'Bearer ' + authRes.data.token }
			});
		expect(res.status).toBe(201);
		expect(res.data).toHaveProperty('_id');
		expect(res.data.email).toBe(email);
	});
	test('POST /users should return validation error data on invalid data', async () => {
		const authRes = await createAdminAndAuthenticate(),
			res = await axios.post('users', { email: 'invalid-email' }, {
				headers: { Authorization: 'Bearer ' + authRes.data.token }
			});
		expect(res.status).toBe(422);
		expect(res.data.errors
			.findIndex(item => item.field === 'email' && item.validation === 'email') > -1)
			.toBe(true);
		expect(res.data.errors
			.findIndex(item => item.field === 'password' && item.validation === 'required') > -1)
			.toBe(true);
	});
	test('GET /users/:id with existing :id should return user object for admin', async () => {
		const authRes = await createAdminAndAuthenticate(),
			user = await createUser(),
			res = await axios.get('users/' + user._id, {
				headers: { Authorization: 'Bearer ' + authRes.data.token }
			});
		expect(res.status).toBe(200);
		expect(res.data._id).toBe(user._id);
		expect(res.data.email).toBe(user.email);
	});
	test('GET /users/:id with non-existing :id should return 404 for admin', async () => {
		const authRes = await createAdminAndAuthenticate(),
			res = await axios.get('users/i-am-not-here', {
				headers: { Authorization: 'Bearer ' + authRes.data.token }
			});
		expect(res.status).toBe(404);
	});
	test('GET /users/:id with existing :id should return 403 for non-admin', async () => {
		const authRes = await createUserAndAuthenticate(),
			user = await createUser(),
			res = await axios.get('users/' + user._id, {
				headers: { Authorization: 'Bearer ' + authRes.data.token }
			});
		expect(res.status).toBe(403);
	});
	test('PUT /users/:id should update authorized user himself', async () => {
		const authRes = await createUserAndAuthenticate(),
			email = 'updated@email.com',
			res = await axios.put('users/' + authRes.data.user._id, { email }, {
				headers: { Authorization: 'Bearer ' + authRes.data.token }
			});
		expect(res.status).toBe(200);
		expect(res.data._id).toBe(authRes.data.user._id);
		expect(res.data.email).toBe(email);
	});
	test('PUT /users/:id should return 403 for user other than authorized one (non-admin)', async () => {
		const authRes = await createUserAndAuthenticate(),
			otherUser = await User.findOne({ $not: { _id: authRes.data.user._id } }),
			email = 'updated@email.com',
			res = await axios.put('users/' + otherUser._id, { email }, {
				headers: { Authorization: 'Bearer ' + authRes.data.token }
			});
		expect(res.status).toBe(403);
	});
	test('PUT /users/:id should update user for user other than authorized one (admin)', async () => {
		const authRes = await createAdminAndAuthenticate(),
			otherUser = await User.findOne({ $not: { _id: authRes.data.user._id } }),
			email = 'updated-by-admin@email.com',
			res = await axios.put('users/' + otherUser._id, { email }, {
				headers: { Authorization: 'Bearer ' + authRes.data.token }
			});
		expect(res.status).toBe(200);
		expect(res.data._id).toBe(otherUser._id);
		expect(res.data.email).toBe(email);
	});
});

describe('Stories API', () => {
	test('GET /stories should return 401 without authorization', async () => {
		const res = await axios.get('/stories');
		expect(res.status).toBe(401);
	});
	test('GET /stories should return only authorized user\'s stories for non-admin', async () => {
		let authRes;
		// just create 3 different users with 2 stories per each
		await Promise.all(Array(3).fill(true).map(async () => {
			authRes = await createUserAndAuthenticate();
			return await Array(2).fill(true).map(async () => {
				return await axios.post('stories', { body: 'Test story' }, {
					headers: { Authorization: 'Bearer ' + authRes.data.token }
				});
			});
		}));
		// fetch stories and check their author
		const { data: stories } = await axios.get('stories', {
			headers: { Authorization: 'Bearer ' + authRes.data.token }
		});
		expect(stories.find(story => story.user._id !== authRes.data.user._id)).toBeUndefined();
	});
	test('GET /stories should return all stories for admin', async () => {
		// just create 3 different users with 2 stories per each
		await Promise.all(Array(3).fill(true).map(async () => {
			const authRes = await createUserAndAuthenticate();
			return await Array(2).fill(true).map(async () => {
				return await axios.post('stories', { body: 'Test story' }, {
					headers: { Authorization: 'Bearer ' + authRes.data.token }
				});
			});
		}));
		const authRes = await createAdminAndAuthenticate(),
			{ data: stories } = await axios.get('stories', {
				headers: { Authorization: 'Bearer ' + authRes.data.token }
			});
		expect(stories.length === (await Story.count())).toBe(true);
	});
	test('POST /stories should create new story owned by authorized user', async () => {
		const authRes = await createUserAndAuthenticate(),
			body = 'Test story',
			res = await axios.post('stories', { body }, {
				headers: { Authorization: 'Bearer ' + authRes.data.token }
			});
		expect(res.status).toBe(201);
		expect(authRes.data.user._id === res.data.user._id).toBe(true);
		expect(res.data.body).toBe(body);
	});
	test('PUT /stories/:id should return 403 for non-owner non-admin user', async () => {
		let authRes = await createUserAndAuthenticate();
		const { data: story } = await axios.post('stories', { body: 'Test story' }, {
			headers: { Authorization: 'Bearer ' + authRes.data.token }
		});
		authRes = await createUserAndAuthenticate();
		const res = await axios.put('stories/' + story._id, { body: 'Updated story' }, {
			headers: { Authorization: 'Bearer ' + authRes.data.token }
		});
		expect(res.status).toBe(403);
	});
	test('PUT /stories/:id should update story for owner non-admin user', async () => {
		const authRes = await createUserAndAuthenticate(),
			{ data: story } = await axios.post('stories', { body: 'Test story' }, {
				headers: { Authorization: 'Bearer ' + authRes.data.token }
			}),
			body = 'Updated story',
			res = await axios.put('stories/' + story._id, { body }, {
				headers: { Authorization: 'Bearer ' + authRes.data.token }
			});
		expect(res.status).toBe(200);
		expect(res.data._id).toBe(story._id);
		expect(res.data.body).toBe(body);
	});
	test('PUT /stories/:id should update story for non-owner admin user', async () => {
		let authRes = await createUserAndAuthenticate();
		const { data: story } = await axios.post('stories', { body: 'Test story' }, {
			headers: { Authorization: 'Bearer ' + authRes.data.token }
		});
		authRes = await createAdminAndAuthenticate();
		const body = 'Updated story',
			res = await axios.put('stories/' + story._id, { body }, {
				headers: { Authorization: 'Bearer ' + authRes.data.token }
			});
		expect(res.status).toBe(200);
		expect(res.data._id).toBe(story._id);
		expect(res.data.body).toBe(body);
	});
});

describe('Stories quota', () => {
	test('PUT /users/:id with { quota } and should do nothing for non-admin user himself', async () => {
		const authRes = await createUserAndAuthenticate(),
			res = await axios.put('users/' + authRes.data.user._id, { quota: 10 }, {
				headers: { Authorization: 'Bearer ' + authRes.data.token }
			}),
			freshUser = await User.findOne({ _id: authRes.data.user._id });
		expect(res.status).toBe(200);
		expect(res.data).not.toHaveProperty('quota');
		expect(freshUser).toHaveProperty('quota');
		expect(freshUser.quota).toBeFalsy();
	});
	test('PUT /users/:id with { quota } should properly modify quota for admin', async () => {
		const victim = await createUser(),
			quota = 10,
			authRes = await createAdminAndAuthenticate(),
			res = await axios.put('users/' + victim._id, { quota }, {
				headers: { Authorization: 'Bearer ' + authRes.data.token }
			});
		expect(victim.quota).toBeFalsy();
		expect(res.status).toBe(200);
		expect(res.data._id).toBe(victim._id);
		expect(res.data.quota).toBe(quota);
	});
	test('POST /stories should work for user with undefined (by default) quota', async () => {
		const authRes = await createUserAndAuthenticate(),
			count = 5;
		expect(authRes.data.user.quota).toBeFalsy();
		let created = 0;
		for (let i = 0; i < count; ++i) {
			const res = await axios.post('/stories', { body: 'Awesome story' }, {
				headers: { Authorization: 'Bearer ' + authRes.data.token }
			});
			if (res.status === 201) ++created;
		}
		expect(created).toBe(count);
	});
	test('POST /stories should not work for user with quota = 0', async () => {
		const authRes = await createUserAndAuthenticate({ quota: 0 }),
			count = 5;
		expect(authRes.data.user.quota).toBe(0);
		let denied = 0;
		for (let i = 0; i < count; ++i) {
			const res = await axios.post('/stories', { body: 'Awesome story' }, {
				headers: { Authorization: 'Bearer ' + authRes.data.token }
			});
			if (res.status === 403) ++denied;
		}
		expect(denied).toBe(count);
	});
	test('POST /stories should not allow user to create more stories than quota', async () => {
		const quota = 5,
			overQuota = 3,
			authRes = await createUserAndAuthenticate({ quota });
		expect(authRes.data.user.quota).toBe(quota);
		let denied = 0;
		for (let i = 0; i < quota + overQuota; ++i) {
			const res = await axios.post('/stories', { body: 'Awesome story' }, {
				headers: { Authorization: 'Bearer ' + authRes.data.token }
			});
			if (res.status === 403) ++denied;
		}
		expect(denied).toBe(overQuota);
	});
});