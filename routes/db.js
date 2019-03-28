module.exports.commons = class {
	constructor() {
		this._client = null;
	}
	dbSwitch(req) {
		this._client = null;
	};
	logout(req, res) {
		this._client = null;
		res.contentType("text/html");
		res.render("login");
		res.end();
	};
	close() {
		try {
			this._client.release();
		} catch(e) {
			this._client.close();
		}
	}
};