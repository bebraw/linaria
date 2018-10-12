const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const Module = require('module');
const loaderUtils = require('loader-utils');
const transform = require('./transform');

module.exports = function loader(
  content /* :string */,
  inputSourceMap /* :?Object */
) {
  const { sourceMap, ...rest } = loaderUtils.getOptions(this) || {};

  const outputDirectory = path.join(
    process.cwd(),
    'node_modules',
    '.linaria-cache'
  );

  const outputFilename = path.join(
    outputDirectory,
    path.relative(
      process.cwd(),
      this.resourcePath.replace(/\.[^.]+$/, '.linaria.css')
    )
  );

  const result = transform(
    this.resourcePath,
    content,
    rest,
    inputSourceMap,
    outputFilename
  );

  if (result.cssText) {
    let { cssText } = result;

    if (sourceMap) {
      cssText += `/*# sourceMappingURL=data:application/json;base64,${Buffer.from(
        result.cssSourceMapText
      ).toString('base64')}*/`;
    }

    if (result.dependencies && result.dependencies.length) {
      result.dependencies.forEach(dep => {
        try {
          const f = Module._resolveFilename(dep, {
            id: this.resourcePath,
            filename: this.resourcePath,
            paths: Module._nodeModulePaths(path.dirname(this.resourcePath)),
          });

          this.addDependency(f);
        } catch (e) {
          // Ignore
        }
      });
    }

    mkdirp.sync(path.dirname(outputFilename));
    fs.writeFileSync(outputFilename, cssText);

    this.callback(
      null,
      `${result.code}\n\nrequire("${outputFilename}")`,
      result.sourceMap
    );
    return;
  }

  this.callback(null, result.code, result.sourceMap);
};
