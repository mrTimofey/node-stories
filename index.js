const port = process.env.port || 3000;

require('./app')(process.env).then(async app => {
	const User = require('./models/user'),
		admin = await User.findOne({ admin: true });
	if (!admin) {
		console.log('No administrators found, let me create one for you...');
		const data = {
			admin: true,
			email: 'admin@admin.com',
			password: 'secret'
		};
		await User.create(data).save();
		console.log(`New administrator created: email: ${data.email}, password: '${data.password}'`);
	}
	app.listen(port);
	console.log('App is ready on port ' + port);
});