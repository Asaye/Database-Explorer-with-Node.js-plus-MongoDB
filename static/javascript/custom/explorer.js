'use strict';
angular.module("dbExpApp.explorer", [])
.controller('ExpController', ['$scope', '$state', '$stateParams', '$window', '$q', '$interval', '$timeout',
            'server', 'dbCookies', 'typeCast', 'base_address', "alertMsg",
			($scope, $state, $stateParams, $window, $q, $interval, $timeout, server, dbCookies,
              typeCast, base_address, alertMsg) => {
      
    $scope.Explorer = class {
        static logout() {
            dbCookies.delete("DbUser");
            server.disconnect();
            $window.location.href = base_address + "logout"; 
        }       
        constructor () {
            this._display = true;
        }
        get display() {
            return this._display;
        }
        open() {
            this._display = true;
        }
        close() {
            this._display = false;
        }    
    };

    $scope.Board = class extends $scope.Explorer {
        constructor() {
            super();
            this._buttons = {db: true, tab: true, col: true};
        }
        get buttons() {
            return this._buttons;
        }
        set buttons(val) {
            this._buttons = val;
        }
        get title() {
            return "Account";
        }
        get options() {
            return ["Settings", "Windows", "Logout"];
        }
        get restore() {
            var list = $scope.list.display, board = this.display;
            return !list || !board;
        }
        set title(val) {
            if (val === 'Settings') {

            } else if (val === 'Windows') {
                this.open();
                $scope.tables.open();
                $scope.list.open();
                this._buttons = {db: true, tab: true, col: true};
            } else if (val === 'Logout') {
                 $scope.Explorer.logout();   
            }
        }
        resize() {
            $scope.$broadcast("windowResized");
        }
        maximize() {
            var list = $scope.list.display, board = this.display;
            if (list) {
                $scope.list.close();
            } else if (!list || !board) {
                this.title = 'Windows';
                $scope.$broadcast("windowResized");
            }
        }
    };    
    $scope.List = class extends $scope.Explorer {
        constructor() {
            super();
        }
    };
    $scope.Tables = class extends $scope.Explorer {
        constructor() {
            super();
        }
    };
    $scope.NewTable = class {
        constructor(status) {
            this._display = true;
            this._name = "";
            this._id = "";
			this._notNull = [];
            this._columns = [""];
            this._types = ["Varchar(100)"];
            $scope.NewTable.status = status;
            this._invalid = {name: false, cols: false, any: false};
        }
        get display() {
           return this._display;
        }
        set display(val) {
            this._display = val;
        }
        get options() {
            return ["Boolean", "Date", "Float", "Integer", "Varchar(100)"];
        }
        get name() {
            return this._name;
        }
        set name(name) {
            this._name = name;
        }
        get id() {
            return this._id;
        }		
        set id(id) {
            this._id = id == this._id ? "" : id;
        }
		get notNull() {
            return this._notNull;
        }
		set notNull(index) {
            this._notNull.check(index);
        }
        get columns() {
            return this._columns;
        }
        get types() {
            return this._types;
        } 
        get invalid() {            
            return this._invalid;
        }       
        insert(index) {
            this._columns.splice(index, 0, "");
            this._types.splice(index, 0, "Varchar(100)");
            $scope.$broadcast("pageSizeChange", {index: '-1', scrollDown: true});
        }        
        add() {
            this._columns.push("");
            this._types.push("Varchar(100)");
            $scope.$broadcast("pageSizeChange", {index: '-1', scrollDown: true});
        }
		isNotNull(index) {
            return this._notNull.indexOf(index) != -1;
        }
        delete(index) { 
            if (this._columns.length === 1) return;
            this._columns.splice(index, 1);
            this._types.splice(index, 1);  
            $scope.$broadcast("pageSizeChange", {index: '-1', scrollDown: true});
        }         
        submit() {
            this._invalid.name = !this._name;
            this._invalid.cols = (this._columns.indexOf("") !== -1);
            this._invalid.any = this._invalid.name || this._invalid.cols;
			
            if (!this.invalid.any) {
				var params = [{values: {name: this._name, columns: this._columns,
				types: this._types, id: this._id, notNull: this._notNull}}];
				var deferred = $q.defer(), that = this;
				new $scope.Sender({data: {params: params, fnName: "createTable", }, 
							   deferred: deferred});
				this._status = new $scope.Status(["",""]);
				$scope.NewTable.status.pending = true;
                deferred.promise.then((response) => {
                    that._display = false;
					$scope.NewTable.status.successful(response[0].message);
                    $scope.TableNames.init();
                }, (err) => { 
					$scope.NewTable.status.unsuccessful(err);
				});
            } 
        }      
    };

    $scope.Operations = class {
        constructor() {
            this._criteria = "";
            this._display = false;
            this._isArray = false;
            this._result = undefined;
            this._status = undefined;
            this._url = base_address + 'crud';
        }
        get status() {
            return this._status;
        }
        set status(val) {
            this._status = val;
        }
        get result() {
            return this._result;
        }
        get display() {
            return this._display;
        }
        get isArray() {
            return this._isArray;
        }
        set criteria(val) {
            this._criteria = val;
        }
        hide() {
            this._display = false;
        }
        get message() {
            return this._status ? (this._status.pending ? " connecting to database ... " : 
                   (this._status.success ? this._status.message[0] : 
                    this._status.message[1])) : ""; 
        }
    };
    
    $scope.TableOp = class extends $scope.Operations { 
        constructor(name) {
            super();
            this._name = name;
            this._hovered = [];
            this._selected = [];
            this._opened = [];
            this._newtable = undefined;
            this._alert = null;
			this._data = {};
        }
        get newtable() {
            return this._newtable;
        }    
        get alert() {   
            return this._alert;
        }
        get hovered() {
            return this._hovered;
        }  
        get selected() {
            return this._selected;
        } 
        get opened() {
            if (this._opened.length === 0) {
                $stateParams.table = null;
            }
            return this._opened;
        }  
        get options() {
            return this._newtable ? this._newtable.options : [];
        }
        get types() {
            return this._newtable ? this._newtable.types : [];
        }
        create() {
			this._status = new $scope.Status(["", ""]);
            this._newtable = new $scope.NewTable(this._status);
        }
		getParams(name) {
			var params = [];
			if (name) {
				params.push({values: {name: [name]}});
            } else {
                var names = angular.copy(this._selected);
                for (var name of names) {
					params.push({values: {name: [name]}});
                }
            }
			return params;			
		}
        open(name) {
            var that = this, deferred = $q.defer(),
                params = this.getParams(name);
				
			new $scope.Sender({data: { params: params, fnName: "select",
                                       metadata: true }, deferred: deferred});
			
            deferred.promise.then((response) => {
				angular.forEach(response, (item) => {
					$scope.table.data.push(new $scope.Table(item));
					that._opened.push(item.title[0]);
                    that._selected.delete(item.title[0]);
                });
                that._hovered = [];
            });
        }
        close(name) {
            if (name) {
                this._opened.delete(name);
                var that = this, index, 
                    table = $scope.table.data.filter((item) => {
                        return item.get.title === name;
                    });
                index = $scope.table.data.indexOf(table[0]);
                $scope.table.data.delete(table[0]);
                $scope.Table.active = Math.max(0, index - 1);
                return;
            } 
            var that = this, deferred = $q.defer();
            this._alert = new $scope.Alert('danger', alertMsg.closeTables(), deferred);
			
            deferred.promise.then(() => {
                $scope.table.data = [];
                that._opened = [];
				that._selected = [];
                that._hovered = [];
            }); 
        }
        delete(name) {
			var params = this.getParams(name),def_alert = $q.defer(), def_db = $q.defer(),
			    that = this;
            this._alert = new $scope.Alert('danger', alertMsg.deleteTable(params), def_alert);
			
            def_alert.promise.then(() => {
				new $scope.Sender({data: { params: params, transaction: false, 
				                           fnName: "dropTable" }, deferred: def_db});
				that._status = new $scope.Status(["",""]);
				that._status.pending = true;
            });
			
            def_db.promise.then((response) => {
                $scope.TableNames.init();
				that.resolved(response[0].message);
                that._selected = [];
            }, (err) => this._status.unsuccessful(err));
        }
        copy(data) {
            var src, dest, on, where, text, selected, cols, 
                that = this, def_alert = $q.defer(),def_db = $q.defer(), 
				table = $stateParams.table;
            src = data.src ? data.src : (this._hovered[1] ? this._hovered[1] 
                                      : (table ? table.get.title: ""));
            dest = data.dest ? data.dest : this._hovered[0];
            selected = table ? table.get.selected : [];
            cols = selected.length > 0 ? selected.join() : "*";
            this._alert = new $scope.Alert('danger', alertMsg.copyTable(src, cols, dest), def_alert);
            def_alert.promise.then(() => {
				var params = [{values: {name: [dest, src], columns: cols, 
				                        on: data.on, where: data.where}}];
				new $scope.Sender({data: { params: params, transaction: true, 
				                           fnName: "copyTable"}, 
							   deferred: def_db});
				that._status = new $scope.Status(["",""]);
				that._status.pending = true;
                that._hovered = [];
            });
             
            def_db.promise.then((response) => {
				if ($scope.tableOp.opened.indexOf(dest) != -1) {
					var types = {}, data = {};
					angular.forEach(response, (res) => {
						for (var md of res.metadata) {
							types[md.column_name] = md.data_type;
						}
					});
					var tableData = $scope.table.data.filter((item) => {
						return item.get.title == dest;
                    });
					new $scope.TableUpdate(tableData[0], response[0]);				}
				that.resolved(response[0].message);
                that._selected = [];
            }, (err) => this._status.unsuccessful(err));
        }
		resolved(message) {
			this._status.successful(message);
            this._hovered = [];
		}		
        inner(data) {
            this.join("Inner join", data);
        }
        full(data) {
            this.join("Full join", data);
        }
        left(data) {
            this.join("Left join", data);
        }
        right(data) {
            this.join("Right join", data);
        }
        join(type, data) {
            var table = $stateParams.table, deferred = $q.defer(),
                src, dest, selected, cols, that = this;
            src = data.src ? data.src : this._hovered[1];
            dest = data.dest ? data.dest : this._hovered[0];
            selected = table ? table.get.selected : []; 
            cols =  selected.length > 0 ? selected.join() : "*";
			
			var params = [{values: {name: [dest, src], columns: cols, type: type,  
				                        on: data.on, where: data.where}}];
			new $scope.Sender({data: {params: params, fnName: "joinTables"}, 
							deferred: deferred});
			this._isArray = true;
            this._display = false;
			this._status = new $scope.Status(["",""]);
			this._status.pending = true;
            deferred.promise.then((response) => {
                that._display = true;
                that._result = [];				
				that.resolved(response[0].message);
				if (response[0].data == "") {
					that._isArray = false;
					that._result = "No result was found.";
					return;
				}
                var keys = Object.keys(response[0].data[0]), result = {};
				for (var key of keys) {
					result[key] = [key];
				}
				for (var res of response[0].data) {
					for (var key of keys) {
						result[key].push(res[key]);
					}
				}
				for (var key of keys) {
                    that._result.push(result[key]);
                }
            }, (err) => this._status.unsuccessful(err));
        }
    };

    $scope.TableNames = class {
        static init() {
            $timeout(() => {
                $scope.table.names = [];
                $scope.tableOp.status = new $scope.Status(["Ready.", ""]);
				var deferred = $q.defer(), title;
				new $scope.Sender({data: {params: [{values:{}}], fnName: "getTableNames"}, 
				                   deferred: deferred});
				$scope.tableOp.status.pending = true;
				deferred.promise.then((response) => {
					angular.forEach(response[0].data, (item) => {
					    title = Object.values(item);
						$scope.table.names.push(new $scope.TableNames(title[0]));
					});
					$scope.tableOp.status.successful(response[0].message);
				}, (err) => { $scope.tableOp.status.unsuccessful(err); });
				
            }, 500);
        }
        constructor(name) {
            this._name = name;
            this._selected = null;
            this._isHovered = false;
            this._popup = { display: false };
            this._ops = $scope.tableOp;
        }
        get name() {
            return this._name;
        }
        get hovered() {
            if (!this._ops) {
                return false;
            }
            return this._ops.hovered.indexOf(this._name) !== -1;
        }
        get popup() {
            return this._popup.display;
        }
        set popup(val) {
            this._popup.display = val;
        }
        select(e) {
            if (!e) return;
            e.stopPropagation();
            if (e && e.originalEvent.shiftKey && this._ops.hovered.length < 2) {
                this._ops.hovered.check(this._name);
                this._isHovered = this._ops.hovered.indexOf(this._name) !== -1;
            } else if (e && !e.originalEvent.shiftKey) {
                this._ops.hovered.delete(this._name);
                this._isHovered = false;
            }
            this._ops.selected.check(this._name);
        }
        isOpen() {
            return this._ops.opened.indexOf(this._name) !== -1;
        }
        isSelected() {
            return this._ops.selected.indexOf(this._name) !== -1;
        }
    };
    $scope.ColumnOp = class extends $scope.Operations {        
        constructor(table) {
            super();
            this._table = table;
            this._column = "";
            this._colName = "";
            this._type = "";
            this._nrows = "";
            this._orderBy = "";
            this._groupBy = "";
            this._message = "";           
            this._alert = undefined;
        }
        get table() {
            return this._table;
        }       
        get alert() {
            return this._alert;
        }
        get result() {
            return this._result;
        }
        set column(val) {
            this._column = val;
        }
        set orderBy(val) {
            this._orderBy = val;
        }
        set groupBy(val) {
            this._groupBy = val;
        }        
		add(data) {
            if (data) {
				var col= data.colName, table = data.table, that = this, def = $q.defer(),
				    params = [{values: {name: [table], columns: col, type: data.type}}];
				new $scope.Sender({data: { params: params, fnName: "addColumn", 
				                           transaction: true }, deferred: def });
				this._status = new $scope.Status(["", ""]);
				this._status.pending = true;
				def.promise.then((res) => this.resolved(res[0]), 
				                 (err) => this._status.unsuccessful(err));
			}
        }
		drop(data) {
            if (data) {
				var columns = data.selected, table = data.table, 
					def_alert = $q.defer(), def_db = $q.defer(), that = this;
				this._alert = new $scope.Alert('danger', alertMsg.dropColumn(table, columns), def_alert);
				def_alert.promise.then(() => {
					var params = [{values: {name: [table], columns: columns, all: data.columns}}];
					that._status = new $scope.Status(["", ""]);
					that._status.pending = true;
					new $scope.Sender({ data: { params: params, fnName: "dropColumn", 
										transaction: true }, deferred: def_db });
				});
				def_db.promise.then((res) => { for (var col of columns) 
				                                  $stateParams.table.select(col);
											   this.resolved(res[0]) }, 
				                    (err) => this._status.unsuccessful(err));
			}
        }
        swap(data) {
            if (data) {
				var col1 = data.selected[0], col2 = data.selected[1], 
				    table = data.table, def = $q.defer(), that = this,
				    params = [{values: {name: [table], columns: [col1, col2]}}];
				this._status = new $scope.Status(["", ""]);
				this._status.pending = true;
				new $scope.Sender({data: { params: params, fnName: "swapColumns",
										   transaction: true }, deferred: def });
				def.promise.then((res) => this.resolved(res[0]), 
				                 (err) => this._status.unsuccessful(err));
			}
        }
        select(data) {  
            var cols = data.selected.join(), table = data.table, def_db = $q.defer(),
                that = this, params = [{values: { name: [table], columns: cols, 
			                                      on: data.on, where: data.criteria,
													groupBy: data.groupBy, orderBy: data.orderBy }}];
			this._status = new $scope.Status(["", ""]);
			this._status.pending = true;						 
			new $scope.Sender({ data: {params: params, fnName: "select" },  
			                    deferred: def_db});
			def_db.promise.then((res) => this.displayResult(res[0], true), 
			                    (err) => this._status.unsuccessful(err)); 
        }
		count(data) {
            this.sendRequest(data, "count");
        }
		average(data) {
            this.sendRequest(data, "average");
        }
		sum(data) {
            this.sendRequest(data, "sum");
        }
		max(data) {
            this.sendRequest(data, "max");
        }
		min(data) {
            this.sendRequest(data, "min");
        } 
		sendRequest(data, fnName) {
			var table = data.table, def_db = $q.defer(), that = this,
			    params = [{values: { name: [table], columns: data.selected, 
			                         on: data.on, where: data.criteria}}];
			this._status = new $scope.Status(["", ""]);
			this._status.pending = true;
			new $scope.Sender({ data: {params: params, fnName: fnName }, 
			                    deferred: def_db});
								
			def_db.promise.then((res) => this.displayResult(res[0]), 
			                    (err) => this._status.unsuccessful(err)); 
		}
		resolved(res) {
			new $scope.TableUpdate($stateParams.table, res);
			this._status.successful(res.message);
		}
		displayResult(res, isArray) {
			var key = Object.keys(res), result = res[key];
            this._display = true;			
			if (res.data[0] == "") {
				that._isArray = false;
				that._result = "No result was found.";
				return;
			}
			if (!isArray) {
			   delete res.data[0]._id;
			   this._isArray = false;
			   this._status.successful(res.message[0]);
			   this._result = res.message[1] + Object.values(res.data[0]) + ".";
			   return;
			} 
			this._result = [];
			this._isArray = true;
			this._status.successful(res.message)
			var keys = Object.keys(res.data[0]), result = {};
			for (var key of keys) {
				result[key] = [key];
			}
			for (var res of res.data) {
				for (var key of keys) {
					result[key].push(res[key]);
				}
			}
			for (var key of keys) {
				this._result.push(result[key]);
			}
		}
    };
	$scope.TableUpdate = class {
	
		constructor(table, data) {
			this._table = table;
			this._data = data;
			this.update();
		}

		update() {
			var types = {}, columns = [], content = [], row = [], id;
			for (var m of this._data.metadata) {
				if (m.column_name) {
					types[m.column_name] = m.data_type;
					columns.push(m.column_name);
				} else {
					types[m.COLUMN_NAME] = m.DATA_TYPE;
					columns.push(m.COLUMN_NAME);
				}
			}
			for (var r of this._data.data) {
				for (var col of columns) {
					row.push(r[col]);
				}
				content.push(new $scope.Row(row));
				row = [];
			}

			this._table.setData("_columns", columns);
			this._table.setData("_types", types);
			this._table.setData("_content", content);
			if (this._data.id && this._data.id[0]) {
				this._table.setData("_id", this._data.id[0].column_name);
			}
		}
	};
    $scope.Alert = class {
        constructor(type, msg, deferred) {
            this._type = type || "";
            this._message = msg || "";
            this._display = arguments.length === 0 ? false : true;
            this._response = "";
            if (this._type === 'danger') {
                this._deferred = deferred;
                this.danger();
            }
        }
        get message() {
            return this._message;
        }
        get display() {
            return this._display;
        }
        get type() {
            return this._type;
        }
        set message(msg) {
            this._message = msg;
        }
        set display(val) {
            this._display = val;
        }
        set type(type) {
            this._type = type;
        }
        set deferred(deferred) {
            this._deferred = deferred;
        }
        set response(val) {
            this._response = val;
        }
        hide() {
            this._display = false;
        }
        danger() {
            this._display = true;
            var that = this, timer;
			timer = $interval(() => {
				if (that._response === 'Yes') {
					that._deferred.resolve();
					that._display = false;
					$interval.cancel(timer);
				} else if (!that._display || that._response === 'No') {
					that._deferred.reject();
					that._display = false;
					$interval.cancel(timer);
				} 
			}, 1000);
        }
    };
    
    $scope.Status = class {
        constructor(message) {
            this._success = false;
            this._error = false;
            this._pending = false;
            this._message = message;
        }
        get success() {
            return this._success;
        }
        set success(val) {
            this._success = val;
        }
        get error() {
            return this._error;
        }
        set error(val) {
            this._error = val;
        }
        get pending() {
            return this._pending;
        }
        set pending(val) {
            this._pending = val;
        }
        get message() {
            return this._message;
        }
        set message(val) {
            this._message = val;
        }
		successful(msg) {
			this._success = true;
			this._error = false;
			this._pending = false;
			this._message[0] = msg;
        }
        unsuccessful(msg) {
			this._success = false;
			this._error = true;
			this._pending = false;
			this._message[1] = msg;
        }
    };
    
	$scope.Sender = class {
		constructor(data) {
			this._deferred = data.deferred;
			this._url = base_address + "crud";
			this._data = data.data;
			this.send()
		}
		send() {
			var that = this;
			server.postRequest(this._url, this._data).then((response) => {
				if (that._deferred) that._deferred.resolve(response);
			}, (err) => { if (that._deferred) that._deferred.reject(err); });
		}
	};
    
    $scope.DatabaseOp = class extends $scope.Operations {

        constructor() {
            super();
        }      
        get alert() {
            return this._alert;
        }
        create(name) {
			var deferred = $q.defer(), that = this;
			new $scope.Sender({data: {params: [{values: name}], 
									  fnName: "createDatabase"}, 
							   deferred: deferred});
			$scope.tableOp.status.pending = true;
            deferred.promise.then((res) => {
				$scope.tableOp.status.successful(res[0].message);
            }, (err) => { $scope.tableseOp.status.unsuccessful(err); });
        }
        switch(name) {
            if (!name) {
                return;
            }
            var that = this, userData, preferences, dbUrl, 
                dbName, index, context, data;
            userData = JSON.parse(localStorage.userData);
            data = angular.copy(userData);
            preferences = data.preferences;
            dbUrl = preferences.databaseUrl;
            dbName = preferences.dbName;
            index = dbUrl.lastIndexOf(dbName);
            context = dbUrl.substring(0, index);
            dbUrl = context + name;
            preferences.dbName = name;
            preferences.databaseUrl = dbUrl;
            server.postRequest(base_address + "switch", data)
            .then(() => {
                localStorage.userData = JSON.stringify(data);
                $window.location.href = base_address + "explorer";
            }, (err) => { that._alert = new $scope.Alert('warning', err); });
        }
    };
    
    $scope.Column = class {
        
        constructor(text) {
            this._text = text;
            this._editted = null;
        }
        get text () {
            return this._text;
        }
        set text(val) {
            this._text = val;
        }
        get editted () {
            return this._editted;
        }
        set editted(val) {
            this._editted = val;
        }     
    };
    $scope.Row = class {
        constructor(row, isNew) {
            if (isNew) this._isNew = true;
            this._row = [];
            for (var col of row) {
                this._row.push(new $scope.Column(col));
            }
            this._selected = false;
        }
        get isNew() {
            return this._isNew;
        }
        get cols() {
            return this._row;
        }
        get selected() {
            return this._selected;
        }
        set selected(val) {
            this._selected = !this._selected;
        } 
        set isNew(val) {
            this._isNew = val;
        }       
        set cols(val) {
            this._row = val;
        }
        setColumn(index, val) {
            this._row[index] = val;
        }      
    };
          
    $scope.Table = class extends $scope.Explorer {
        static init() {           
           $scope.Table.n_rows = dbCookies.get("RowsPerPage") || 10;
           $scope.Table.active = $scope.table.data.length;  
        }             
        constructor (data) {
			super(); 
            $scope.Table.init();
            this._title = data.title[0];
            this._columns = [];
            this._types = {};
            this._id = data.id;
            this._selected = [];
            this._ops = new $scope.ColumnOp(this._title);
            this._pages = { active: 0, begin: 0, max: 1};
            this._content = [];
            this._new_table = null;
			new $scope.TableUpdate(this, data);
			var len = this._content.length;     
            this._pages.max = Math.ceil(len/$scope.Table.n_rows) - 1; 
        };
        close () {
           var index = $scope.table.data.indexOf(this);
           $scope.table.data.splice(index, 1);
           $scope.Table.active = Math.max(0, index - 1);
           $scope.tableOp.opened.delete(this._title);
        }      
        get get() {
            return {
                'index': $scope.table.data.indexOf(this),
                'title': this._title,
                'columns': this._columns,
                'types': this._types,
                'id': this._id,
                'content': this._content,
                'selected': this._selected,
                'ops': this._ops,
                'pages': this._pages,
                'editting': this._editting,
                'scroll': this._scroll_factor,
                'status':this._status,
                'active': $scope.Table.active,
                'n_rows': $scope.Table.n_rows || 10,
                'n_rows_op': [5, 10, 25, 50, 100, 500, 1000],
            };
        };
        get nRows() {
            return [5, 10, 25, 50, 100, 500, 1000];
        } 
        get n_rows() {
            return $scope.Table.n_rows;
        }
        get active() {
            return this._pages.active;
        }
        setData(name, val) {
            this[name] = val;
        }
        calMaxPage() {
            var len = this._content.length, 
            maxPage = Math.ceil(len/$scope.Table.n_rows) - 1;
            if (this._pages.max !== maxPage) {
                this._pages.max = maxPage;
            }
            if (this._pages.active > maxPage) {
                this.page = maxPage;
            }
        }
        set maxPage (num) {            
            this._pages.max = num;
        } 
        set page (num) {
            var  n = num >= 0  ? (num <= this._pages.max ? num : this._pages.max) : 0;
            this._pages.active = n;
            this._pages.begin = n*$scope.Table.n_rows;
            $scope.$broadcast("pageSizeChange", {index: this.get.index});
        }
        set n_rows(val) {
           $scope.Table.n_rows = val;
           this.calMaxPage();
           $scope.$broadcast("windowResized");
           dbCookies.save("RowsPerPage", val);
        };
        changeState(index) {
            if (index !== undefined) {
                 $scope.Table.active = index;
            }
            var that = this;
            $timeout(() => {
                 $state.go("colButtonGroup", {table: that, options: {}});
            }, 100);
        }
        select(col) {
            this._selected.check(col);
        } 
        rowNo(row) {
            return this._content.indexOf(row) + 1;
        }
        isSelected(index) {
            var col = this._columns[index];
            return this._selected.indexOf(col) !== -1;
        }
        isActive(index) {
            return $scope.Table.active === index;
        }
        isPageShown(index) {
            return (Math.abs(this._pages.active - index) <= 2);
        }
        isFirstPage() {
            return this._pages.active === 0;
        }
        isMaxPage() {
            return this._pages.active === this._pages.max;
        }
        isEmpty() {
            return this._content.length === 0;
        }
        isPageContd() {
            return this._pages.active < this._pages.max - 3;
        }
        prevPage() {
            this.page = this._pages.active - 1;
        }
        nextPage() {
            this.page = this._pages.active + 1;
        }
        lastPage() {
            this.page = this._pages.max;
        }
        sort(col_name, ascending) {
            if (!col_name) {
                this._content.reverse();
            } else {
                var index = this._columns.indexOf(col_name);
                if (ascending) {
                    this._content.sort((a, b) => {
                        if(typeof a.cols[index].text != 'string') {
                            return a.cols[index].text > b.cols[index].text ? 1 : -1;
                        } else {
                            return (a.cols[index].text).toLowerCase() > 
                                   (b.cols[index].text).toLowerCase() ? 1 : -1;
                        }
                    });
                } else {
                    this._content.sort((a, b) => {
                        if(typeof a.cols[index].text != 'string') {
                            return a.cols[index].text < b.cols[index].text ? 1 : -1;
                        } else {
                            return (a.cols[index].text).toLowerCase() < 
                                   (b.cols[index].text).toLowerCase() ? 1 : -1;
                        }
                    });
                }
            }
        }
        insert(row) {
			var params = [{ values: this.getValues() }];
			params[0].values.columns = this.getMod(row);
			this.sqlHandler(params, "insertRow");
        }
        update(row) {
			var params = [{ values: this.getValues() }];
			params[0].values.cols_modified = this.getMod(row);
			params[0].values.cols_unmodified = this.getUnmod(row);
			params[0].values.cols_original = this.getOriginal(row);
			this.sqlHandler(params, "updateRow");	
        }
		delete(row) {
            if (row.isNew) {
                this._content.delete(row);
                $scope.$broadcast("windowResized", {index: this.get.index});
                row.cols = null;
                row = null;
                return;
            }
			var params = [], counter = 0,
			    selected = this._content.filter((item) => {
							return item.selected;
						});
			for (var s of selected) {
				params.push({ values: this.getValues() });
				params[counter].values.columns = this.getUnmod(s);
				params[counter].values.nRows = selected.length; 
				counter++;
			}
			this.sqlHandler(params, "deleteRows");
        }
		getValues() {
			return {name: [this._title], types: this._types };
		}
		sqlHandler(params, fnName) {
			var def = $q.defer();
			new $scope.Sender({ data: { params: params, fnName: fnName, 
										transaction: true }, deferred: def });
			
			def.promise.then((res) => this.resolved(res[0]), (err) => this.rejected(err));
		}
        getOriginal(row) {
            var original = {}, columns = this._columns;
            angular.forEach(row.cols, (col, i) => {
                original[columns[i]] = col.text;
            });
            return original;
        }
		getMod(row) {
            var mod = {}, columns = this._columns;
            angular.forEach(row.cols, (col, i) => {
                if (col.editted) {
                    mod[columns[i]] = col.editted;
                }
            });
            return mod;
        }
        getUnmod(row) {
            var i = 0, unmod = {}, columns = this._columns;
            for (var col of row.cols) {
                if (this._columns[i] === this._id) {
                    unmod = {};
                    unmod[this._id] = col.text
                    return unmod;
                } else {    
                    unmod[columns[i++]] = col.text;
                }
            }
            return unmod;
        }
		resolved(res) {
			new $scope.TableUpdate(this, res);
			this._ops.status = new $scope.Status(["",""]);
			this._ops.status.successful(res.message);
		}
		rejected(err) {
			this._ops.status = new $scope.Status(["",""]);
			this._ops.status.unsuccessful(err);
		}
        newRow(row) {
            var new_row = [];
            for (var cols of this._columns) {
                new_row.push(undefined);
            }
            this._content.splice(row, 0, new $scope.Row(new_row, true));
            this.calMaxPage();  
            $scope.$broadcast("windowResized", {'index' : this.get.index});          
        }
        addRow(row) {            
            var len = this._content.length; 
            this.newRow(len);
        }        
        isId(index) {
            return this._columns[index] === this._id;
        }
        colType(index) {
            var key = Object.keys(this._types)[index];
            return this._types[key];
        } 
        cast(row, column) {
            var uncasted = this._content[row][column + 2], col_name = this._columns[column],
                type = this._types[col_name], casted = typeCast.getValue(uncasted, type);
            this._content[row][column + 2] = casted;
        }
    };

    Array.prototype.delete = function (element) {
        var index = this.indexOf(element);
        if (index !== -1) {
            this.splice(index, 1);
        }
        return this;
    };
    Array.prototype.check = function (element) {
        var index = this.indexOf(element);
        if (index === -1) this.push(element);
        else this.splice(index, 1);
        return this;
    };

    $scope.table = {
        data: [],
        names: []
    };
    
    $scope.exp = new $scope.Explorer();

    $scope.board = new $scope.Board();
    $scope.list = new $scope.List();
    $scope.tables = new $scope.Tables();
    
    $scope.columnOp = new $scope.ColumnOp();
    $scope.tableOp = new $scope.TableOp();
    $scope.databaseOp = new $scope.DatabaseOp();

    $scope.TableNames.init();
    $state.go("colButtonGroup");

}]);