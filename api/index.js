const polka = require('polka'),
	{ jsonBody, sendNotFound, sendError, sendJson, sendPermissionDenied } = require('./utils');

module.exports = ({ models, port = 3000, prefix = '/api/' }) => {
	const app = polka();

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