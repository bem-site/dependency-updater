var fs = require('fs'),
    path = require('path'),
    inherit = require('inherit'),

    npm = require('npm'),
    vow = require('vow'),
    cpp = require('child-process-promise'),
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
     * Loads package version from remote npm registry
     * @param {String} packageName - configured name of npm package
     * @returns {vow.Promise}
     * @private
     */
    _getRemoteVersion: function (packageName) {
        var def = vow.defer();
        npm.commands['view']([packageName, 'version'], function (error, result) {
            if (error) {
                this._logger.error('Can not read npm version for package %s', packageName);
            }
            def.resolve(error ? null : result);
        });
        return def.promise();
    },

    /**
     * Executes configured script for app folder
     * @param {String} appFolder - path to app folder
     * @param {String} cmd - unix command
     * @returns {vow.Promise}
     * @private
     */
    _executeScript: function (appFolder, cmd) {
        return cpp.exec(cmd, { cwd: appFolder, encoding: 'utf-8', maxBuffer: 1000 * 1024 })
            .then(function () {
                this._logger.info('script has been successfully executed');
                this._logger.info('cmd: %s', cmd);
                this._logger.info('cwd: %s', appFolder);
            }, this)
            .fail(function (error) {
                this._logger.error('script has been failed with error');
                this._logger.error(error.message);
                throw error;
            }, this);
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

        fs.mkdirSync(tempFolder);

        return vow
            .all([
                this._getLocalVersion(versionFile),
                this._getRemoteVersion(this._options['dependencyName'])
            ])
            .spread(function (local, remote) {
                if (!remote) {
                    throw new Error('npm version can not be retrieved');
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
                this._logger.info('-- end execute dependency updater -- ');
            }, this)
            .fail(this._onError);
    }
}, {
    TEMP_FOLDER: 'temp'
});
