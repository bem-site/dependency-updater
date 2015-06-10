var fs = require('fs'),
    cp = require('child_process'),
    path = require('path'),
    inherit = require('inherit'),

    vow = require('vow'),
    av = require('available-versions'),
    Logger = require('bem-site-logger'),
    CronRunner = require('cron-runner');

module.exports = inherit(CronRunner, {

    _logger: undefined,

    __constructor: function (options) {
        this.__base(options);

        this._logger = Logger.createLogger(module);
        var o = this._options;

        if (!o['updateScript']) {
            throw new Error('Update script was not set in configuration');
        }

        if (!o['dependencyName']) {
            throw new Error('Name of target dependency was not set in configuration');
        }
    },

    /**
     * Error handler
     * @param {Error} error object
     * @private
     */
    _onError: function (error) {
        this._logger.error('Error occur while update service dependency');
        this._logger.error(error.message);
        throw error;
    },

    /**
     * Loads cached package version from local filesystem
     * @param {String} versionFile - path to local file
     * @returns {vow.Promise}
     * @private
     */
    _getLocalVersion: function (versionFile) {
        var def = vow.defer();
        fs.readFile(versionFile, { encoding: 'utf-8' }, function (error, version) {
            if (error) {
                this._logger.error('Can not read local version');
            }
            def.resolve(error ? null : version);
        }.bind(this));
        return def.promise();
    },

    /**
     * Loads name of last package version from remote npm registry
     * @param {String} packageName - configured name of npm package
     * @returns {vow.Promise}
     * @private
     */
    _getLastVersionFromNpm: function (packageName) {
        var query = { name: packageName };
        return av(query).then(function (result) {
            var versions = result.versions,
                lastVersion = versions.pop();
            this._logger.info('Retrieve last version [%s] for package: %s', lastVersion, packageName);
            return lastVersion;
        }.bind(this));
    },

    /**
     * Executes configured script for app folder
     * @param {String} appFolder - path to app folder
     * @param {String} cmd - unix command
     * @returns {vow.Promise}
     * @private
     */
    _executeScript: function (appFolder, cmd) {
        var def = vow.defer(),
            o = { cwd: appFolder, encoding: 'utf-8', maxBuffer: 1000 * 1024 };

        cp.exec(cmd, o, function (error, stdout, stderr) {
            if (error) {
                return this._onError(error);
            }
            this._logger.debug('stdout: %s', stdout);
            this._logger.warn('stderr: %s', stderr);
            def.resolve();
        }.bind(this));

        return def.promise();
    },

    _overwriteLocalVersion: function (versionFile, version) {
        var def = vow.defer();
        fs.writeFile(versionFile, version, { encoding: 'utf-8' }, function (error) {
            error ? def.reject(error) : def.resolve();
        }.bind(this));
        return def.promise();
    },

    execute: function () {
        this._logger.info('-- start execute dependency updater --');

        var tempFolder = path.join(process.cwd(), this.__self.TEMP_FOLDER),
            versionFile = path.join(tempFolder, 'version.txt');

        try {
            fs.mkdirSync(tempFolder);
        }catch (error) {
            if (error.code === 'EEXIST') {
                this._logger.warn('folder: %s already exists', tempFolder);
            }
        }

        return this._getLocalVersion(versionFile)
            .then(function (version) {
                return vow.all([
                    vow.resolve(version),
                    this._getLastVersionFromNpm(this._options['dependencyName'])
                ]);
            }, this)
            .spread(function (local, remote) {
                if (!remote) {
                    throw new Error('npm version can not be retrieved');
                }

                if (!local) {
                    return this._overwriteLocalVersion(versionFile, remote);
                }

                if (local === remote) {
                    return vow.resolve();
                }

                var cmdTasks = this._options['appFolders'].map(function (appFolder) {
                    return this._executeScript(appFolder, this._options['updateScript']);
                }, this);

                return vow.all(cmdTasks).then(function () {
                    return this._overwriteLocalVersion(versionFile, remote);
                }, this);
            }, this)
            .then(function () {
                this._logger.info('-- end execute dependency updater --');
                return vow.resolve();
            }, this)
            .fail(this._onError.bind(this));
    }
}, {
    TEMP_FOLDER: 'temp'
});
