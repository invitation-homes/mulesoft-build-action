var core = require('@actions/core');
var path = require('path');
var fs = require('fs');
var os = require('os');
var DOMParser = require('xmldom').DOMParser;
var XMLSerializer = require('xmldom').XMLSerializer;
const cp = require('child_process');
const util = require('util');
const exec = util.promisify(cp.exec);

function getSettingsTemplate() {
    core.info("opening settings template");
    var templatePath = path.join(__dirname, '../template', 'maven-settings.xml');
    var template = fs.readFileSync(templatePath).toString();
    return new DOMParser().parseFromString(template, 'text/xml');
}

function writeSettings(templateXml) {
    var settingsPath = path.join(os.homedir(), '.m2', 'settings.xml');
    if (!fs.existsSync(path.dirname(settingsPath))) {
        core.info("creating ~/.m2 directory");
        fs.mkdirSync(path.dirname(settingsPath));
    }

    core.info("writing settings.xml to path: " + settingsPath)
    var settingStr = new XMLSerializer().serializeToString(templateXml);
    fs.writeFileSync(settingsPath, settingStr);
}

function updateServers(templateXml, nexusUser, nexusPassword) {
    var serverXml = templateXml.getElementsByTagName('server')[0];

    var userXml = templateXml.createElement('username');
    userXml.textContent = nexusUser;
    serverXml.appendChild(userXml);
    var pwXml = templateXml.createElement('password');
    pwXml.textContent = nexusPassword;
    serverXml.appendChild(pwXml);
}

function generateMavenSettings(nexusUser, nexusPassword) {

    var templateXml = getSettingsTemplate();
    updateServers(templateXml, nexusUser, nexusPassword);
    writeSettings(templateXml);
}

async function build(secret_key, nexusUser, nexusPassword) {
    console.log("Building project artifact ...");

    if (nexusUser && nexusPassword)
        generateMavenSettings(nexusUser, nexusPassword);

    var build_command = 'mvn -B package --file pom.xml -Denv=local ';
    if (secret_key)
        build_command += "-Dsecret.key=" + secret_key + " "
    const build = await exec(build_command);
    core.info('Build logs ', build.stdout);
    return true;
}

module.exports = {
    build
}