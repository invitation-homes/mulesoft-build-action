var core = require("@actions/core");
var path = require("path");
const axios = require("axios");
var fs = require("fs");
var os = require("os");
var DOMParser = require("@xmldom/xmldom").DOMParser;
var XMLSerializer = require("@xmldom/xmldom").XMLSerializer;
const cp = require("child_process");
const util = require("util");
const exec = util.promisify(cp.exec);
const NEXUS = 0;
const EXCHANGE = 1;
const EXCHANGE_V2 = 2;

function getSettingsTemplate() {
  core.info("opening settings template");
  var templatePath = path.join(__dirname, "../template", "maven-settings.xml");
  var template = fs.readFileSync(templatePath).toString();
  return new DOMParser().parseFromString(template, "text/xml");
}

function writeSettings(templateXml) {
  var settingsPath = path.join(os.homedir(), ".m2", "settings.xml");
  if (!fs.existsSync(path.dirname(settingsPath))) {
    core.info("creating ~/.m2 directory");
    fs.mkdirSync(path.dirname(settingsPath));
  }

  core.info("writing settings.xml to path: " + settingsPath);
  var settingStr = new XMLSerializer().serializeToString(templateXml);
  fs.writeFileSync(settingsPath, settingStr);
}

function updateServers(templateXml, user, password, index) {
  if (templateXml && user && password) {
    var serverXml = templateXml.getElementsByTagName("server")[index];
    var userXml = templateXml.createElement("username");
    userXml.textContent = user;
    serverXml.appendChild(userXml);
    var pwXml = templateXml.createElement("password");
    pwXml.textContent = password;
    serverXml.appendChild(pwXml);
    return true;
  } else {
    return false;
  }
}

async function getAccessToken(
  MULESOFT_CONNECTED_APP_ID,
  MULESOFT_CONNECTED_APP_SECRET
) {
  try {
    console.log("Building project artifact ...");

    const response = await axios({
      method: "post",
      url: `https://anypoint.mulesoft.com/accounts/api/v2/oauth2/token`,
      data: {
        client_id: MULESOFT_CONNECTED_APP_ID,
        client_secret: MULESOFT_CONNECTED_APP_SECRET,
        grant_type: "client_credentials",
      },
    });
    return response.data.access_token;
  } catch (error) {
    console.log(error);
  }
}

async function generateMavenSettings(
  nexusUser,
  nexusPassword,
  exchangeUser,
  exchangePassword
) {
  var templateXml = getSettingsTemplate();
  var nexus_updated = updateServers(
    templateXml,
    nexusUser,
    nexusPassword,
    NEXUS
  );
  var accessToken = await getAccessToken(exchangeUser, exchangePassword);
  var exchange_updated = updateServers(
    templateXml,
    "~~~Token~~~",
    accessToken,
    EXCHANGE
  );
  var exchange_v2_updated = updateServers(
    templateXml,
    "~~~Token~~~",
    accessToken,
    EXCHANGE_V2
  );
  if (nexus_updated || exchange_updated || exchange_v2_updated)
    writeSettings(templateXml);
}

async function build(
  secret_key,
  nexusUser,
  nexusPassword,
  exchangeUser,
  exchangePassword
) {
  console.log("Building project artifact ...");

  await generateMavenSettings(
    nexusUser,
    nexusPassword,
    exchangeUser,
    exchangePassword
  );

  var build_command = "mvn -B -q package --file pom.xml -Denv=local ";
  if (secret_key) build_command += "-Dsecret.key=" + secret_key + " ";
  const build = await exec(build_command);
  core.info("Build logs ", build.stdout);
  return true;
}

module.exports = {
  build,
};
