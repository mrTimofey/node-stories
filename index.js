require('./app')(process.env).then(() => {
	console.log('App is ready');
});