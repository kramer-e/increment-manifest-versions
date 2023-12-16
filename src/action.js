const fs = require('fs');
const semver = require('semver');
const glob = require('glob-promise');
const core = require('@actions/core');

const setInput = (name, value) =>
    process.env[`INPUT_${name.replace(/ /g, '_').toUpperCase()}`] = value;

setInput('android_manifest_paths', './**/*AndroidManifest.xml');
setInput('ios_plist_paths', './samples/Info.plist');
setInput('release_type', 'patch');
setInput('must_match_single_result', 'true');


const androidConfigFilePathsInput = core.getInput('android_manifest_paths', { required: true });
const iosConfigFilePathsInput = core.getInput('ios_plist_paths', { required: true });

const androidConfigFilePaths = androidConfigFilePathsInput.split(',').map(path => path.trim());
const iosConfigFilePaths = iosConfigFilePathsInput.split(',').map(path => path.trim());

const releaseType = core.getInput('release_type', { required: true });
const mustMatchSingleResult = core.getInput('must_match_single_result', { required: false });
const mustMatchSingleResultBoolean = mustMatchSingleResult.toLowerCase() === 'true';

async function addWildcardPathsAsync(paths) {
    const matchingFiles = [];
    console.log('Provided path:', paths);

    for (const path of paths) {
        const files = await glob(path, { nodir: true, strict: true });

        if (mustMatchSingleResultBoolean && files.length > 1) {
            throw new Error(`Expected exactly one result for ${path}, but found ${files.length} matching files.`);
        }

        if (files.length > 0) {
            console.log('Found matching file(s):', files);
            matchingFiles.push(...files);
        }
        else {
            console.log('No files found!');
        }
    }

    return matchingFiles;
}


function replaceAndroidValues(contentFilePath) {
    if (!fs.existsSync(contentFilePath)) {
        console.error(`File not found: ${contentFilePath}`);
        return;
    }

    // Android: Use regular expressions with capturing groups to replace values
    var result = fs.readFileSync(contentFilePath, 'utf8');
    result = result
        .replace(/(android:versionName\s*=\s*")([^"]+)(")/, (match, prefix, versionName, suffix) => {
            const newVersionName = semver.inc(versionName, releaseType);
            console.log(`Android versionName in file ${contentFilePath} incremented from ${versionName} to ${newVersionName} for release type ${releaseType}.`);
            return `${prefix}${newVersionName}${suffix}`;
        })
        .replace(/(android:versionCode\s*=\s*")(\d+)(")/, (match, prefix, versionCode, suffix) => {
            const newVersionCode = parseInt(versionCode) + 1;
            console.log(`Android versionCode in file ${contentFilePath} incremented from ${versionCode} to ${newVersionCode} for release type ${releaseType}.`);
            return `${prefix}${newVersionCode}${suffix}`;
        });

    fs.writeFileSync(contentFilePath, result);
    console.log(`Android file ${contentFilePath} processed.`);
    console.log(result);
}

function replaceiOSValues(contentFilePath) {
    if (!fs.existsSync(contentFilePath)) {
        console.error(`File not found: ${contentFilePath}`);
        return;
    }

    // iOS: Use regular expressions with capturing groups to replace values
    var result = fs.readFileSync(contentFilePath, 'utf8');
    result = result
        .replace(/(<key>CFBundleShortVersionString<\/key>\s*<string>)([^<]+)(<\/string>)/, (match, prefix, shortVersion, suffix) => {
            const newVersion = semver.inc(shortVersion, releaseType);
            console.log(`iOS CFBundleShortVersionString in file ${contentFilePath} incremented from ${shortVersion} to ${newVersion} for release type ${releaseType}.`);
            return `${prefix}${newVersion}${suffix}`;
        })
        .replace(/(<key>CFBundleVersion<\/key>\s*<string>)([^<]+)(<\/string>)/, (match, prefix, bundleVersion, suffix) => {
            const newBuild = parseInt(bundleVersion) + 1;
            console.log(`iOS CFBundleVersion in file ${contentFilePath} incremented from ${bundleVersion} to ${newBuild} for release type ${releaseType}.`);
            return `${prefix}${newBuild}${suffix}`;
        });

    fs.writeFileSync(contentFilePath, result);
    console.log(`iOS file ${contentFilePath} processed.`);
    console.log(result);
}

async function run() {
    console.log('starting...');
    const androidMatchingFiles = await addWildcardPathsAsync(androidConfigFilePaths);
    const iosMatchingFiles = await addWildcardPathsAsync(iosConfigFilePaths);

    // Validate the releaseType
    const validReleaseTypes = ['major', 'minor', 'patch'];
    if (!validReleaseTypes.includes(releaseType)) {
        console.error(`Invalid releaseType: ${releaseType}. Expected values are ${validReleaseTypes.join(', ')}.`);
        process.exit(1); // Exit the script with an error code
    }
    if (androidMatchingFiles.length === 0 && iosMatchingFiles.length === 0) {
        throw new Error('No matching files found!');
    }

    androidMatchingFiles.forEach(replaceAndroidValues);
    iosMatchingFiles.forEach(replaceiOSValues);
}

run();
