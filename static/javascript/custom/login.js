'use strict';
angular.module("dbExpApp.login", [])
.controller('LogInFormController', ['$scope', '$window','server','base_address','dbCookies',
    function ($scope, $window, server, base_address, dbCookies) {  
        
    $scope.User = class {

        static init() {

            var preferences = dbCookies.get("DbUserPreferences");
            if (!preferences) {
                preferences = {
                    "dbName": "mydb",
                    "hostAddress": "127.0.0.1",
                    "portNumber": 3306,
                    "databaseUrl": "mysql://localhost:3306/mydb",
                    "pool": "Join",
                    "maxTotal": "15",
                    "maxIdle": "5",            
                    "maxWait": "5",
                    "save": false,
                };
            } 
            $scope.user = new $scope.User(preferences);
        }
        
        constructor(preferences) {    
            this._user = { name: "", 
                           password: "",
                           dbVendor: dbCookies.get("DbVendor") || "MySQL", 
                           rememberMe: false 
                         };
            this._preferences = preferences;
            this._settings = false;          
            this._status = { pending: false,
                             error: false, 
                             success: false,
                             message: "" 
                           };		
        } 

        get vendors() {
            return ['MySQL', 'Oracle', ['8i', '9', '9i', '10g', '11g', '12g'], 
			        'MongoDB', 'PostgreSQL'];
        } 
        get dbVendor() {
            return this._user.dbVendor;
        }
        get url() {
            return this._preferences.databaseUrl;
        }
        get get() {
            return {                        
                'rememberMe': this._user.rememberMe,
                'settings': this._settings,
                'hostAddress': this._preferences.hostAddress,
                'dbName': this._preferences.dbName,
                'portNumber': this._preferences.portNumber,
                'maxTotal': this._preferences.maxTotal,
                'maxIdle': this._preferences.maxIdle,
                'maxWait': this._preferences.maxWait,
                'pool': this._preferences.pool,
                'save': this._preferences.save,
                'status': this._status,     
                'new': this._preferences.pool === 'New',
                'private': this._preferences.pool === 'Private',
                'join': this._preferences.pool === 'Join',
                'validPort': this.isPortValid(),
                'validUrl': this.isUrlValid(),
            };
        };      
        set settings(settings) {
            this._settings = !this._settings;
        }
        set dbVendor(vendor) {
            if (vendor === 'MySQL') {
                this._user.dbVendor = vendor;
                this._preferences.dbName = "mydb";
                this._preferences.portNumber = 3306;
            }else if (vendor === 'PostgreSQL') {
                this._user.dbVendor = vendor;
                this._preferences.dbName = "postgres";
                this._preferences.portNumber = 5432;
            } else if (vendor === 'MongoDB') {
                this._user.dbVendor = vendor;
                this._preferences.dbName = "mydb";
                this._preferences.portNumber = 27017;
            } else {
                this._user.dbVendor = vendor.indexOf('Oracle') === -1 ? 
                                      ('Oracle ' + vendor): vendor;
                this._preferences.dbName = "xe";
                this._preferences.portNumber = 1521;
            }
            this.getUrl();
        }
        set url(url) {
            this._preferences.databaseUrl = url;
        } 
        setData(g, key, value) {
            if (g === "user") {
                this._user[key] = value ? value : !this._user[key];
            } else {
                this._preferences[key] = value ? value : !this._preferences[key];
                this.getUrl();
            }
        }            
        cancel() {
            this._settings = false;
        }
        getValue() {
            this._status.error = false;
        }
        save() {
            if (this._preferences.save) {
                dbCookies.save("DbUserPreferences", this._preferences);
                dbCookies.save("DbVendor", this._user.dbVendor);
            } else {
                dbCookies.delete("DbUserPreferences");
            }
            this._settings = false;
        } 
        login (userData) { 
            if (!userData) {
                var userData = { user: this._user, preferences: this._preferences };
            }
            localStorage.userData = JSON.stringify(userData);
            this._status.pending = true;
            var that = this;  
            server.postRequest(base_address + "login", userData)
            .then(function(response) {
                that._status.pending = false;
                that._status.success = true; 
                if(that._user.rememberMe){
                    dbCookies.save("DbUser",userData);
                }
                $window.location.href = base_address + "explorer";
            }, function(response) {
                that._status.pending = false;
                that._status.error = true;
                that._status.message = response;
            });    
        }
        getUrl() {            
            var db = this._user.dbVendor, 
			    p = this._preferences, prefix;
			if (db === 'MySQL') prefix = 'mysql://';
			else if (db === 'PostgreSQL') prefix = 'postgresql://';
			else if (db === 'MongoDB') prefix = 'mongodb://';
			else prefix = 'oracle:thin:@';
            p.databaseUrl = prefix + p.hostAddress + ':' + p.portNumber + "/" + p.dbName;
			
        }
        isPortValid() {
            var exp = /^[1-5]?(\d){1,4}$|^6[0-4](\d){3}$|^65[0-4](\d){2}$|^655[0-2](\d){1}$|^6553[0-5]$/;
            return exp.test(this._preferences.portNumber);
        }
        isUrlValid() {
            var exp = new RegExp("^(mongodb://|mysql://|postgresql://|oracle:thin:@)(\\S)+:" + 
                                 "(([1-5]?(\\d){1,4})|(6[0-4](\\d){3})|(65[0-4](\\d){2})|(655[0-2](\\d){1})" +
                                 "|(6553[0-5])){1}/(\\w)+$", "i");
            return exp.test(this._preferences.databaseUrl);
        }  
    };
    $scope.User.init();
}]);

