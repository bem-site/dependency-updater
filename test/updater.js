var fs = require('fs'),
    path = require('path'),
    should = require('should'),
    mockFs = require('mock-fs'),
    DependencyUpdater = require('../lib/updater');

describe('lib/updater', function () {
    describe('__constructor', function () {
        var o;

        beforeEach(function () {
            o = { cron: { pattern: '0 0 */1 * * *' }, logger: {} };
        });

        it('should throw error if "updateScript" option field was not set', function () {
            (function () {
                return new DependencyUpdater(o);
            }).should.throw('Update script was not set in configuration');
        });

        it('should throw error if "dependencyName" option field was not set', function () {
            o['updateScript'] = 'npm update bse-admin';
            (function () {
                return new DependencyUpdater(o);
            }).should.throw('Name of target dependency was not set in configuration');
        });

        it('should be successfully initialized', function () {
            o['updateScript'] = 'npm update bse-admin';
            o['dependencyName'] = 'bse-admin';
            var du = new DependencyUpdater(o);

            du._options.should.be.ok;
            du._logger.should.be.ok;

            du._options['updateScript'].should.be.equal('npm update bse-admin');
            du._options['dependencyName'].should.be.equal('bse-admin');
        });
    });

    describe('instance methods', function () {
        var o,
            du;

        beforeEach(function () {
            o = {
                cron: {
                    pattern: '0 0 */1 * * *'
                },
                logger: {},
                updateScript: 'npm update bse-admin',
                dependencyName: 'bse-admin'
            };
            du = new DependencyUpdater(o);
        });

        describe('_onError', function () {
            it('should throw error', function () {
                (function () {
                    return du._onError(new Error('error'));
                }).should.throw('error');
            });
        });

        describe('_getLocalVersion', function () {
            var versionFile = './temp/version.txt';

            beforeEach(function () {
                mockFs({ temp: {} });
            });

            afterEach(function () {
                mockFs.restore();
            });

            it('should return null if version file does not exists', function (done) {
                du._getLocalVersion(versionFile).then(function (version) {
                    should(version).equal(null);
                    done();
                });
            });

            it('should return null if version file does not exists', function (done) {
                fs.writeFileSync(versionFile, '0.0.1', { encoding: 'utf-8' });
                du._getLocalVersion(versionFile).then(function (version) {
                    should(version).equal('0.0.1');
                    done();
                });
            });
        });

        describe('_getRemoteVersion', function () {
            it('should return last version of package via npm API (without local version)', function (done) {
                du._getLastVersionFromNpm('bse-admin').then(function (version) {
                    version.match(/\d{1,2}\.\d{1,2}\.\d{1,2}/).should.be.ok;
                    done();
                });
            });

            it('should return last version of package via npm API (with local version)', function (done) {
                du._getLastVersionFromNpm('bse-admin', '2.0.0').then(function (version) {
                    version.match(/\d{1,2}\.\d{1,2}\.\d{1,2}/).should.be.ok;
                    done();
                });
            });
        });

        describe('_executeScript', function () {
            it('should execute given command', function (done) {
                du._executeScript(process.cwd(), 'ls').then(function () {
                    done();
                });
            });
        });

        /*
        describe('_overwriteLocalVersion', function () {

        });
        */

        /*
        describe('execute', function () {

        });
        */
    });
});
