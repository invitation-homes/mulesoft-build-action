const core = require('@actions/core');
const tc = require('@actions/tool-cache');
const path = require('path');

let tempDirectory = process.env['RUNNER_TEMPDIRECTORY'] || '';

if (!tempDirectory) {
  let baseLocation;
  if (process.platform === 'win32') {
    baseLocation = process.env['USERPROFILE'] || 'C:\\';
  } else {
    if (process.platform === 'darwin') {
      baseLocation = '/Users';
    } else {
      baseLocation = '/home';
    }
  }
  tempDirectory = path.join(baseLocation, 'actions', 'temp');
}

async function getMaven(version) {
  let toolPath;
  toolPath = tc.find('maven', version);

  if (!toolPath) {
    toolPath = await downloadMaven(version);
  }

  toolPath = path.join(toolPath, 'bin');
  core.addPath(toolPath);
}

async function downloadMaven(version) {
  const toolDirectoryName = `apache-maven-${version}`;
  const downloadUrl = `https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/${version}/apache-maven-${version}-bin.tar.gz`;
  console.log(`downloading ${downloadUrl}`);

  try {
    const downloadPath = await tc.downloadTool(downloadUrl);
    const extractedPath = await tc.extractTar(downloadPath);
    let toolRoot = path.join(extractedPath, toolDirectoryName);
    return await tc.cacheDir(toolRoot, 'maven', version);
  } catch (err) {
    throw err;
  }
}

module.exports = {
  getMaven
};