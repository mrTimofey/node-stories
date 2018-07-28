const db = require('camo');

// unique:users[,email][,user._id][,_id]
// check if there is any user with email = value excluding record with _id = user._id
module.exports = (data, field, message, args, get) => {
	const value = get(data, field),
		checkCollection = args[0],
		checkField = args[1] || field,
		// exclude item itself from checking
		exclude = args[2],
		// exclusion field name
		excludeField = args[3] || '_id',
		conditions = { [checkField]: value };
	if (exclude) conditions[excludeField] = { $ne: exclude };
	return new Promise((resolve, reject) => {
		if (!value) return resolve();
		db.getClient().driver()[checkCollection]
			.findOne(conditions, { populate: false }, (err, item) => {
				if (err) throw err;
				if (item) reject('unique constraint failed for ' + field);
				else resolve();
			});
	});
};