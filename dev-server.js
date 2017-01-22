
var http = require('http');
var url = require('url');
var express = require('express');
var webpack = require('webpack');
var WebpackDevServer = require('webpack-dev-server');
var httpProxy = require('http-proxy');

module.exports = function (webpackOptions) {
    var publicPath = webpackOptions.output.publicPath || '/';
    var server = new WebpackDevServer(webpack(webpackOptions), {
        contentBase: false,
        hot: webpackOptions._hot,
        noInfo: true,
        publicPath: publicPath,
    });

    server.app.use(function (req, res, next) {
        var fallbackToIndexIf = server.fallbackToIndexIf;
        if (fallbackToIndexIf != null && fallbackToIndexIf(req.url) && req.method === 'GET') {
            req.url = '/';
            return server.middleware.apply(this, arguments);
        }
        (server.ports[req.socket.localPort] || next)(req, res, next);
    });

    var proxy = httpProxy.createProxyServer();
    var serveStatic = express.static('.');
    var listen = function (port) {
        if (Object.keys(server.ports).length === 0) {
            server.listen(port);
        } else {
            http.createServer(server.app).listen(port);
        }
    };

    server.ports = {};
    server.localAt = function (port, urlMap) {
        listen(port);
        console.log('http://localhost:' + port + publicPath + ' (本地数据版)');

        urlMap = (urlMap || []).map(function (item) {
            return [toRegExp(item[0]), item[1]];
        });
        server.ports[port] = function (req, res, next) {
            if (req.method !== 'GET' && req.method !== 'HEAD') {
                req.method = 'GET';
            }
            var matched = urlMap.some(function (item) {
                var url = req.url;
                req.url = req.url.replace(item[0], item[1]);
                if (url != req.url) {
                    res.set('X-Mock-Rule', item[0]);
                    res.set('X-Mock-File', req.url);
                    return true;
                }
            });
            if (!matched) return next();
            serveStatic(req, res, next);
        };
    };
    server.proxyAt = function (port, remoteHost, remoteIndex) {
        remoteIndex = remoteIndex || publicPath;

        listen(port);
        console.log('http://localhost:' + port + remoteIndex + ' (后端数据版)');

        var restoreHost = (function () {
            var rp = remoteHost.split(':');
            var rh = rp[1] ? new RegExp(rp[0] + '(:|%(25)*?3A)' + rp[1], 'g') : rp[0];
            var lh = (rp[1] ? '$1' : ':') + port;
            return function (s, localhostname) {
                return s.replace(rh, localhostname + lh);
            };
        })();

        proxy.on('proxyRes', function (res, req) {
            if (res.headers.location) {
                res.headers.location = restoreHost(res.headers.location, req.hostname);
            }
        });

        var authDetectionOptions = url.parse('http://' + remoteHost + remoteIndex);
        var authMiddleware = function (req, res, next) {
            if (req.socket.localPort === port && url.parse(req.url).pathname === remoteIndex &&
                    req.method === 'GET') {
                authDetectionOptions.headers = Object.assign({}, req.headers);
                authDetectionOptions.headers.host = remoteHost;
                http.get(authDetectionOptions, function (detectionRes) {
                    if (detectionRes.statusCode === 302) {
                        detectionRes.headers.location = restoreHost(
                            detectionRes.headers.location, req.hostname);
                        delete detectionRes.headers['content-length'];
                        res.status(302);
                        res.set(detectionRes.headers);
                        res.end();
                    } else {
                        detectionRes.setEncoding('utf8');
                        var body = "";
                        detectionRes.on('data', function (chunk) {
                            body += chunk;
                        });
                        detectionRes.on('end', function () {
                            if (/^\s*<script>/.test(body)) {
                                delete detectionRes.headers['content-length'];
                                res.status(detectionRes.statusCode);
                                res.set(detectionRes.headers);
                                res.end(restoreHost(body, req.hostname));
                            } else {
                                req.url = publicPath;
                                next();
                            }
                        });
                    }
                }).on('error', function () {
                    req.url = publicPath;
                    next();
                });
            } else {
                next();
            }
        };
        server.app.use(authMiddleware);
        (function (stack) {
            stack.splice(2, 0, stack[stack.length-1]);
            stack.splice(stack.length-1, 1);
            stack.find(m => m.name === 'webpackDevMiddleware').handle = function (req, res, next) {
                if (req.method !== 'GET' && req.method !== 'HEAD') return next();
                server.middleware.apply(this, arguments);
            };
        })(server.app._router.stack);

        server.ports[port] = function (req, res) {
            proxy.web(req, res, {
                target: 'http://' + remoteHost,
                changeOrigin: true,
            }, function (err) {
                res.statusCode = 502;
                res.end('无法代理到 ' + req.url + ' (' + err.message + ')');
            });
        };
    };

    return server;
};

function toRegExp (s) {
    return s instanceof RegExp ? s : new RegExp('^' + s + '$');
}
