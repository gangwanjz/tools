
process.env.UV_THREADPOOL_SIZE = 100;

var env = process.env;
// env.MTF_PROFILE
// env.MTF_OUTPUT_PATH
// env.MTF_LIBRARY_MANIFEST
// env.MTF_PUBLIC_PATH

var fs = require('fs');
var path = require('path');
var webpack = require('webpack');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var HtmlLibraryPlugin = require('./webpack-html-library-plugin');
var autoprefixer = require('autoprefixer');

var abspath = path.join.bind(path, process.cwd());

module.exports = function (profile, config) {
    if (!config) {
        config = profile;
        profile = env.MTF_PROFILE;
    }

    var _dev_ = profile === 'dev';
    var _tst_ = profile === 'test';
    var _dbg_ = profile === 'dist-debug';
    var _rls_ = profile === 'dist-release';

    var _lib_ = 'libraryName' in config;

    if (!(_dev_ || _tst_ || _dbg_ || _rls_)) {
        throw 'webpack-configure: invalid profile';
    }

    var c = {};

    c.entry = [];
    if (config.entries) {
        c.entry = config.entries.slice();
    }
    if (config.entry) {
        c.entry.push(config.entry[0] === '/' ? config.entry : abspath(config.entry));  // FIXME
    }

    c.output = {};
    c.output.path = env.MTF_OUTPUT_PATH || abspath('dev/build');
    var distDir = _tst_ ? '.' : _lib_ ? 'lib' : 'dist';
    c.output.filename = distDir + '/' +
        (_lib_ ? config.libraryName : 'bundle') +
        // 不在开发模式的文件名中加入 hash，否则修改后首次刷新时断点会失效
        (_dev_ || _tst_ ? '' : '-[hash:8]') + '.js';
    c.output.chunkFilename = distDir + '/' +
        (_lib_ ? config.libraryName : 'bundle-[name]') +
        // 不在开发模式的文件名中加入 hash，否则修改后首次刷新时断点会失效
        (_dev_ || _tst_ ? '' : '-[chunkhash:8]') + '.js';
    c.output.publicPath = env.MTF_PUBLIC_PATH || '/';
    if (_lib_) {
        c.output.library = 'mtf_' + config.libraryName;
        c.output.libraryName = config.libraryName;
    }
    if (_tst_) {
        c.output.libraryTarget = 'commonjs2';
    }

    c.module = {};
    c.module.loaders = [];
    var __pathMark = __dirname + '/webpack-path-mark-loader';
    c.module.loaders.push({test: /\.css$/,
        loaders: ['style', 'css', __pathMark, 'postcss'] });
    c.module.loaders.push({ test: /\.less$/,
        loaders: ['style', 'css', __pathMark, 'postcss', 'less'] });
    c.module.loaders.push({ test: /\.(sass|scss)$/,
        loaders: ['style', 'css', __pathMark, 'postcss', 'sass'] });
    c.module.loaders.push({ test: /\.jsx?$/, exclude: /node_modules\/(?!mtf.)/,
        loaders: [/*'es3ify', */__dirname + '/webpack-async-require-loader'] });
    c.module.loaders.push({ test: /\.jsx?$/,
        exclude: /node_modules\/(?!mtf.)/,
        loader: 'babel',
        query: resolveBabelQuery({
            cacheDirectory: true,
            presets: ['es2015', 'stage-1', 'react'],
            plugins: [
                'transform-decorators-legacy',
                ['fast-async', { compiler: { wrapAwait: true } }],
                ['antd', { style: true }],
            ],
        })});
    c.module.loaders.push({ test: /\.json$/,
        loaders: ['json'] });
    c.module.loaders.push({ test: /\.(png|jpg|jpeg|gif|ico)$/,
        loader: 'file?name=' + distDir + '/imgs/[name]-[hash:8].[ext]' });
    c.module.loaders.push({ test: /\.(woff|ttf|eot|svg)(\?[\w\d#]+)?$/,
        loader: 'file?name=' + distDir + '/fonts/[name]-[hash:8].[ext]' });
    c.module.noParse = [];

    c.resolve = {};
    c.resolve.alias = {};
    c.resolve.alias[require(abspath('package.json')).name] = abspath('.');
    c.resolve.root = [path.resolve('node_modules'), path.resolve('../../node_modules')];
    c.resolve.extensions = ['', '.js', '.jsx'];

    c.resolveLoader = {};
    c.resolveLoader.modulesDirectories = ['node_modules/mtf.devtools/node_modules', 'node_modules'];

    // c.externals
    if (config.libraries) {
        c.externals = resolveExternals(config.libraries);
    }

    // c.devtool
    if (_dev_ || _tst_ || _dbg_) {
        c.devtool = '#cheap-source-map';
    }

    c.plugins = [];
    if (!(_lib_ || _tst_)) {
        c.plugins.push(new HtmlWebpackPlugin(config.html ? {
            // minimize=false 阻止对 html 的压缩，因为压缩会删掉 </body> 导致主 js 无法被插入
            template: 'html?attrs=link:href&minimize=false!' + abspath(config.html),
        } : {}));
    }
    if (!_lib_ && config.libraries) {
        var libraryManifest = require('./library-manifest').load(config.libraries);
        c.plugins.push(new HtmlLibraryPlugin(config.libraries, libraryManifest));
    }
    if (_tst_ || _dbg_ || _rls_) {
        c.plugins.push(new webpack.optimize.DedupePlugin());
    }
    if (_rls_) {
        c.plugins.push(new webpack.optimize.UglifyJsPlugin());
        c.plugins.push(new webpack.DefinePlugin({
            'process.env': {
                NODE_ENV: JSON.stringify('production')
            },
        }));
    }
    c.plugins.push(new webpack.DefinePlugin({
        'process.env': {
            PUBLIC_PATH: JSON.stringify(process.env.MTF_PUBLIC_PATH),
        },
    }));

    c.sassLoader = {};
    if (config.theme) {
        c.sassLoader.data = fs.readFileSync(config.theme, { encoding: 'utf-8' });
    }

    c.postcss = [];
    c.postcss.push(autoprefixer());

    return c;
};

module.exports.abspath = abspath;

var libraries = require('./libraries');
var resolveExternals = function (libraries_) {
    var importMap = {};
    libraries_.forEach(function (name) {
        libraries[name].entries.forEach(function (entry, index) {
            importMap[entry] = 'var mtf_' + name + '(' + index + ')';
        });
    });
    var contextMap = {};
    var externals = [function (context, request, callback) {
        if (request[0] == '.') {
            var index = request.lastIndexOf('/node_modules/');
            if (index !== -1) {
                request = request.slice(index + '/node_modules/'.length);
            } else {
                if (!contextMap.hasOwnProperty(context)) {
                    var pkgRoot = context;
                    while (!pkgConfig) {
                        try {
                            var pkgConfig = require(path.join(pkgRoot, 'package.json'));
                        } catch (e) {
                            pkgRoot = path.join(pkgRoot, '../');
                        }
                    }
                    contextMap[context] = pkgConfig.name + context.slice(pkgRoot.length - 1);
                }
                request = path.join(contextMap[context], request);
            }
        }
        if (importMap.hasOwnProperty(request)) {
            callback(null, importMap[request]);
        } else {
            callback();
        }
    }];
    externals.importMap = importMap;
    return externals;
};
module.exports.resolveExternals = resolveExternals;

function resolveBabelQuery(query) {
    var ret = Object.assign({}, query);
    ret.presets = query.presets.map(resolveBabelQueryItem.bind(null, 'babel-preset-'));
    ret.plugins = query.plugins.map(function (plugin) {
        return typeof plugin === 'string' ? resolveBabelQueryItem('babel-plugin-', plugin) :
          [resolveBabelQueryItem('babel-plugin-', plugin[0])].concat(plugin.slice(1));
    });
    return ret;
}
function resolveBabelQueryItem(prefix, name) {
    try {
        return require.resolve(prefix + name);
    } catch (e) {
        return require.resolve(name);
    }
}
module.exports.resolveBabelQuery = resolveBabelQuery;
