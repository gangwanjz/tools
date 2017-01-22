
var RawSource = require("webpack-core/lib/RawSource");

var HtmlLibraryPlugin = function (libraries, libraryManifest) {
    this.libraries = libraries;
    this.libraryManifest = libraryManifest;
};

HtmlLibraryPlugin.prototype.apply = function (compiler) {
    compiler.plugin('emit', function (compilation, callback) {
        var publicPath = compiler.options.output.publicPath;
        var libraryTags = this.libraries.map(function (library) {
            return '<script src="' + publicPath + this.libraryManifest[library] + '"></script>';
        }.bind(this)).join('\n');

        var html = compilation.assets['index.html'].source();
        html = html.replace(/<script /, libraryTags + '\n<script ');
        compilation.assets['index.html'] = new RawSource(html);
        callback();
    }.bind(this));
};

module.exports = HtmlLibraryPlugin;
