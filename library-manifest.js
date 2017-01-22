
var env = process.env;

module.exports = {
    load: function (librariesForBuild) {
        if (!env.MTF_LIBRARY_MANIFEST) {
            console.log('Building libraries: ' + librariesForBuild.join(', '));
            var child_process = require('child_process');
            var result = child_process.spawnSync(process.argv[0], [__dirname + '/library-build.js']
                .concat(librariesForBuild), {encoding: 'utf8'});
            console.log(result.stdout);
            console.error(result.stderr);
            var output = result.stdout.trim();
            env.MTF_LIBRARY_MANIFEST = output.slice(output.lastIndexOf('\n') + 1);
        }
        return require(env.MTF_LIBRARY_MANIFEST);
    }
};
