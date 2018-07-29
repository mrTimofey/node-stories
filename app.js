const fs = require('fs'),
	{ connect } = require('camo'),
	{ validations } = require('indicative'),
	createApiServer = require('./api');

module.exports = async ({ port = 3000, dataFolder = 'data' }) => {
	fs.readdirSync(process.cwd() + '/validators')
		.forEach(fileName => {
			validations[fileName.replace(/\.js$/, '').split('-').join('_')] = require('./validators/' + fileName);
		});

	await connect(`nedb://${process.cwd()}/${dataFolder}`)
	const models = fs.readdirSync(process.cwd() + '/models').map(fileName => require('./models/' + fileName));
	// workaround to force database file creating
	for (const Model of models) Model.findOne();
	return createApiServer({ models, port });
};