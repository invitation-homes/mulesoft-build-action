const core = require('@actions/core');
const github = require('@actions/github');
const cp = require('child_process');
const util = require('util');
const fs = require('fs');
const exec = util.promisify(cp.exec);
const maven = require('./maven');
const parser = require('xml2js');
const pager = require('./pagerduty');
const setupMaven = require('./setup-maven');

async function main() {
  await setupMaven.run();
  const release_tag = await readPOMVersion();
  if (!release_tag) return;

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const MULESOFT_NEXUS_USER = process.env.MULESOFT_NEXUS_USER;
  const MULESOFT_NEXUS_PASSWORD = process.env.MULESOFT_NEXUS_PASSWORD;
  const PAGERDUTY_INTEGRATION_KEY = process.env.PAGERDUTY_INTEGRATION_KEY;
  const MULESOFT_CONNECTED_APP_ID = process.env.MULESOFT_CONNECTED_APP_ID;
  const MULESOFT_CONNECTED_APP_SECRET = process.env.MULESOFT_CONNECTED_APP_SECRET;
  const SECRET_KEY = process.env.SECRET_KEY;
  const octokit = github.getOctokit(GITHUB_TOKEN);
  const { context = {} } = github;

  try {
    if (await releaseExists(octokit, context, release_tag)) {
      let msg = "Cancelling the subsequent step(s). " + release_tag + " already exists!";
      core.setFailed(msg);
      if (PAGERDUTY_INTEGRATION_KEY) {
        pager.makeAndSendPagerAlert(PAGERDUTY_INTEGRATION_KEY, msg);
      }
      return;
    }
    if (await maven.build(SECRET_KEY, MULESOFT_NEXUS_USER, MULESOFT_NEXUS_PASSWORD, MULESOFT_CONNECTED_APP_ID , MULESOFT_CONNECTED_APP_SECRET)) {
      await createRelease(octokit, context, release_tag);
    }
    console.log("action executed successfully.");
    core.setOutput("release_number", release_tag);
    return true;
  }
  catch (error) {
    logError(error);
    return;
  }
}

main();

async function releaseExists(octokit, context, release_tag) {
  if (release_tag) {
    try {
      await octokit.repos.getReleaseByTag({
        ...context.repo,
        tag: release_tag
      });
      console.log("Release exist!");
    }
    catch (error) {
      if (error.status == 404) return false;
      else throw error;
    }
  }
  return true;
}

async function createRelease(octokit, context, release_tag) {
  const commit = process.env.GITHUB_SHA
  console.log(`Creating release ${release_tag} from commit ${commit}`);

  const response = await octokit.repos.createRelease({
    ...context.repo,
    tag_name: release_tag,
    name: "Release " + release_tag,
    draft: false,
    prerelease: true,
    target_commitish: commit
  });

  console.log('Release ' + release_tag + ' created.');
  return uploadReleaseAsset(octokit, context, response.data);
}

async function uploadReleaseAsset(octokit, context, release) {
  const artifactInfo = JSON.parse(await getArtifactInfo());

  await octokit.repos.uploadReleaseAsset({
    ...context.repo,
    release_id: release.id,
    origin: release.upload_url,
    name: artifactInfo.name,
    data: fs.readFileSync(artifactInfo.path)
  });
  return true;
}

async function getArtifactInfo() {
  var asset_name = await exec('cd target/ && ls *.jar | head -1');
  asset_name = asset_name.stdout.replace(/\r?\n|\r/g, "");
  const artifactInfo = JSON.stringify({ name: asset_name, path: "target/" + asset_name });
  console.log('Artifact Info: ', artifactInfo);
  return artifactInfo;
}

async function readPOMVersion() {
  let xml_data = fs.readFileSync("./pom.xml", "utf-8");
  try {
    let pom = await parser.parseStringPromise(xml_data);
    return pom.project.version[0];
  }
  catch (error) {
    logError(error);
  }
}

function logError(error) {
  console.log(error);
  core.setFailed(error.message)
  if (PAGERDUTY_INTEGRATION_KEY) {
    pager.makeAndSendPagerAlert(PAGERDUTY_INTEGRATION_KEY, error);
  }
}