var express = require("express");
var bodyParser = require("body-parser");
var app =  express();
var router = express.Router();
var http = require('http');
var ejs = require('ejs');
var partials = require('express-partials');
var path = require('path');
var session = require('express-session');
const routes = require('./routes/routes');
var uuid = require('uuid/v1');
var crypto = require('crypto');
app.use(session({
	secret: 'db_explorer',
	resave: true,
	saveUninitialized: true
}));
app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());
app.set('port', process.env.PORT || 3000);
app.use(partials());
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname , '/static' )));

app.get('/', routes.login);
app.get('/explorer', routes.explorer);
app.post('/login', routes.connect);
app.post('/switch', function (req, res) {
	routes.connect(req, res);
});
app.get('/logout', routes.logout);
app.post('/crud', routes.crud);

app.use(function (err, req, res, next) {
	var data = {};
	if (err.status == 401) {
		data = { title: 'Unauthorized Login', status: 401, 
				 countdown: 5, message: 'Unauthorized Login attempt.'
				};
	} else if (err.status == 500) {
		data = { title: 'Server Error', status: 500, 
				 countdown: 5, message: 'Server Error.'
				};
	} else {
		data = { title: 'Page Not Found', status: 404, 
				 countdown: '', message: 'The requested page cannot be found.'
				};
	}
	res.render("error", data);
});
app.listen(app.get('port'), function() {
});