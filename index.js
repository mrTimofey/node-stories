require('./app')(process.env).then(async () => {
	const User = require('./models/user'),
		admin = await User.findOne({ admin: true });
	if (!admin) {
		console.log('No administrators found, let me create one for you...');
		const data = {
				admin: true,
				email: 'admin@admin.com',
				password: 'secret'
			},
			newAdmin = await User.create(data).save();
		console.log(`New administrator created: email: ${data.email}, password: '${data.password}'`);
	}
	console.log('App is ready');
});