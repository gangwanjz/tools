#!/usr/bin/env node

if (process.argv.length < 3) {
    console.log('Usage: node library-build.js <library-name>...');
    process.exit(-1);
}

var fs = require('fs');

var libraries = require('./libraries');
var configure = require('./webpack-configure');
var configs = process.argv.slice(2).map(function (libraryName) {
    var library = libraries[libraryName];
    var entryCode = [
        'var requires = [',
            library.entries.map(function (entry) {
                return '    function () { return require("' + entry + '"); },';
            }).join('\n'),
        '];',
        'module.exports = function (index) {',
        '    return requires[index]();',
        '};',
    ].join('\n');
    var entryFile = __dirname + '/library-entry-' + libraryName + '.js';  // FIXME
    fs.writeFileSync(entryFile, entryCode);
    return configure({
        libraryName: library.name,
        entry: entryFile,
        libraries: library.libraries,
    });
});

var builder = require('./builder');
builder(configs).run(function (stats) {
    configs.forEach(function (config) {
        fs.unlink(config.entry[0]);
    });

    if (stats.hasErrors()) {
        process.exitCode = 1;
        return;
    }

    var manifest = {};
    stats.stats.forEach(function (stat) {
        manifest[stat.compilation.options.output.libraryName] = stat.compilation.chunks[0].files[0];
    });

    var manifestPath = configs[0].output.path + '/lib/manifest.json';
    fs.writeFileSync(manifestPath, JSON.stringify(manifest));
    console.log(manifestPath);  // 这条日志用于向父进程传递数据，请勿删除
});
