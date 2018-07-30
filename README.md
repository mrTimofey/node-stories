# Users and their stories

Node.js based REST API with users, their stories and quota management.

Involved npm packages:
* `nedb` as an embeddable database
* `camo` - ODM for `nedb`
* `indicative` - declarative validation library
* `password-hash` - guess what
* `polka` - lightweight express-like web server
* `jest`, `axios` for API tests
* `eslint` for code quality

## Prerequisites

You only need `node >= 9.11.2` and `npm >= 6.2.0` (may be less but not tested).

## Commands

* `npm test` - run tests
* `npm start` - start API server on port 3000
* `npm run wipe` - clean database

## Quick start

```
npm i
npm start
```

First administrator user will be created automatically
if you start the API server without any administrators created.

Initial credentials: email `admin@admin.com`, password `secret`

**It is strongly recommended to change these credentials ASAP.**

## Configuration

The application can be configured with the following environment variables:
* PORT - application port, default `3000`
* DATA_FOLDER - NeDB database files relative to `process.env()`, default `data`.

Run application with your configuration:
```
PORT=8000 DATA_FOLDER=test-data node index
```

## Project structure

* \_\_tests\_\_ - tests folder
* api - api server related sources
	* index.js - server initialization and routes
	* resource.js - Resource class which extends ODM with API resource logic
	* utils.js - useful server functions
* data - NeDB database files default location
* models - ODM models/API resources, blueprints for API routes
* validators - custom validation rules, automatically exposed into `indicative.validators`
* app.js - application setup sources
* index.js - application entry point
* swagger.yml - API documentation