const ObjectId = require('mongodb').ObjectId;
var mongodb = class {
	getTableNames(db) {
		return db.listCollections();
	}
	createDatabase(db, name) {
		return "USE " + name ;
	}
	createTable(db, values) {
		var notNull = values.notNull, result = { data: {}};
		if (values.types.some((item)=>{return item != 'Varchar(100)'}) || 
				(values.id && values.id.length > 0) || notNull.length > 0) {
			var required = values.columns.filter((item, index)=>{ return notNull.indexOf(index) != -1});
			var props = {}, index = 0, type = "", desc = "", id = values.id, colType, titles = {}, 
				schema = { bsonType: "object"};
			for (var col of values.columns) {
				colType = values.types[index].trim(); 
				if (colType == "Float")  {
					type = "number"; 
					titles[col] = 0.0;
				} else if (colType == "Integer")  {
					type = "int"; 
					titles[col] = 0;
				} else if (colType == "Boolean")  {
					type = "bool"; 
					titles[col] = false;
				} else if (colType == "Date")  {
					type = "date"; 
					titles[col] = new Date();
				} else {
					type = "string"; 
					titles[col] = "Text here";
				}
				desc = required.indexOf(col) != -1 ? col + " must be " + type + " and is required.": 
							    col + " must be " + type +".";
				props[col] = { bsonType: type, description: desc };
				if (id == col) props[col]["uniqueItems"] = true;
				index++;
			}
			if (required.length > 0) schema["required"] = required;
			if (props) schema["properties"] = props;
			return  db.createCollection(values.name, {
				validator: {
					$jsonSchema: schema,
				}
			}).then((res, err) => {
						if (err) result.data.error = err;
						db.collection(values.name).insertOne(titles).then((res_in, err_in) => {
							if (err_in) result.data.error = err_in;
						});;
					});
		
		} else {
			var cols = values.columns, i = 0, titles = {};
			for (var col of cols) {
				 titles[col] = "";
			}
			return  db.createCollection(values.name).then((res, err) => {
						if (err) result.data.error = err;
						db.collection(values.name).insertOne(titles).then((res_in, err_in) => {
							if (err_in) result.data.error = err_in;
						});;
					});
		}
    }
	select(db, values) {
		if (values.columns) {
			var cols = values.columns.split(","), required = {_id: 0};
			for (var col of cols) required[col] = 1;
			return this.addOptions(db, values, {projection: required});
		} else {
			return db.collection(values.name[0]).find();
		}
	}
	dropTable(db, values) {
		return db.collection(values.name[0]).drop();
	}
	joinTables(db, values) {
		var _where = values.where ? JSON.parse(values.where) : {};
		var result = {data: {}}, index = -1;
		db.collection(values.name[0]).find(_where, {projection: {_id: 0}})
		                             .toArray((err, res) => {
			if (err) result.data.error = err;
			db.collection(values.name[1]).find({}, {projection: {_id: 0}})
									     .toArray((err_in, res_in) => {
				if (err_in) result.data.error = err_in;
				if (values.type == 'Full join') {
					result.data.ops = res;
					res_in.forEach((item, index) => {
						index = res.findIndex((i) => {
							return JSON.stringify(item) == JSON.stringify(i)
						});
						if (index == -1) result.data.ops.push(item);
					});
				} else if (values.type == 'Right join') {
					result.data.ops = res.filter((item) => {
						return res_in.findIndex((i) => {
							return JSON.stringify(item) == JSON.stringify(i)
						}) == -1;
					});
				} else if (values.type == 'Left join') {
					result.data.ops = res_in.filter((item) => {
						return res.findIndex((i) => { 
							return JSON.stringify(item) == JSON.stringify(i)
						}) == -1;
					});
				} else {
					result.data.ops = res_in.filter((item) => {
						return res.findIndex((i) => { 
							return JSON.stringify(item) == JSON.stringify(i)
						}) != -1;
					});
				}
			});
		});		
		return result;
	}
	copyTable(db, values) {
		var result = {data: {}}, src = values.name[1], dest = values.name[0],
			_copy = JSON.parse(JSON.stringify(values));
		_copy.name = [src];
		this.addOptions(db, _copy, {projection: {_id: 0}}).toArray((err, res) => {
			if (err) result.data.error = err;
			db.collection(dest).insertMany(res).then((res_in, err_in) => {
				if (err_in) result.data.error = err_in;
				result.data = res_in;
			});
		});
		return result;
	}
	addColumn(db, values) {		
		var col = {};
		col[values.columns] = null;
		return db.collection(values.name[0])
		         .updateMany({}, {$set: col}, {upsert: true, multi:true});
	}
    dropColumn(db, values) {
		var deleted = {}, result = {data: {}}, all_cols = values.all, 
			_rem = {}, index = -1;
		index = all_cols.indexOf("_id");
		all_cols.splice(index, 1);
		for (var col of values.columns) {
			deleted[col] = "";
			index = all_cols.indexOf(col);
			all_cols.splice(index, 1);
		}
		return db.collection(values.name[0]).updateMany({}, {$unset:deleted}, {multi:true})
				                            .then((res, err) => {
			if (err) result.data.error = err;
			for (var col of all_cols) _rem[col] = undefined;
			db.collection(values.name[0]).deleteMany(_rem).then((res_in, err_in) => {
				if (err_in) result.data.error = err_in;
				result.data.ops = [{}];
			});
		});
		return result;
	}
	count(db, values) {
		var group =  {_id: "$"+values.name[0], "ops": { $sum: 1 }};
		return this.arithmeticResult(db, values, group);	
	}
	average(db, values) {
		var group = {_id: 1, "ops": { $avg: ("$" + values.columns[0]) }};
		return this.arithmeticResult(db, values, group);
	}
	sum(db, values) {
		var group = {_id: 1, "ops": { $sum: ("$" + values.columns[0]) }};
		return this.arithmeticResult(db, values, group);
	}
	min(db, values) {
		var group = {_id: 1, "ops": { $min: ("$" + values.columns[0]) }};
		return this.arithmeticResult(db, values, group);
	}
	max(db, values) {
		var group = {_id: 1, "ops": { $max: ("$" + values.columns[0]) }};
		return this.arithmeticResult(db, values, group);
	}
	swapColumns(db, values) {
		var col1 = values.columns[0], col2 = values.columns[1], response;
		var rename1 = {}, rename2 = {'temp_column_name1':col2, 'temp_column_name2': col1};
		rename1[col1] = 'temp_column_name1';
		rename1[col2] = 'temp_column_name2';
		return db.collection(values.name[0]).updateMany({}, {$rename: rename1})
											.then((res, err) => {
			if (err) result.data.error = err;
			db.collection(values.name[0]).updateMany({}, {$rename: rename2})
										 .then((res_in, err_in) => {
				if (err_in) result.data.error = err_in;
			});
		});
	}
	insertRow(db, values) { 
		this.cast(values.columns);
		return db.collection(values.name[0]).insertMany([values.columns]);
	}
	updateRow(db, values) { 
		values.cols_original._id = ObjectId(values.cols_original._id);
		this.cast(values.cols_original);
		this.cast(values.cols_modified);
		return db.collection(values.name[0])
		         .updateMany(values.cols_original,{$set: values.cols_modified});
	}
	deleteRows(db, values) { 
		delete values.columns._id;
		this.cast(values.columns);
		return db.collection(values.name[0]).deleteOne(values.columns);
	}
	addOptions(db, values, options) {
		var collections = db.collection(values.name[0]), _on, _where;
		if (values.groupBy) {
			var group_by = JSON.parse(values.groupBy);
			collections = collections.aggregate([group_by])
			                         .project(options.projection);
		} else {
			_on = values.on ? JSON.parse(values.on) : {};
			_where = values.where ? JSON.parse(values.where) : {};
			collections = collections.find({ ..._on, ..._where},options);
			if (values.orderBy)  {
				var order_by = {};
				order_by[values.orderBy] = 1;
				collections = collections.sort(order_by);
			} 
		}
		return collections;
	}
	arithmeticResult(db, values, group) {
		var match;
		if (values.on) {match = JSON.parse(values.on);}
		if (values.where) {match = JSON.parse(values.where);}
		if (match)
			return db.collection(values.name[0]).aggregate([{$match:match}, {$group: group}]);
		else
			return db.collection(values.name[0]).aggregate([{$group: group}]);
	}
	cast(cols) {
		for (var key of Object.keys(cols)) {
			if (cols[key] && !isNaN(cols[key]) ) cols[key] = Number(cols[key]);
			else if (cols[key] && !isNaN(cols[key]) && !isNaN(new Date(cols[key]))) 
				cols[key] = new Date(cols[key]);
		}
	}
};
module.exports.mongodb = new mongodb();