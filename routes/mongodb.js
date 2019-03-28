const MongoClient = require('mongodb').MongoClient;
const commons = require('./db.js').commons;
const nosql = require('../commands/nosql.js').mongodb;
const messages = require('../messages/messages.js');

var client = null, dbName = 'mydb';

var mongoDB = class extends commons {
	connect(req, res) {
		var data = req.body.preferences, that = this,
			url = "mongodb://" + data.hostAddress + ":" + data.portNumber;
		dbName = data.dbName;
		MongoClient.connect(url, {useNewUrlParser: true, poolSize: data.maxTotal,
			keepAlive: data.maxWait*1000 }, (err, conn) => {
			if (err) {
				res.statusCode = 401;
				res.end(err.message);
			} else {
				client = conn;
				that._client = client;
				res.end();
			}
		});
	}	
	crud(req, res) {
		res.contentType("text/html");
		var data = req.body, params = data.params, 
			counter = 0, response_data = [], that = this;
		const db = client.db(dbName);
		(async () => {
			const fnName = data.fnName, transaction = data.transaction,
				  metadata = data.metadata;
			if (fnName == 'createDatabase') {
				var response = { message: messages.createDatabase("", "mongodb") };
				response_data.push(response);
				res.end(JSON.stringify(response_data));
				return;
			}
			try {
				while(counter < params.length) {
					var p = params[counter], res_d, 
					response = { title: p.values.name,
								 message: messages[fnName](p.values)
							   };
					res_d = await new Promise((resolve, reject) => {
						var result = nosql[fnName](db, p.values);
						if ( result && result.toArray) {
							result.toArray((err, res) => {
								if (err) reject(err);
								resolve(that.responseFormat(res));
							});
						} else if ( result && result.then) {
							result.then((res, err) => {
								if (err) reject(err);
								resolve(res);
							});
						} else {
							var timer = 0;
							var interval = setInterval(() => {
								if (result.data && result.data.ops) {
									resolve(that.responseFormat(result.data.ops));
									clearInterval(interval);
								} else if (result.data && result.data.error) {
									reject(result.data.error);
									clearInterval(interval);
								} else if (timer++ > 3000) {
									reject("request taking too long.");
									clearInterval(interval);
								}
							}, 10);
						}						
					});					
					
					if (res_d) {
						response.data = res_d.data;
						response.metadata = res_d.metadata;
					}
					
					if (transaction && (counter == params.length -1 || fnName == "select")) {
						var res_d = await new Promise((resolve, reject) => {
							var response = nosql.select(db,{name: p.values.name});
							response.toArray((err_in, res_in) => {
									if (err_in) reject(err_in);
									if (res_in) resolve(that.responseFormat(res_in));
									else resolve();
								}
							);
						});
						response.data = res_d.data;
						response.metadata = res_d.metadata;
						response_data = []
					}
					response_data.push(response);
					counter++;
				}
				res.end(JSON.stringify(response_data));
			} finally {
				db.close()
			}
		})().catch(err => {
			res.statusCode = 401;
			res.end(err.message);
		});
	}
	responseFormat(result) {
		if (!result || !result[0]) return {data:"", metadata: ""};
		var resp = [], mdata = [], metadata = [], keys;
		if (typeof result == 'object' && result[0])
			for (var r of result) {
				keys = Object.keys(r);
				for (var key of keys) {
					if (mdata.indexOf(key) == -1) mdata.push(key);
				}
				resp.push(r);
			}
		else if (typeof result == 'object' && result[0])
			for (var r of result) {
				resp.push([r.name]);
			}
		for (var d of mdata) {
			metadata.push({column_name: d, data_type: "text"});
		}
		return {data:resp, metadata: metadata};
	}
};
module.exports.mongodb = new mongoDB();