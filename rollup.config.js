import rollupBabel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import nodeResolve from 'rollup-plugin-node-resolve';
import json from 'rollup-plugin-json';
import uglify from 'rollup-plugin-uglify';
import replace from 'rollup-plugin-replace';

const minify = process.env.MINIFY;
const format = process.env.FORMAT;
const esm = format === 'es';
const umd = format === 'umd';
const cjs = format === 'cjs';

let targets;

if (esm) {
  targets = [{ dest: `dist/rallymetrics.es.js`, format: 'es' }];
} else if (umd) {
  if (minify) {
    targets = [{ dest: `dist/rallymetrics.umd.min.js`, format: 'umd' }];
  } else {
    targets = [{ dest: `dist/rallymetrics.umd.js`, format: 'umd' }];
  }
} else if (cjs) {
  targets = [{ dest: `dist/rallymetrics.cjs.js`, format: 'cjs' }];
} else if (format) {
  throw new Error(`invalid format specified: "${format}".`);
} else {
  throw new Error('no format specified. --environment FORMAT:xxx');
}

const entry = 'src/main.js';
const exports = esm ? 'named' : 'default';

export default {
  entry,
  targets,
  exports,
  moduleName: 'rallymetrics',
  format,
  external: [],
  globals: {},
  plugins: [
    umd
      ? replace({
          'process.env.NODE_ENV': JSON.stringify(minify ? 'production' : 'development'),
        })
      : null,
    nodeResolve({ jsnext: true, main: true, browser: true }),
    commonjs({ include: 'node_modules/**' }),
    json(),
    rollupBabel({
      exclude: 'node_modules/**',
      babelrc: false,
      presets: [
        [
          'env',
          {
            targets: {
              node: 'current',
              browsers: [
                'last 2 versions',
                'not IE 10',
                'not ExplorerMobile 10',
                'not ExplorerMobile 11',
              ],
            },
            modules: false,
          },
        ],
        'stage-2',
      ],
      plugins: ['external-helpers'],
    }),
    minify ? uglify() : null,
  ].filter(Boolean),
};

// this is not transpiled
/*
  eslint
  max-len: 0,
  comma-dangle: [
    2,
    {
      arrays: 'always-multiline',
      objects: 'always-multiline',
      functions: 'never'
    }
  ]
 */
