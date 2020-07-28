const db = require('camo'),
	{ getValue, skippable } = require('indicative-utils');

// exists:users[,field]
// check database record existence
module.exports = {
	async: true,
	validate(data, field, args, config) {
		const value = getValue(data, field);

		if (skippable(value, field, config)) return Promise.resolve(true);

		const checkCollection = args[0],
			checkField = args[1] || '_id';

		return new Promise((resolve, reject) => {
			db.getClient().driver()[checkCollection]
				.findOne({ [checkField]: value }, { populate: false }, (err, item) => {
					if (err) return reject(err);
					resolve(!!item);
				});
		});
	}
};