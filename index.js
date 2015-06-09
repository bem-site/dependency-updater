var fsExtra = require('fs-extra'),
    DependencyUpdater = require('./lib/updater');

fsExtra.readJSON('./config/_config.json', function (error, config) {
    if (error) {
        throw error;
    }
    var sc = new DependencyUpdater(config);
    sc.start();
});
