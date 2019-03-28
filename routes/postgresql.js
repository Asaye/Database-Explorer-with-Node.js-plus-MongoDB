const { Pool, Client } = require('pg');
const sql = require('../commands/sql.js').postgresql;
const messages = require('../messages/messages.js');
const commons = require('./db.js').commons;

var client = null, pool = null;

var postgresqlDB = class extends commons {
	connect(req, res) {
		var data = req.body, that = this;
		pool = new Pool({
			max: data.preferences.maxTotal,
			idleTimeoutMillis: data.preferences.maxIdle*1000,
			user: data.user.name,
			host: data.preferences.hostAddress,
			database: data.preferences.dbName,
			password: data.user.password,
			port: data.preferences.portNumber,
		});
		pool.connect((err, conn) => {
			if (err) {
				res.statusCode = 401;
				res.end(err.message);
			} else {
				that._client = conn;
				res.end();
			}
		});
	}
	crud(req, res) {
		res.contentType("text/html");
		var data = req.body, params = data.params, 
			counter = 0, response_data = [];
		(async () => {
			const client = await pool.connect();
			const fnName = data.fnName, transaction = data.transaction,
				  metadata = data.metadata;
			try {
				while(counter < params.length) {
					var p = params[counter];
					var res_d = await client.query(sql[fnName](p.values));
					var response = { title: p.values.name,
									 message: messages[fnName](p.values)
								   };
					if (res_d.rows) {
						response.data = res_d.rows;
					}
					if (metadata) {
						res_d = await client.query(sql.metadata(p.values.name));
						response.metadata = res_d.rows;
						res_d = await client.query(sql.id(p.values.name));
						response.id = res_d.rows;
					}
					
					if (transaction) {
						res_d = await client.query(sql.select({name: p.values.name}));
						response.data = res_d.rows;
						res_d = await client.query(sql.metadata(p.values.name));
						response.metadata = res_d.rows;
					}
					response_data.push(response);
					counter++;
				}
				res.end(JSON.stringify(response_data));
			} catch (e) {}			
		})().catch(err => {
			res.statusCode = 401;
			res.end(err.message);
		});
	}
};
module.exports.postgresql = new postgresqlDB();