const db = require('camo');

// exists:users[,field]
// check database record existence
module.exports = (data, field, message, args, get) => {
	const value = get(data, field),
		checkCollection = args[0],
		checkField = args[1] || '_id';
	return new Promise((resolve, reject) => {
		if (!value) return resolve();
		db.getClient().driver()[checkCollection]
			.findOne({ [checkField]: value }, { populate: false }, (err, item) => {
				if (err) throw err;
				if (item) resolve();
				else reject(field + ' value doesn\'t exist');
			});
	});
};