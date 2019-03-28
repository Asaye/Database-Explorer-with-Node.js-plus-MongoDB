
var sql = class {
	createDatabase(name) {
		return "CREATE DATABASE " + name + ";";
	}
	metadata(name) {
		return "SELECT column_name, data_type from "+
			    "information_schema.columns WHERE table_name = '" 
			    + name[0] + "';"
	}
	id(name) {
		return "SELECT column_name FROM information_schema.key_column_usage WHERE table_name='"
               + name +"';";
	}
	createTable(values) {
		var sql = "CREATE TABLE " + values.name + " ( ", 
			cols = values.columns, i = 0, notNull = values.notNull;
			for (var col of cols) {
				sql = sql + " " + col + " " + values.types[i];
				if (notNull.indexOf(i++) != -1) {
					sql = sql + " NOT NULL "; 
				}
				if (i < cols.length) {
					sql = sql + " , ";
				}
			}
			if (values.id && cols.indexOf(values.id.trim()) !== -1) {
				sql = sql + ", PRIMARY KEY (" + values.id + ")";
			}
			sql = sql + ");";
		return sql;
    }
	select(values) {
		var sql = "";
		if (values.columns) {
			sql = sql + "Select " + values.columns + " from ";
		} else {
			sql = sql + "Select * from "
		}	
		
		sql = sql + values.name[0];
		
		if (values.on) sql = sql + " on " + values.on;
		if (values.where) sql = sql + " where " + values.where;
		if (values.groupBy)	sql = sql + " group by " + values.groupBy;
		if (values.orderBy)	sql = sql + " order by " + values.orderBy;
		
		return sql + ";"
	}
	dropTable(values) {
		return "DROP TABLE " + values.name + " ;";
	}
	joinTables(values) {
		var sql = "Select " + values.columns + " from " + values.name[1] + " " + values.type + " " + 
                      values.name[0];
		if (values.on) sql = sql + " on " + values.on;
		if (values.where) sql = sql + " where " + values.where;
		
		return sql + ";";
	}
	copyTable(values){
		var cols = values.columns.trim() === '*' ? ' ' : " (" + values.columns + ") ";
		var sql = "INSERT INTO " + values.name[0] + cols + "SELECT " 
	          + values.columns + " FROM " + values.name[1];
		if (values.on) sql = sql + " on " + values.on;
		if (values.where) sql = sql + " where " + values.where;
		return sql + ";";
	}
	addColumn(values) {
		return "ALTER TABLE " + values.name[0] + " ADD COLUMN " + values.columns + 
                " " + values.type + " ;"
	}
    dropColumn(values) {
		var cols = values.columns;
		var sql = "ALTER TABLE " + values.name + " DROP COLUMN " + cols[0];
		if (cols.length > 1) {
			for (var i = 1; i < cols.length; i++) {
				sql = sql + ", DROP COLUMN " + cols[i];
			}
		}
		return sql + ";";
	}
	count(values) {
		return this.columnArithmetic(values, "count");
	}
	average(values) {
		return this.columnArithmetic(values, "avg");
	}
	sum(values) {
		return this.columnArithmetic(values, "sum");
	}
	min(values) {
		return this.columnArithmetic(values, "min");
	}
	max(values) {
		return this.columnArithmetic(values, "max");
	}
	swapColumns(values) {
		var col1 = values.columns[0], col2 = values.columns[1];
		return "UPDATE " + values.name[0] + " AS A SET " + col1 + " = B." + 
				 col2 + " , " + col2 + " = B." +
				 col1 + " from " + values.name[0] + " AS B WHERE A." + 
				 col2 + " = B." + col2 + ";" ;
	}
	columnArithmetic(values, operation) {
		var cols = JSON.parse(JSON.stringify(values.columns));
		var sql = "SELECT " + operation + " (" + cols.shift() + ") " + cols.join() + 
				  " FROM " + values.name[0] + " ";
		if (values.on) sql = sql + " on " + values.on;
		if (values.where) sql = sql + " where " + values.where;
		if (values.orderby) sql = sql + " on " + values.orderby;
		if (values.groupby) sql = sql + " where " + values.groupby;
		return sql + ";";
	}
	addCast(data, delim, types, addCol) {
		var casted = "", keys = Object.keys(data), len;
		for (var key of keys) {
			if (data[key] == null || data[key] == undefined) {
				delete data[key];
			}
		}
		keys = Object.keys(data);
		len = keys.length;
		if (addCol) {
			var index = 0;
			for (var key of keys) {
				casted = casted + "CAST ('" + data[key] +
								"' AS "+ types[key] + " ) ";
				if (delim && len > 1  && index < len - 1) {
					casted = (index < len - 2) ? (casted + delim[0]) : (casted + " " + delim[1]);
				}
				index++;
			}
		} else {
			var index = 0;
			for (var key of keys) {
				casted = casted +  key +  " = " + "CAST ('" + data[key] +
								"' AS "+ types[key] + " ) ";
				if (delim && len > 1  && index < len - 1) {
					casted = (index < len - 2) ? (casted + delim[0]) : (casted + " " + delim[1]);
				}
				index++;
			}
		}
		return casted;
	}
	getValues(data, paired) {
		var index = 0, vals = "";
		if (paired) {
			var keys = Object.keys(data);
			for (var key of keys) {
				index++;
				if (data[key] != null) {vals = vals + " " + key + " = '" + data[key] + "' ";
				if (index < keys.length) vals = vals + " AND ";}
			}
		} else {
			var values = Object.values(data);
			for (var val of values) {
				index++;
				vals = vals + "'" + val + "' ";
				if (index < values.length) vals = vals + ",";
			}
		}
		return vals;
	}
};

