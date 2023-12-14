const fs = require('fs');
const semver = require('semver');
const core = require('@actions/core');

const androidConfigFilePaths = core.getInput('android_manifest_paths', {required: true});
const iosConfigFilePaths = core.getInput('ios_plist_paths', {required: true});
const releaseType = core.getInput('release_type', {required: true});

function replaceAndroidValues(contentFilePath) {
    if (!fs.existsSync(contentFilePath)) {
        console.error(`File not found: ${contentFilePath}`);
        return;
    }

    // Android: Use regular expressions with capturing groups to replace values
    var result = fs.readFileSync(contentFilePath, 'utf8');
    result = result
        .replace(/(android:versionCode\s*=\s*")(\d+)(")/, (match, prefix, versionCode, suffix) => {
            const newVersionCode = parseInt(versionCode) + 1;
            console.log(`Android versionCode in file ${contentFilePath} incremented from ${versionCode} to ${newVersionCode} for release type ${releaseType}.`);
            return `${prefix}${newVersionCode}${suffix}`;
        })
        .replace(/(android:versionName\s*=\s*")([^"]+)(")/, (match, prefix, versionName, suffix) => {
            const newVersionName = semver.inc(versionName, releaseType);
            console.log(`Android versionName in file ${contentFilePath} incremented from ${versionName} to ${newVersionName} for release type ${releaseType}.`);
            return `${prefix}${newVersionName}${suffix}`;
        });

    fs.writeFileSync(contentFilePath, result);
    console.log(`Android file ${contentFilePath} processed.`);
}

function replaceiOSValues(contentFilePath) {
    if (!fs.existsSync(contentFilePath)) {
        console.error(`File not found: ${contentFilePath}`);
        return;
    }

    // iOS: Use regular expressions with capturing groups to replace values
    var result = fs.readFileSync(contentFilePath, 'utf8');
    result = result
        .replace(/(<key>CFBundleShortVersionString<\/key>\s*<string>)([^<]+)(<\/string>)/, (match, prefix, version, suffix) => {
            const newVersion = semver.inc(version, releaseType);
            console.log(`iOS CFBundleShortVersionString in file ${contentFilePath} incremented from ${version} to ${newVersion} for release type ${releaseType}.`);
            return `${prefix}${newVersion}${suffix}`;
        })
        .replace(/(<key>CFBundleVersion<\/key>\s*<string>)([^<]+)(<\/string>)/, (match, prefix, build, suffix) => {
            const newBuild = parseInt(build) + 1;
            console.log(`iOS CFBundleVersion in file ${contentFilePath} incremented from ${build} to ${newBuild} for release type ${releaseType}.`);
            return `${prefix}${newBuild}${suffix}`;
        });

    fs.writeFileSync(contentFilePath, result);
    console.log(`iOS file ${contentFilePath} processed.`);
}

function run() {
    const androidFilePaths = androidConfigFilePaths.split(',').filter(path => path.trim() !== '');
    const iosFilePaths = iosConfigFilePaths.split(',').filter(path => path.trim() !== '');

    // Validate the releaseType
    const validReleaseTypes = ['major', 'minor', 'patch'];
    if (!validReleaseTypes.includes(releaseType)) {
        console.error(`Invalid releaseType: ${releaseType}. Expected values are ${validReleaseTypes.join(', ')}.`);
        process.exit(1); // Exit the script with an error code
    }

    androidFilePaths.forEach(replaceAndroidValues);
    iosFilePaths.forEach(replaceiOSValues);
}

run();
