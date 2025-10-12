const core = require('@actions/core')
const semver = require('semver')

const requireScript = require('./requireScript')

function bumpPreRelease(oldVersion, releaseType, identifier) {
  const isOldVersionStable = semver.prerelease(oldVersion) === null;

  if (isOldVersionStable) {
    core.info("Old version is stable, starting a new prerelease");
    return semver.inc(oldVersion, `pre${releaseType}`, identifier);
  }
  else {
    core.info("Old version is already a prerelease");
    const stableBump = semver.inc(oldVersion, releaseType);
    const expected = semver.inc(stableBump, `pre${releaseType}`, identifier);

    if (semver.diff(oldVersion, expected) === "prerelease") {
      core.info("Same bump level, incrementing prerelease");
      return semver.inc(oldVersion, "prerelease", identifier);
    }
    else {
      core.info("Different bump level, starting a new prerelease");
      return semver.inc(oldVersion, `pre${releaseType}`, identifier);
    }
  }
}

/**
 * Bumps the given version with the given release type
 *
 * @param releaseType
 * @param oldVersion
 * @returns {string}
 */
module.exports = async (releaseType, oldVersion) => {
  let newVersion

  const prerelease = core.getBooleanInput('pre-release')
  const identifier = core.getInput('pre-release-identifier')

  if (oldVersion) {
    if (prerelease) {
      newVersion = bumpPreRelease(oldVersion, releaseType, identifier)
    }
    else {
      newVersion = semver.inc(oldVersion, releaseType, identifier)
    }
  }
  else {

    const fallbackVersion = core.getInput('fallback-version')

    if (fallbackVersion) {
      newVersion = semver.valid(fallbackVersion)
    }

    if (!newVersion) {
      // default
      newVersion = (prerelease ? `0.1.0-${identifier}.0` : '0.1.0')
    }

    core.info(`The version could not be detected, using fallback version '${newVersion}'.`)
  }

  const preChangelogGenerationFile = core.getInput('pre-changelog-generation')

  if (preChangelogGenerationFile) {
    const preChangelogGenerationScript = requireScript(preChangelogGenerationFile)

    // Double check if we want to update / do something with the version
    if (preChangelogGenerationScript && preChangelogGenerationScript.preVersionGeneration) {
      const modifiedVersion = await preChangelogGenerationScript.preVersionGeneration(newVersion)

      if (modifiedVersion) {
        core.info(`Using modified version "${modifiedVersion}"`)
        newVersion = modifiedVersion
      }
    }
  }

  return newVersion
}