var mysql = class extends sql {
	getTableNames() {
		return 'SHOW TABLES;';
	}
	fullJoin(values) {
		var sql = "Select " + values.columns + " from " + values.name[1] + " LEFT JOIN " + 
                      values.name[0];
		if (values.on) sql = sql + " on " + values.on;
		if (values.where) sql = sql + " where " + values.where;
		sql = sql + " UNION ";
		sql = sql + "Select " + values.columns + " from " + values.name[1] + " RIGHT JOIN " + 
                      values.name[0];
		if (values.on) sql = sql + " on " + values.on;
		if (values.where) sql = sql + " where " + values.where;
		return sql + ";";
	}
	insertRow(values) { 
		return "INSERT into " + values.name + " ( " + 
	            Object.keys(values.columns).join() + " ) "  + " VALUES (" +
                this.getValues(values.columns) + ");";
	}
	updateRow(values) { 
		return "UPDATE " + values.name + "  " + " SET " + 
				this.getValues(values.cols_modified,true) +
				" WHERE " + this.getValues(values.cols_unmodified, true) + ";"
	}
	deleteRows(values) { 
		return "DELETE from " + values.name + " WHERE " +
                this.getValues(values.columns, true) + ";";
	}
};

var postgresql = class extends sql {
	getTableNames() {
		return { text: "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE"+ 
	                   "( TABLE_SCHEMA = 'public') ORDER BY TABLE_NAME;", 
			     rowMode: 'array' 
			   };
	}
	insertRow(values) { 
		return "INSERT into " + values.name + " ( " + 
	           Object.keys(values.columns).join() + " ) "  + " VALUES (" +
               this.addCast(values.columns, [","," , "], values.types, true) + ");";
	}
	updateRow(values) {
		return "UPDATE " + values.name + "  " + " SET " + 
				this.addCast(values.cols_modified, [" , "," AND "], values.types) +
				" WHERE " + this.addCast(values.cols_unmodified, 
				[" AND ", " AND "], values.types) + ";";
	}
	deleteRows(values) { 
		return "DELETE from " + values.name + "  " + " WHERE " +
			this.addCast(values.columns, [" AND ", " AND "], values.types) + ";";
	}
};

var oraclesql = class extends sql {
};

module.exports.mysql = new mysql();
module.exports.postgresql = new postgresql();