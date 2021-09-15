var core = require('@actions/core');
var path = require('path');
var fs = require('fs');
var os = require('os');
var DOMParser = require('xmldom').DOMParser;
var XMLSerializer = require('xmldom').XMLSerializer;
const cp = require('child_process');
const util = require('util');
const exec = util.promisify(cp.exec);
const NEXUS = 0
const EXCHANGE = 1;

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

function updateServers(templateXml, user, password, index) {

    if(templateXml && user && password && index) {
        var serverXml = templateXml.getElementsByTagName('server')[index];

        var userXml = templateXml.createElement('username');
        userXml.textContent = user;
        serverXml.appendChild(userXml);
        var pwXml = templateXml.createElement('password');
        pwXml.textContent = password;
        serverXml.appendChild(pwXml);
        return true;
    } else {
    return false;
    }
}

function generateMavenSettings(nexusUser, nexusPassword, exchangeUser, exchangePassword) {

    var templateXml = getSettingsTemplate();
    var nexus_updated = updateServers(templateXml, nexusUser, nexusPassword, NEXUS);
    var exchange_updated = updateServers(templateXml, exchangeUser, exchangePassword, EXCHANGE);

    if(nexus_updated || exchange_updated) writeSettings(templateXml);
}

async function build(secret_key, nexusUser, nexusPassword, exchangeUser, exchangePassword) {
    console.log("Building project artifact ...");

    generateMavenSettings(nexusUser, nexusPassword, exchangeUser, exchangePassword);

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