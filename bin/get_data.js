/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// Start of section to be able to import redirector.js
const fs = require('fs');
const TOML = require('@iarna/toml');

// this line is needed to prevent the eval from blowing up
const header = 'function addEventListener() {}; ';
const footer = ' exports.workerPaths = workerPaths; ';
const body = fs.readFileSync('./workers/redirector.js');
var workerPaths = eval(header + body + footer);
// End of redirector.js import

const tomlConfigFile = fs.readFileSync('./wrangler.toml');
const tomlObj = TOML.parse(tomlConfigFile);

tomlObj['env']['staging']['routes'] = workerPaths['staging'];
tomlObj['env']['prod']['routes'] = workerPaths['prod'];

// Write routes out to wrangler.toml
fs.writeFileSync('./wrangler.toml', TOML.stringify(tomlObj));

console.log('done building the custom routes!');

