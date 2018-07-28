const fs = require('fs'),
	{ connect } = require('camo');

connect(`nedb://${process.cwd()}/data`).then(() => {
	require('./api')({
		models: fs.readdirSync(process.cwd() + '/models').map(fileName => require('./models/' + fileName)),
		port: process.env.PORT
	});
	console.log('API is ready');
});