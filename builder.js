
var webpack = require("webpack");

module.exports = function (webpackOptions) {
    var builder = {};

    builder.compiler = webpack(webpackOptions);

    builder.outputOptions = {
        colors: require("supports-color"),
        chunks: true,
        modules: true,
        chunkModules: true,
        reasons: true,
        cached: true,
        cachedAssets: true,
    };
    var lastHash = null;
    builder.compilerCallback = function (err, stats) {
        if(err) {
            lastHash = null;
            console.error(err.stack || err);
            if(err.details) console.error(err.details);
            process.on("exit", function() {
                process.exit(1);
            });
            return;
        }
        if(stats.hash !== lastHash) {
            lastHash = stats.hash;
            process.stdout.write(stats.toString(builder.outputOptions) + "\n");
            if (builder.callback) {
                builder.callback(stats);
            }
        }
    };

    builder.run = function (callback) {
        builder.callback = callback;
        builder.compiler.run(builder.compilerCallback);
    };

    return builder;
};
