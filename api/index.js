const polka = require('polka'),
	User = require('../models/user'),
	{ jsonBody, sendNotFound, sendError, sendJson, sendPermissionDenied } = require('./utils');

function onError(err, req, res, next) {
	sendError(err, res);
	if (!Array.isArray(err) && (!err.statusCode || err.statusCode >= 500)) console.log(err.stack || err);
	if (next) next();
}

// helper function to let error handler work with async functions
function wrapAsyncHandler(fn) {
	return (req, res) => new Promise(resolve => fn(req, res)
		.then(resolve)
		.catch(err => onError(err, req, res))
	);
}

module.exports = ({ models, prefix = '/api/' }) => {
	const app = polka({ onError, onNoMatch: (req, res) => sendNotFound(res) }),
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
		// bypass auth route
		if (req.path === authRoute || (await req.loadUser())) next();
		else sendError({ statusCode: 401, message: 'Authorization Required' }, res);
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

	// auto create CRUD for resources
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

		// create and update saving logic
		async function saveElement(req, res, body, item) {
			item.fill(body);
			await item.fillFromRequest(req, body);
			await item.validateFields();
			await item.save();
			sendJson({ res, data: item.toSafeJSON() });
		}

		// create
		if (Model.methods.includes('create')) app.post(basePath, async (req, res) => {
			if (!(await Model.allowCreate(req))) return sendPermissionDenied(res);
			const body = await jsonBody(req),
				item = Model.create();
			await saveElement(req, res, body, item);
		});

		// update
		if (Model.methods.includes('update')) app.put(basePath + '/:id', async (req, res) => {
			const item = await Model.findOne({ _id: req.params.id });
			if (!item) return sendNotFound(res);
			if (!(await item.allowUpdate(req))) return sendPermissionDenied(res);
			const body = await jsonBody(req);
			await saveElement(req, res, body, item);
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

	// patch all handlers to properly catch async errors in async functions
	for (const method of Object.keys(app.handlers)) for (const path of Object.keys(app.handlers[method])) {
		const fn = app.handlers[method][path];
		if (fn.constructor.name === 'AsyncFunction') app.handlers[method][path] = wrapAsyncHandler(fn);
	}

	return app;
};