var fs = require('fs'),
    path = require('path'),
    should = require('should'),
    mockFs = require('mock-fs'),
    fsExtra = require('fs-extra'),
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
                appFolders: [
                    process.cwd()
                ],
                updateScript: 'mkdir ./temp/script-result',
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
            it('should return last version of package via npm API', function (done) {
                du._getLastVersionFromNpm('bse-admin').then(function (version) {
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

        describe('_overwriteLocalVersion', function () {
            var versionFile = './temp/version.txt';

            beforeEach(function () {
                mockFs({ temp: {} });
            });

            afterEach(function () {
                mockFs.restore();
            });

            it('should successfully overwrite local version', function (done) {
                du._overwriteLocalVersion(versionFile, '0.0.1')
                    .then(function () {
                        return du._getLocalVersion(versionFile);
                    })
                    .then(function (version) {
                        version.should.equal('0.0.1');
                        done();
                    });
            });

            it('should return rejected promise on error', function (done) {
                du._overwriteLocalVersion().fail(function (error) {
                    error.should.be.ok;
                    done();
                })
            });
        });

        describe('execute', function () {
            before(function () {
                fsExtra.removeSync('./temp');
            });

            after(function () {
               fsExtra.removeSync('./temp');
            });

            it('should execute at first time', function (done) {
                du.execute().then(function () {
                    fs.existsSync('./temp').should.equal(true);
                    fs.existsSync('./temp/version.txt').should.equal(true);
                    fs.readFileSync('./temp/version.txt', { encoding: 'utf-8' })
                        .match(/\d{1,2}\.\d{1,2}\.\d{1,2}/).should.be.ok;
                    done();
                });
            });

            it('should\'t do nothing if version was not changed', function (done) {
                du.execute().then(function () {
                    fs.existsSync('./temp/script-result').should.equal(false);
                    done();
                });
            });

            it('should to execute script if version was changed', function (done) {
                fs.writeFileSync('./temp/version.txt', '99.99.99', { encoding: 'utf-8' });
                du.execute().then(function () {
                    fs.readdirSync('./temp').should.be.instanceOf(Array).and.have.length(2);
                    fs.readdirSync('./temp')[0].should.equal('script-result');
                    done();
                }).fail(function (error) {
                    console.log(error);
                });
            });
        });
    });
});

