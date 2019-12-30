"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globby_1 = __importDefault(require("globby"));
const path_1 = require("path");
const environment_1 = require("./environment");
const babel_remove_function_1 = require("./plugins/babel-remove-function");
const utils_1 = require("./utils");
/*
Refresh the following two constants periodically by running with 'last 2 versions' and debug=true
Modifications:
  android: remove - Follows Chrome version
  opera: 60 - Use Chromium
  edge: 18 - 17 is legacy
  ie: remove - Is more than legacy
*/
exports.minimumSupportedBrowsers = {
    chrome: '74',
    edge: '18',
    firefox: '67',
    ios: '11',
    opera: '60',
    safari: '11',
    samsung: '8.2'
};
exports.unneededBabelPlugins = [
    '@babel/plugin-transform-regenerator',
    '@babel/transform-template-literals',
    '@babel/plugin-transform-function-name',
    '@babel/proposal-async-generator-functions',
    '@babel/proposal-object-rest-spread'
];
async function checkTypescript(rulesOptions, srcFolder) {
    if (typeof rulesOptions.typescript === 'boolean') {
        return rulesOptions.typescript;
    }
    return (await globby_1.default(path_1.resolve(srcFolder, './**/*.ts'))).length > 0;
}
exports.checkTypescript = checkTypescript;
async function checkReact(rulesOptions, srcFolder) {
    if (typeof rulesOptions.react === 'boolean') {
        return rulesOptions.react;
    }
    return (await globby_1.default(path_1.resolve(srcFolder, './**/*.(jsx|tsx)'))).length > 0;
}
exports.checkReact = checkReact;
function normalizeIncludePath(path) {
    const components = path.split(path_1.sep);
    if (components[0] === 'src') {
        components.shift();
    }
    else if (components[0] === 'node_modules') {
        components.splice(0, components[1][0] === '@' ? 3 : 2); // Remove the folder, the scope (if present) and the package
    }
    return components.join(path_1.sep);
}
exports.normalizeIncludePath = normalizeIncludePath;
async function setupRules(options) {
    const rulesOptions = options.rules || {};
    const babelOptions = options.babel || {};
    const useBabel = utils_1.get(rulesOptions, 'babel', true);
    const useTypescript = await checkTypescript(rulesOptions, options.srcFolder);
    const useReact = await checkReact(rulesOptions, options.srcFolder);
    const babelPresets = [
        [
            '@babel/preset-env',
            {
                targets: utils_1.get(babelOptions, 'browsersWhiteList', { esmodules: true }),
                exclude: utils_1.get(babelOptions, 'exclude', exports.unneededBabelPlugins),
                modules: utils_1.get(babelOptions, 'modules', false),
                debug: utils_1.get(babelOptions, 'envDebug', false)
            }
        ]
    ];
    const babelPlugins = [
        ['@babel/plugin-proposal-class-properties', { loose: false }],
        '@babel/plugin-proposal-optional-catch-binding'
    ];
    if (options.environment === 'production') {
        const removeFunctions = utils_1.get(babelOptions, 'removeFunctions', ['debugClassName']);
        if (removeFunctions.length) {
            for (const name of removeFunctions) {
                babelPlugins.unshift(babel_remove_function_1.babelRemoveFunction({ name }));
            }
        }
    }
    const babelConfiguration = utils_1.get(babelOptions, 'configuration', {});
    let rules = [];
    if (useBabel) {
        rules.push({
            test: /\.js$/,
            exclude: /node_modules/,
            use: {
                loader: 'babel-loader',
                options: Object.assign({ presets: babelPresets, plugins: babelPlugins }, babelConfiguration)
            }
        });
    }
    if (useTypescript) {
        rules.push({
            test: /\.ts$/,
            exclude: /node_modules/,
            use: {
                loader: 'babel-loader',
                options: Object.assign({ presets: babelPresets.concat('@babel/typescript'), plugins: babelPlugins }, babelConfiguration)
            }
        });
    }
    if (useReact) {
        rules.push({
            test: /\.jsx$/,
            exclude: /node_modules/,
            use: {
                loader: 'babel-loader',
                options: Object.assign({ presets: babelPresets.concat('@babel/react'), plugins: babelPlugins }, babelConfiguration)
            }
        });
        if (useTypescript) {
            rules.push({
                test: /\.tsx$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: Object.assign({ presets: babelPresets.concat('@babel/react', '@babel/typescript'), plugins: babelPlugins }, babelConfiguration)
                }
            });
        }
    }
    if (utils_1.get(rulesOptions, 'images', true)) {
        rules.push({
            test: /\.(?:bmp|png|jpg|jpeg|gif|svg|webp)$/,
            use: [
                {
                    loader: 'file-loader',
                    options: {
                        name: '[path][name]-[hash].[ext]',
                        outputPath: normalizeIncludePath,
                        publicPath: normalizeIncludePath
                    }
                }
            ]
        });
    }
    if (rulesOptions.additional) {
        rules = rules.concat(rulesOptions.additional);
    }
    return environment_1.runHook(rules, rulesOptions.afterHook);
}
exports.setupRules = setupRules;