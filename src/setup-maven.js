const core = require('@actions/core');
const installer = require('./installer');

async function run() {
  try {
    let version = '3.8.2';
    if (version) {
      await installer.getMaven(version);
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();

module.exports = {
  run
}
