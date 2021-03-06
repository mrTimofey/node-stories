const fs = require('fs'),
	{ connect } = require('camo'),
	{ extend } = require('indicative/validator'),
	createApiServer = require('./api');

module.exports = async ({ dataFolder = 'data' }) => {
	fs.readdirSync(process.cwd() + '/validators')
		.forEach(fileName => {
			extend(fileName.replace(/\.js$/, '').split('-').join('_'), require('./validators/' + fileName));
		});

	await connect(`nedb://${process.cwd()}/${dataFolder}`);
	const models = fs.readdirSync(process.cwd() + '/models').map(fileName => require('./models/' + fileName));
	// workaround to force database file creating
	await Promise.all(models.map(Model => Model.findOne()));
	return createApiServer({ models });
};