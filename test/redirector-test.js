/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const expect = require('chai').expect;
const sinon = require('sinon');

before(async function () {
    const context = new (require('@dollarshaveclub/cloudworker'))(require('fs').readFileSync('workers/redirector.js', 'utf8')).context;
    global.Request = context.Request;
    global.URL = context.URL;
    global.handleRequest = context.handleRequest;
    global.experimentPages = context.getData()['experimentPages'];
    global.workerPaths = context.getData()['workerPaths'];
});

// helper function to validate paths
function isValidPath(path) {
    try {
        const fullURL = 'http://fake.org' + path;
        new URL(fullURL);
    } catch (_) {
        return false;
    }

    return true;
}

describe('Redirector Worker', function() {

    const experimentPagesStub = [
        {
            'targetPath': `/en-US/firefox/new/`,
            'sandboxPath': `/en-US/exp/firefox/new/`,
            'sampleRate': 0.09
        }
    ];

    it('should return a 200 for requests that have a matching response, but are not within sample rate', async function () {
        Math.random = sinon.stub().returns(0.8534);
        const url = new URL('https://bedrock-stage.gcp.moz.works/en-US/firefox/new/');
        const req = new Request(url);
        const res = await global.handleRequest(req, experimentPagesStub);
        expect(res.status).to.equal(200);
        expect(res.url).to.equal('https://bedrock-stage.gcp.moz.works/en-US/firefox/new/');
    });

    it('should return a 302 for requests that have a matching response, and are within sample rate', async function () {
        Math.random = sinon.stub().returns(0.0001);
        const url = new URL('https://bedrock-stage.gcp.moz.works/en-US/firefox/new/');
        const req = new Request(url);
        const res = await global.handleRequest(req, experimentPagesStub);
        expect(res.status).to.equal(302);
        expect(res.headers.get('location')).to.equal('https://bedrock-stage.gcp.moz.works/en-US/exp/firefox/new/');
    });

    it('should preserve query string parameters when redirecting the URL', async function() {
        Math.random = sinon.stub().returns(0.0001);
        const url = new URL('https://bedrock-stage.gcp.moz.works/en-US/firefox/new/?foo=bar');
        const req = new Request(url);
        const res = await global.handleRequest(req, experimentPagesStub);
        expect(res.status).to.equal(302);
        expect(res.headers.get('location')).to.equal('https://bedrock-stage.gcp.moz.works/en-US/exp/firefox/new/?foo=bar');
    });

    it('should return a 200 if the request does not have a matching redirect', async function() {
        const url = new URL('https://bedrock-stage.gcp.moz.works/en-US/firefox/browsers/');
        const req = new Request(url);
        const res = await global.handleRequest(req, experimentPagesStub);
        expect(res.status).to.equal(200);
        expect(res.url).to.equal('https://bedrock-stage.gcp.moz.works/en-US/firefox/browsers/');
    });

    it('should return a 200 if there are no experimental pages configured', async function() {
        const url = new URL('https://bedrock-stage.gcp.moz.works/en-US/firefox/new/');
        const req = new Request(url);
        const res = await global.handleRequest(req, []);
        expect(res.status).to.equal(200);
        expect(res.url).to.equal('https://bedrock-stage.gcp.moz.works/en-US/firefox/new/');
    });
});

describe('Configuration Data', function() {
    it('should be able to check data from redirector', async function() {
        expect(global.experimentPages).to.be.an('array');
    });

    it('should have good content in experiment pages hashes', async function() {
        global.experimentPages.forEach(function (value) {
            expect(value).to.have.property('targetPath');
            expect(value).to.have.property('sandboxPath');
            expect(value).to.have.property('sampleRate');

            // A common mistake might be to accidentally point at same source and destination
            // This test ensures there is some difference.
            expect(value['targetPath']).to.not.be.equal(value['sandboxPath']);

            // Doing some light testing that the paths are reasonable
            // when merged with a domain, they ought to be valid urls
            // otherwise nothing will ever reach them.
            expect(isValidPath(value['targetPath'])).to.be.true;
            expect(isValidPath(value['sandboxPath'])).to.be.true;

            expect(value['sampleRate']).to.be.above(0);
            expect(value['sampleRate']).to.be.below(1);
        });
    });

    it('should workerpaths have staging key', async function() {
        expect(global.workerPaths).to.have.property('staging');
    });

    it('should workerpaths stagingvalue be an array', async function() {
        expect(global.workerPaths['staging']).to.be.an('array');
    });

    it('should workerpaths have prod key', async function() {
        expect(global.workerPaths).to.have.property('prod');
    });

    it('should workerpaths prod value be an array', async function() {
        expect(global.workerPaths['prod']).to.be.an('array');
    });
});
