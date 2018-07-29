const polka = require('polka'),
	User = require('../models/user'),
	{ jsonBody, sendNotFound, sendError, sendJson, sendPermissionDenied } = require('./utils');

module.exports = ({ port, models, prefix = '/api/' }) => {
	const app = polka(),
		authRoute = prefix + 'auth';

	// middleware, extend request with current user data fetcher function
	app.use((req, res, next) => {
		req.loadUser = async () => {
			if (!req.hasOwnProperty('user'))
				req.user = await User.fromRequest(req);
			return req.user;
		};
		next();
	});

	// middleware, return 401 if user is not authorized
	app.use(async (req, res, next) => {
		if (req.path === authRoute || (await req.loadUser())) next();
		else sendError({ statusCode: 401, message: 'Authorization required' }, res);
	});

	// authentication route
	app.post(authRoute, async (req, res) => {
		try {
			const data = await User.authenticate(await jsonBody(req));
			sendJson({ res, data });
		}
		catch (err) {
			if (!err.statusCode) err.statusCode = 400;
			sendError(err, res);
		}
	});

	// current user data
	app.get(prefix + 'me', async (req, res) => {
		const user = await req.loadUser();
		sendJson({ res, data: user ? user.toProfileJSON() : null });
	});

	// auto create CRUD model routes
	models.forEach(Model => {
		// /api/users, /api/stories ...
		const basePath = prefix + Model.collectionName();

		// index
		if (Model.methods.includes('index')) app.get(basePath, async (req, res) => {
			if (!(await Model.allowIndex(req))) return sendPermissionDenied(res);
			sendJson({ res, data: (await Model.indexQuery(req)).map(item => item.toSafeJSON()) });
		});

		// single item
		if (Model.methods.includes('item')) app.get(basePath + '/:id', async (req, res) => {
			const item = await Model.itemQuery(req);
			if (!item) return sendNotFound(res);
			if (!(await item.allowShow(req))) return sendPermissionDenied(res);
			sendJson({ res, data: item.toSafeJSON() });
		});

		// create
		if (Model.methods.includes('create')) app.post(basePath, async (req, res) => {
			if (!(await Model.allowCreate(req))) return sendPermissionDenied(res);
			try {
				const body = await jsonBody(req),
					item = Model.create();
				item.fill(body);
				await item.fillFromRequest(req, body);
				await item.validateFields();
				await item.save();
				sendJson({ res, data: item.toSafeJSON() });
			}
			catch (err) {
				sendError(err, res);
			}
		});

		// update
		if (Model.methods.includes('update')) app.put(basePath + '/:id', async (req, res) => {
			const item = await Model.findOne({ _id: req.params.id });
			if (!item) return sendNotFound(res);
			if (!(await item.allowUpdate(req))) return sendPermissionDenied(res);
			try {
				const body = await jsonBody(req);
				item.fill(body);
				await item.fillFromRequest(req, body);
				await item.validateFields();
				await item.save();
				sendJson({ res, data: item.toSafeJSON() });
			}
			catch (err) {
				sendError(err, res);
			}
		});

		// delete
		if (Model.methods.includes('delete')) app.delete(basePath + '/:id', async (req, res) => {
			const item = await Model.findOne({ _id: req.params.id });
			if (!item) return sendNotFound(res);
			if (!(await item.allowDelete(req))) return sendPermissionDenied(res);
			await item.delete();
			res.end();
		});
	});

	app.listen(port);
	return app;
};