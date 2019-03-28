
module.exports.getTableNames = (name) => "Ready.";
module.exports.createDatabase = (name, db)=> {
	if (db) return "Database will be created on switching.";
	return "Database " + name + " is created successfully;";
};
module.exports.createTable = (values) => "Table " + values.name + 
                                         " is created successfully;";

module.exports.select = (values) => {
	if (!values.columns) return;
	var text = typeof values.columns === 'object' && values.columns.length > 1 ? 
	          ["Columns", "are"] : ["Column", "is"];
    var message = text[0] + " '" + values.name[0] + "." + values.columns + "' ";
	if (values.on) message = message + " on " + values.on + " ";
	if (values.where) message = message + " where " + values.where + " ";
	if (values.groupby)	message = message + " group by " + values.groupby + " ";
	if (values.orderby)	message = message + " order by " + values.orderby + " ";
	
	return message + text[1] + " selected successfully.";
};
module.exports.dropTable = (values) => "Table " + values.name + 
                                       " is deleted successfully;"
module.exports.joinTables = (values) => {
	var message = values.type + "s of '" + values.name[1] + "' and '" 
	              + values.name[0];
	if (values.on) message =  message + " on " + values.on;
	if (values.where) message =  message + " where " + values.where;
    return message + ";";
};
module.exports.copyTable = (values) => "Contents of '" + values.name[1] + 
									   "'' are successfully copied to '" + 
                                       values.name[0] + "'.";
module.exports.addColumn = (values)=> "Column '" + values.name[0] + "." + 
                                      values.columns + "' is added successfully.";
module.exports.dropColumn = (values) => {
	var text = values.length > 1 ? ["Columns", "are"] : ["Column", "is"];
	return text[0] + " '" + values.name + "." + values.columns.join() +
         	"' " + text[1] +" deleted successfully."
};
module.exports.count = (values) => col_arithmetic_msg(values, "number");
module.exports.average = (values) => col_arithmetic_msg(values, "average");
module.exports.sum = (values) => col_arithmetic_msg(values, "sum");
module.exports.min = (values) => col_arithmetic_msg(values, "minimum value");
module.exports.max = (values) => col_arithmetic_msg(values, "maximum value");
module.exports.swapColumns = (values) => "Columns '" + values.name + "." + 
										 values.columns[0] + "' and '" + values.name + 
										 "." + values.columns[1] + 
										 "' are swapped successfully.";
module.exports.insertRow = (values) => "One row is inserted into '" + values.name +
									   "' successfully.";
module.exports.updateRow = (values) => "One row in '" + values.name + 
									   "' is updated successfully.";
module.exports.deleteRows = (values) => {
	var prefix = values.nRows > 1 ? values.nRows + " rows are " : "One row is ";
    return prefix + "deleted from '" + values.name + "' successfully.";
};

col_arithmetic_msg = (values, operation) => {
	var cols = JSON.parse(JSON.stringify(values.columns));
	var message = "The " + operation + " of data in column '" + values.name[0] + "." + 
	              cols.shift() +"'";
	if (values.on) message =  message + " on " + values.on;
	if (values.where) message =  message + " where " + values.where;
	
	return [message + " is determined successfully.", message + " is "];
};

