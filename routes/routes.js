const databases = { postgresql : require('./postgresql.js').postgresql,
                    mysql: require('./mysql.js').mysql,
					mongodb: require('./mongodb.js').mongodb
				  };
				  
var sessionIds = {};

module.exports.login = (req, res) => {
	res.contentType("text/html");
	res.render("login");
	res.end();
};
module.exports.connect = (req, res) => {
	try {
		res.contentType("text/html");
		var data = req.body, vendor = data.user.dbVendor;
		databases[vendor.toLowerCase()].connect(req, res);
		res.on('finish', () => {
			if (res.statusCode == 200) 
				sessionIds[req.sessionID] = vendor.toLowerCase();
		});
	} catch(err) {
		res.redirect("/error")
	}
};
module.exports.crud = (req, res) => {
	try {
		var sess_id = req.sessionID;
		databases[sessionIds[sess_id]].crud(req, res);
	} catch(err) {
		res.redirect("/error")
	}
};
module.exports.explorer = (req, res, next) => {
	var sess_id = req.sessionID;
	res.contentType("text/html");
	if (sessionIds[sess_id]) {
		res.render("dbExplorer");
		res.end();
	} else {
		var err = new Error("Error");
		err.status = 401;
		next(err);
	}
};
module.exports.logout = (req, res, next) => {
	try {
		var sess_id = req.sessionID;
		databases[sessionIds[sess_id]].close();
		databases[sessionIds[sess_id]].logout(req, res);
		delete sessionIds[sess_id];
		req.session.destroy(()=>{});
	 } catch(err) {
		var err = new Error("Error");
		err.status = 500;
		next(err);
	 }
};
