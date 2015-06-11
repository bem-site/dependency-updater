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

        // 'updateScript' - обязательный параметр. Если он отсутствует
        // в переданных опциях, то кидается соответствующее исключение
        if (!o['updateScript']) {
            throw new Error('Update script was not set in configuration');
        }

        // 'dependencyName' - обязательный параметр. Если он отсутствует
        // в переданных опциях, то кидается соответствующее исключение
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
        /*
            здесь происходит получение объекта
            {
                name: 'packageName,
                versions: ['x1.y1.z1', 'x2.y2.z2', 'x3.y3.z4', ...]
            }
            При этом версии пакета отсортированы от старых к новым
            Таким образом последний элемент в массиве - это и есть последняя версия пакета в npm
            Она возвращается как результат выполнения функции
         */
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
            appName = appFolder.split('/').pop(),
            o = { cwd: appFolder, encoding: 'utf-8', maxBuffer: 1000 * 1024 };

        cmd = cmd.replace('{app}', appName);

        this._logger.info('Execute: %s', cmd);

        /*
         * В дочернем процессе выполняется unix команда переданная в параметре cmd
         * При выполнении этой команды "домашней директорией" считается директория,
         * переданная в параметре appFolder
         */
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

    /**
     * Save version value to versionFile
     * @param {String} versionFile - path to local file
     * @param {String} version - new package version
     * @returns {*}
     * @private
     */
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

        // создаем директорию ./temp
        try {
            fs.mkdirSync(tempFolder);
        }catch (error) {
            if (error.code === 'EEXIST') {
                this._logger.warn('folder: %s already exists', tempFolder);
            }
        }

        /*
        Загружаются версии npm пакета с локальной файловой системы (кешированная) и с npm реестра
        */
        return vow.all([
                this._getLocalVersion(versionFile),
                this._getLastVersionFromNpm(this._options['dependencyName'])
            ])
            .spread(function (local, remote) {
                if (!remote) {
                    throw new Error('npm version can not be retrieved');
                }

                /*
                Если локальной версии нет, например в случае первого запуска,
                то просто сохраняем текущую версию npm пакета в файл
                */
                if (!local) {
                    return this._overwriteLocalVersion(versionFile, remote);
                }

                /*Версия npm пакета не изменилась*/
                if (local === remote) {
                    return vow.resolve();
                }

                /*
                 * Версия npm пакета изменилась.
                 * Для каждой директории из конфигурационного параметра appFolders
                 * запускается выполнение скрипта updateScript
                 */
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
