const polka = require('polka'),
	User = require('../models/user'),
	{ jsonBody, sendNotFound, sendError, sendJson, sendPermissionDenied } = require('./utils');

module.exports = ({ models, port = 3000, prefix = '/api/' }) => {
	const app = polka();

	// extend request with current user data fetcher function
	app.use((req, res, next) => {
		req.loadUser = async () => {
			if (!req.hasOwnProperty('user'))
				req.user = await User.fromRequest(req);
			return req.user;
		};
		next();
	});

	// authentication route
	app.post(prefix + 'auth', async (req, res) => {
		try {
			const data = await User.authenticate(await jsonBody(req));
			sendJson({ res, data });
		}
		catch(err) {
			if (!err.statusCode) err.statusCode = 400;
			sendError(err, res);
		}
	});

	// current user data
	app.get(prefix + 'me', async (req, res) => {
		sendJson({ res, data: await req.loadUser() });
	});

	// auto create CRUD model routes
	models.forEach(Model => {
		// /api/users, /api/stories ...
		const basePath = prefix + Model.collectionName();

		// index
		if (Model.methods.includes('index')) app.get(basePath, async (req, res) => {
			if (!Model.allowIndex(req)) return sendPermissionDenied(res);
			sendJson({ res, data: await Model.indexQuery(req) });
		});

		// single item
		if (Model.methods.includes('item')) app.get(basePath + '/:id', async (req, res) => {
			const item = await Model.itemQuery(req);
			if (!item.allowShow(req)) return sendPermissionDenied(res);
			if (!item) return sendNotFound(res);
			sendJson({ res, data: item });
		});

		// create
		if (Model.methods.includes('create')) app.post(basePath, async (req, res) => {
			if (!Model.allowCreate(req)) return sendPermissionDenied(res);
			try {
				const body = await jsonBody(req),
					item = Model.create();
				item.fill(body);
				await item.validateFields();
				await item.save();
				sendJson({ res, data: item });
			}
			catch(err) {
				sendError(err, res);
			}
		});

		// update
		if (Model.methods.includes('update')) app.put(basePath + '/:id', async (req, res) => {
			const item = await Model.findOne({ _id: req.params.id });
			if (!item) return sendNotFound(res);
			if (!item.allowUpdate(req)) return sendPermissionDenied(res);
			try {
				const body = await jsonBody(req);
				item.fill(body);
				await item.validateFields();
				await item.save();
				sendJson({ res, data: item });
			}
			catch(err) {
				sendError(err, res);
			}
		});

		// delete
		if (Model.methods.includes('delete')) app.delete(basePath + '/:id', async (req, res) => {
			const item = await Model.findOne({ _id: req.params.id });
			if (!item) return sendNotFound(res);
			if (!item.allowDelete(req)) return sendPermissionDenied(res);
			await item.delete();
			res.end();
		});
	});

	app.listen(port);
	return app;
};