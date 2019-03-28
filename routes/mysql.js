var mysql = require('mysql'); 

const sql = require('../commands/sql.js').mysql;
const messages = require('../messages/messages.js');
const commons = require('./db.js').commons;

var client = null, pool = null;

var mysqlDB = class extends commons {
	connect(req, res) {
		var data = req.body, that = this;
		
		pool = mysql.createPool({
		  connectionLimit: data.preferences.maxTotal,
		  queueLimit: data.preferences.maxIdle,
		  acquireTimeout: data.preferences.maxWait*1000,
		  user: data.user.name,
		  host: data.preferences.hostAddress,
		  database: data.preferences.dbName,
		  password: data.user.password,
		  port: data.preferences.portNumber,
		});
		pool.getConnection((err, conn) => {
			if (err) {
				res.statusCode = 401;
				res.end(err.message);
			} else {
				client = conn;
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
			var fnName = data.fnName, transaction = data.transaction,
				  metadata = data.metadata;
			try {
				while(counter < params.length) {
					var p = params[counter];
					var response = { title: p.values.name, data: [],
									 message: messages[fnName](p.values)
								   };
					
					if (p.values.type == 'Full join') fnName = "fullJoin";
					var res_d = await new Promise((resolve, reject) => {
						client.query(sql[fnName](p.values), (err, result, fields) => {
							if (err) reject(err);
							var resp = [];
								if (typeof result == 'object' && result[0])
							for (var r of result) {
								resp.push(r);
							}
							resolve(resp);
						}
					);});
					
					if (res_d) {
						response.data = res_d;
					}
					
					if (metadata) {
						res_d = await new Promise((resolve, reject) => {
							client.query(sql.metadata(p.values.name), (err, result, fields) => {
								if (err) reject(err.sql);
								var resp = [], col1 = result[0], counter = 0;
								if (typeof result == 'object')
								for (var r of result) {
									if (r.COLUMN_NAME == col1.COLUMN_NAME && counter > 0) break;
									resp.push(r);
									counter++;
								}
								resolve(resp);
							});
						});
						
						response.metadata = res_d;
						res_d = await new Promise((resolve, reject) => {
							client.query(sql.id(p.values.name), (err, result, fields) => {
								if (err) reject(err.sql);
								var resp = [], col1 = result[0], counter = 0;
								if (typeof result == 'object')
								for (var r of result) {
									if (r.COLUMN_NAME == col1.COLUMN_NAME && counter > 0) break;
									resp.push(r);
									counter++;
								}
								resolve(resp);
							});
						});
					response.id = res_d;
					}
					
					if (transaction) {
						res_d = await new Promise((resolve, reject) => {
							client.query(sql.select({name: p.values.name}),
							(err, result, fields) => {
								if (err) reject(err.sql);
								var resp = [];
								if (typeof result == 'object')
								for (var r of result) {
									resp.push(r);
								}
								resolve(resp);
							}
						);});
						response.data = res_d;
						res_d = await new Promise((resolve, reject) => {
							client.query(sql.metadata(p.values.name),
							(err, result, fields) => {
								if (err) reject(err.sql);
								var resp = [], col1 = result[0], counter = 0;
								if (typeof result == 'object')
								for (var r of result) {
									if (r.COLUMN_NAME == col1.COLUMN_NAME && counter > 0) break;
									resp.push(r);
									counter++;
								}
								resolve(resp);
							});
						});
						response.metadata = res_d;
					}
					response_data.push(response);
					counter++;
				}
				res.end(JSON.stringify(response_data));
			} catch(e) {} 
		})().catch(err => {
			res.statusCode = 401;
			res.end(err.sqlMessage);
		});
	}
};
module.exports.mysql = new mysqlDB();