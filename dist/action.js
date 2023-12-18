"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const semver = __importStar(require("semver"));
const glob_promise_1 = __importDefault(require("glob-promise"));
const core = __importStar(require("@actions/core"));
// For local test only, comment this for production!
const setInput = (name, value) => process.env[`INPUT_${name.replace(/ /g, '_').toUpperCase()}`] = value;
setInput('android_manifest_paths', './**/*AndroidManifest.xml');
setInput('ios_plist_paths', './samples/Info.plist');
setInput('release_type', 'patch');
setInput('must_match_single_result', 'false');
setInput('sync_all_versions', 'true');
const androidConfigFilePaths = core.getInput('android_manifest_paths', { required: true }).split(',').map(path => path.trim());
const iosConfigFilePaths = core.getInput('ios_plist_paths', { required: true }).split(',').map(path => path.trim());
const releaseType = core.getInput('release_type', { required: true });
const mustMatchSingleResult = core.getInput('must_match_single_result', { required: false }).toLowerCase() === 'true';
const syncAllVersions = core.getInput('sync_all_versions', { required: false }).toLowerCase() === 'true';
function addWildcardPathsAsync(paths) {
    return __awaiter(this, void 0, void 0, function* () {
        const matchingFiles = [];
        console.log('Provided path(s):', paths);
        for (const path of paths) {
            const files = yield (0, glob_promise_1.default)(path, { nodir: true, strict: true });
            if (mustMatchSingleResult && files.length > 1) {
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
    });
}
function replaceAndroidValues(contentFilePath, sync, newNumber, newSemantic) {
    if (!fs.existsSync(contentFilePath)) {
        console.error(`File not found: ${contentFilePath}`);
        return;
    }
    // Android: Use regular expressions with capturing groups to replace values
    let result = fs.readFileSync(contentFilePath, 'utf8');
    result = result.replace(/(android:versionCode\s*=\s*")(\d+)(")/, (match, prefix, versionCode, suffix) => {
        const newValue = sync ? newNumber : parseInt(versionCode) + 1;
        console.log(`Android versionCode in file ${contentFilePath} ${sync ? 'synced from' : 'incremented from'} ${versionCode} to ${newValue} newsem: ${newNumber} sync: ${sync} for release type ${releaseType}.`);
        return `${prefix}${newValue}${suffix}`;
    });
    result = result.replace(/(android:versionName\s*=\s*")([^"]+)(")/, (match, prefix, versionName, suffix) => {
        const newValue = sync ? newSemantic : semver.inc(versionName, releaseType);
        console.log(`Android versionName in file ${contentFilePath} ${sync ? 'synced from' : 'incremented from'} ${versionName} to ${newValue} newsem: ${newSemantic} sync: ${sync} for release type ${releaseType}.`);
        return `${prefix}${newValue}${suffix}`;
    });
    fs.writeFileSync(contentFilePath, result);
    console.log(`Android file ${contentFilePath} processed.`);
    console.log(result);
}
function replaceiOSValues(contentFilePath, sync, newNumber, newSemantic) {
    if (!fs.existsSync(contentFilePath)) {
        console.error(`File not found: ${contentFilePath}`);
        return;
    }
    // iOS: Use regular expressions with capturing groups to replace values
    let result = fs.readFileSync(contentFilePath, 'utf8');
    result = result.replace(/(<key>CFBundleShortVersionString<\/key>\s*<string>)([^<]+)(<\/string>)/, (match, prefix, shortVersion, suffix) => {
        const newValue = sync ? newSemantic : semver.inc(shortVersion, releaseType);
        console.log(`iOS CFBundleShortVersionString in file ${contentFilePath} ${sync ? 'synced to' : 'incremented from'} ${shortVersion} to ${newValue} for release type ${releaseType}.`);
        return `${prefix}${newValue}${suffix}`;
    });
    result = result.replace(/(<key>CFBundleVersion<\/key>\s*<string>)([^<]+)(<\/string>)/, (match, prefix, bundleVersion, suffix) => {
        const newValue = sync ? newNumber : parseInt(bundleVersion) + 1;
        console.log(`iOS CFBundleVersion in file ${contentFilePath} ${sync ? 'synced to' : 'incremented from'} ${bundleVersion} to ${newValue} for release type ${releaseType}.`);
        return `${prefix}${newValue}${suffix}`;
    });
    fs.writeFileSync(contentFilePath, result);
    console.log(`iOS file ${contentFilePath} processed.`);
    console.log(result);
}
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!semver.RELEASE_TYPES.includes(releaseType)) {
            throw new Error(`Invalid releaseType: ${releaseType}. Expected values are ${semver.RELEASE_TYPES.join(', ')}.`);
        }
        const androidMatchingFiles = yield addWildcardPathsAsync(androidConfigFilePaths);
        const iosMatchingFiles = yield addWildcardPathsAsync(iosConfigFilePaths);
        // Validate the releaseType
        const validReleaseTypes = ['major', 'minor', 'patch'];
        if (!validReleaseTypes.includes(releaseType)) {
            console.error(`Invalid releaseType: ${releaseType}. Expected values are ${validReleaseTypes.join(', ')}.`);
            process.exit(1); // Exit the script with an error code
        }
        if (androidMatchingFiles.length === 0 && iosMatchingFiles.length === 0) {
            throw new Error('No matching files found!');
        }
        if (syncAllVersions) {
            yield synchronizeVersions(androidMatchingFiles, iosMatchingFiles);
        }
        else {
            androidMatchingFiles.forEach(file => replaceAndroidValues(file, false, 0, ""));
            iosMatchingFiles.forEach(file => replaceiOSValues(file, false, 0, ""));
        }
    });
}
function findHighestVersions(absolutePaths) {
    return __awaiter(this, void 0, void 0, function* () {
        const versionNumbers = [];
        const semanticVersions = [];
        console.log('Provided path(s):', absolutePaths);
        for (const filePath of absolutePaths) {
            const content = fs.readFileSync(filePath, 'utf8');
            // Version Code
            const versionCodeMatches = content.match(/versionCode\s*=\s*"(\d+)"/g);
            console.log('Version Code Matches:', versionCodeMatches);
            if (versionCodeMatches) {
                versionCodeMatches.forEach(match => {
                    const versionCode = parseInt(match.match(/\d+/)[0]);
                    console.log('Added version number:', versionCode);
                    versionNumbers.push(versionCode);
                });
            }
            // Version Name
            const versionNameMatches = content.match(/versionName\s*=\s*"([^"]+)"/g);
            console.log('Version Name Matches:', versionNameMatches);
            if (versionNameMatches) {
                versionNameMatches.forEach(match => {
                    const versionName = match.match(/versionName\s*=\s*"([^"]+)"/)[1];
                    console.log('Added version semver:', versionName);
                    semanticVersions.push(versionName);
                });
            }
            // CFBundleVersion
            const bundleVersionMatches = content.match(/<key>CFBundleVersion<\/key>\s*<string>([^<]+)<\/string>/g);
            console.log('CFBundleVersion Matches:', bundleVersionMatches);
            if (bundleVersionMatches) {
                bundleVersionMatches.forEach(match => {
                    const bundleVersion = parseInt(match.match(/<key>CFBundleVersion<\/key>\s*<string>([^<]+)<\/string>/)[1]);
                    console.log('Added CFBundleVersion:', bundleVersion);
                    versionNumbers.push(bundleVersion);
                });
            }
            // CFBundleShortVersionString
            const shortVersionMatches = content.match(/<key>CFBundleShortVersionString<\/key>\s*<string>([^<]+)<\/string>/g);
            console.log('CFBundleShortVersionString Matches:', shortVersionMatches);
            if (shortVersionMatches) {
                shortVersionMatches.forEach(match => {
                    const shortVersion = match.match(/<key>CFBundleShortVersionString<\/key>\s*<string>([^<]+)<\/string>/)[1];
                    console.log('Added CFBundleShortVersionString semver:', shortVersion);
                    semanticVersions.push(shortVersion);
                });
            }
        }
        // Filter out non-numeric versions and sort in descending order
        const highestNumber = Math.max(...versionNumbers);
        const highestSemantic = semanticVersions.sort(semver.rcompare)[0];
        return { highestNumber, highestSemantic };
    });
}
function synchronizeVersions(androidPaths, iosPaths) {
    return __awaiter(this, void 0, void 0, function* () {
        const absolutePaths = [];
        for (const path of [...androidPaths, ...iosPaths]) {
            const filePaths = yield (0, glob_promise_1.default)(path, { nodir: true });
            if (mustMatchSingleResult && filePaths.length > 1) {
                throw new Error(`Expected exactly one result for ${path}, but found ${filePaths.length} matching files.`);
            }
            absolutePaths.push(...filePaths);
        }
        const { highestNumber, highestSemantic } = yield findHighestVersions(absolutePaths);
        const newNumber = highestNumber + 1;
        const newSemantic = semver.inc(highestSemantic, releaseType);
        console.log(`Highest number  ${newNumber}, highest semver ${newSemantic}.`);
        if (newSemantic) {
            for (const path of absolutePaths) {
                if (path.endsWith('.xml')) {
                    replaceAndroidValues(path, true, newNumber, newSemantic);
                }
                else if (path.endsWith('.plist')) {
                    replaceiOSValues(path, true, newNumber, newSemantic);
                }
            }
        }
        else {
            throw new Error(`Error while incrementing semantic version, highest version: ${highestSemantic}.`);
        }
    });
}
function validateReleaseType(type) {
    const validReleaseTypes = ['major', 'minor', 'patch'];
    if (validReleaseTypes.includes(type)) {
        return type;
    }
    else {
        throw new Error(`Invalid releaseType: ${type}. Expected values are ${validReleaseTypes.join(', ')}.`);
    }
}
run();
