const db = require('camo'),
	{ getValue, skippable } = require('indicative-utils');

// unique:users[,email][,user._id][,_id]
// check if there is any user with email = value excluding record with _id = user._id
module.exports = {
	async: true,
	validate(data, field, args, config) {
		const value = getValue(data, field);

		if (skippable(value, field, config)) return true;

		const checkCollection = args[0],
			checkField = args[1] || field,
			// exclude item itself from checking
			exclude = args[2],
			// exclusion field name
			excludeField = args[3] || '_id',
			conditions = { [checkField]: value };

		if (exclude) conditions[excludeField] = { $ne: exclude };
		return new Promise((resolve, reject) => {
			db.getClient().driver()[checkCollection]
				.findOne(conditions, { populate: false }, (err, item) => {
					if (err) return reject(err);
					resolve(!item);
				});
		});
	}
};