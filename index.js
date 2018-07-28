const fs = require('fs'),
	{ connect } = require('camo'),
	{ validations } = require('indicative');

fs.readdirSync(process.cwd() + '/validators')
	.forEach(fileName => {
		validations[fileName.replace(/\.js$/, '').split('-').join('_')] = require('./validators/' + fileName);
	});

connect(`nedb://${process.cwd()}/data`).then(() => {
	const models = fs.readdirSync(process.cwd() + '/models').map(fileName => require('./models/' + fileName));
	// workaround to force database file creating
	for (const Model of models) Model.findOne();
	require('./api')({
		models,
		port: process.env.PORT
	});
	console.log('API is ready');
}).catch(err => {
	console.log(err);
});