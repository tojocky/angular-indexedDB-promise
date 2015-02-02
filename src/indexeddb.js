(function() {
    'use strict';
    angular.module('ilu.indexedDB', []).provider('$indexedDBPromise', function() {
        var module = this,
            connectionConfigs = {},
            defaultConnectionName = '',
            indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB,
            IDBKeyRange = window.IDBKeyRange || window.mozIDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange,
            dbMode = {
                  readonly: "readonly",
                  readwrite: "readwrite"
            },
            readyState = {
                pending: 'pending'
            },
            cursorDirection = {
                next: 'next',
                nextunique: 'nextunique',
                prev: 'prev',
                prevunique: 'prevunique'
            };

        module.connection = function(dbName, isDefault) {
            var currConnConfig = connectionConfigs[dbName];
            if(currConnConfig) {
                return currConnConfig;
            }

            return (new ConnectionConfig(dbName, isDefault));
        }

        module.$get = moduleService;

        function ConnectionConfig(dbName, isDefault) {
            if(!(this instanceof ConnectionConfig) {
               return new ConnectionConfig(dbName, isDefault);
            }

            this.name = dbName;
            this.versions = {};
            this.versionNumbers = [];
            this.maxVersion = 1;

            if(!defaultConnectionName || isDefault) {
                defaultConnectionName = dbName;
            }

            connectionConfigs[dbName] = this;
        }

        ConnectionConfig.prototype.upgrade = function(newVersion, fn) {
            version = Number(newVersion);
            if(typeof(version) != 'number') {
                throw 'first argument (' + newVersion + ') must be a number';
            }

            if(typeof(fn) != 'function') {
                throw 'second argument should be function'
            }

            if(!this.versions[version]) {
                this.versions[version] = [];
                this.versionNumbers.push(version);
                this.versionNumbers.sort();
            }

            this.maxVersion = Math.max(this.maxVersion, newVersion);

            this.versions[version].push(fn);
        }

        function errorMessageFor(e) {
            if (e.target.readyState === readyState.pending) {
                return "Error: Operation pending";
            } else {
                return e.target.webkitErrorMessage || e.target.error.message || e.target.errorCode;
            }
        }

        // Service
        moduleService.$inject = ['$q', '$rootScope', '$log']
        function moduleService($q, $rootScope, $log) {
            var dbConnections = {};
            // service return apis
            return {
                /**
                 * Create a new connection
                 * \return: promise connection object
                 */
                createConnection: createConnection,

                /**
                 * Open an existing connection if exists. creates a new connection if does not exists
                 * \param dbName [optional] - database name, if missing will use default dbName
                 * \return: promise connection object
                 */
                connection: openConnection
            };

            function openConnection(dbName) {
                if(!dbName) {
                    dbName = defaultConnectionName;
                }

                if(!dbName) {
                    throw 'Connection name is missing';
                }

                var connection;

                if(!dbConnections[dbName]) {
                    // create a new connection
                    connection = createConnection(dbName);
                } else {
                    // return first active connection
                    connection = dbConnections[dbName][0];
                }

                return connection;
            }

            function createConnection (dbName) {
                if(!dbName) {
                    dbName = defaultConnectionName;
                }

                if(!dbName) {
                    throw 'Connection name is missing';
                }

                if(!dbConnections[dbName]) {
                    dbConnections[dbName] = [];
                }

                var dfd = $q.defer(),
                    dbConnection = ;

                dbConnections[dbName].push(dfd.promise);
                dfd.promise.db = {};
                dfd.promise.db.config = connectionConfigs[dbName] || {};
                dfd.promise.db.version = dfd.promise.db.config.maxVersion || 1;
                dfd.promise.db.connection = indexedDB.open(dbName, dfd.promise.db.version);
                dfd.promise.db.connection.onsuccess = function() {
                    db = dfd.promise.db.connection.result;
                    $rootScope.$apply(function() {
                        dfd.resolve(db);
                    });
                };

                dfd.promise.db.connection.onblocked = dfd.promise.db.connection.onerror = rejectWithError(dfd);

                dfd.promise.db.connection.onupgradeneeded = function(event) {
                    var tx;
                    var db = dfd.promise.db.db = event.target.result;
                    var tx = dfd.promise.db.transaction = event.target.transaction;
                    $log.debug("$indexedDBPromise: Upgrading database '" + db.name + "' from version " + event.oldVersion + " to version " + event.newVersion + " ...");
                    applyNeededUpgrades(event.oldVersion, event, dfd.promise);
                }

                dfd.promise.createObjectStore = function() {
                    return dfd.promise.db.db.createObjectStore.apply(dfd.promise.db.db, arguments);
                }

                dfd.promise.close = function() {
                    return dfd.promise.then(function() {

                        dfd.promise.db.db.close();
                        return dbPromise = null;
                    });
                };

                return dfd.promise;
            }

            function applyNeededUpgrades(oldVersion, event, dbPromise) {
                var i,
                    versionNumbers = dbPromise.db.config.versionNumbers,
                    versions = dbPromise.db.config.versions;
                for (var i = 0; i < versionNumbers.length ; ++ i) {
                    var versionNumber = versionNumbers[i],
                        versionCallbacks =  versions[versionNumber],
                        j;
                    // skip old versions
                    if(oldVersion >= versionNumber) {
                        continue;
                    }

                    for(j = 0; j < versionCallbacks.length; ++j) {
                        versionCallbacks[j](event, dbPromise);
                    }
                }
            }

            function rejectWithError(deferred) {
                return function(error) {
                    return $rootScope.$apply(function() {
                       return deferred.reject(errorMessageFor(error));
                    });
                };
            };
        }
    });
}());
