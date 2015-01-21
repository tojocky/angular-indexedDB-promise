(function() {
    'use strict';
    angular.module('ilu.indexedDB', []).provider('$indexedDB', function() {
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

        function ConnectionConfig(dbName, isDefault) {
            if(!(this instanceof ConnectionConfig) {
               return new ConnectionConfig(dbName, isDefault);
            }

            this.name = dbName;
            this.versions = {};

            if(!defaultConnectionName || isDefault) {
                defaultConnectionName = dbName;
            }

            connectionConfigs[dbName] = this;
        }

        ConnectionConfig.prototype.upgrade = function(newVersion, fn) {
            version = Number(newVersion);
            if(typeof(version) != 'number') {
                throw 'first argument (' + newVersion + ') should be number';
            }

            if(typeof(fn) != 'function') {
                throw 'second argument should be function'
            }

            this.versions[version] = fn;
        }
    });
}());
