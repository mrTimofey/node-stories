/**
 * Send JSON response.
 * @param {Object} res response object
 * @param {any} data data to send
 * @param {Number} status http status code, default 200
 * @param {Object} headers http headers
 * @returns {undefined}
 */
exports.sendJson = ({ res, data, status = 200, headers = {} }) => {
	headers['Content-Type'] = 'application/json';
	res.writeHead(status, headers);
	res.end(JSON.stringify(data));
};

/**
 * Send 404 response.
 * @param {Object} res response object
 * @returns {undefined}
 */
exports.sendNotFound = res => {
	res.writeHead(404);
	res.end('Not Found');
};

/**
 * Send 403 response.
 * @param {Object} res response object
 * @returns {undefined}
 */
exports.sendPermissionDenied = res => {
	res.writeHead(403);
	res.end('Permission denied');
};

/**
 * Send error response based on error object with optional `statusCode` field.
 * @param {Error|{statusCode:Number}|String|Array} err error object or message or validation errors array
 * @param {Object} res response object
 * @returns {undefined}
 */
exports.sendError = (err, res) => {
	// validation error
	if (Array.isArray(err)) exports.sendJson({ res, status: 422, data: { errors: err } });
	// any other error
	else {
		res.writeHead(err.statusCode || 500);
		res.end(typeof error === 'string' ? err : (err.message || 'Error'));
	}
};

/**
 * Parse request body as a JSON object.
 * @param {Object} req request object
 * @returns {Promise<any>} parsed JSON data
 */
exports.jsonBody = async req => {
	return await new Promise((resolve, reject) => {
		let body = [];
		req.on('data', piece => body.push(piece));
		req.on('end', () => {
			try {
				resolve(JSON.parse(body.join()));
			}
			catch(err) {
				err.statusCode = err instanceof SyntaxError ? 400 : 500;
				err.message = 'Couldn\'t parse request body';
				reject(err);
			}
		});
	});
};