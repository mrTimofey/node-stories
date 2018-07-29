process.env.NODE_ENV = 'test';

const startApp = require('./app');

const app = startApp({
	dataFolder: 'test-data',
	port: 8080
});