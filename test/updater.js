var path = require('path'),
    should = require('should'),
    // mockFs = require('mock-fs'),
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

    /*
    describe('instance methods', function () {
        describe('_onError', function () {

        });

        describe('_getLocalVersion', function () {

        });

        describe('_getRemoteVersion', function () {

        });

        describe('_executeScript', function () {

        });

        describe('_overwriteLocalVersion', function () {

        });

        describe('execute', function () {

        });
    });
    */
});
