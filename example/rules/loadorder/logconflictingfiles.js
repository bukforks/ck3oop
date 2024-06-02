const _ = require('lodash');
const fs = require("fs");
const utils = require('./../utils');
const path = require("path");
const ajv = require('ajv');
const ignore = require('ignore');
const {inspect} = require("util");

let modIgnoreFiles = [
    ".git*",
    "*.png",
    "*.info",
    "*md",
    "*.mod"
]

let ignoredFilter = ignore().add(modIgnoreFiles);

// After the mods are sorted we can tell if there are any conflicting files
// If mods specifically define a load order and the files overwrite in the same order -
// - it's only informative to log this to the user, otherwise it's a conflict - user should be warned
function logConflictingFiles(
    context,
    {
        parser,
        gameFiles,
        enabledMods,
        enabledFiles,
    },
) {

    path.relative(process.cwd(), __dirname)
    const ConflictSeverity = {
        CONFLICT: 'CONFLICT',
        INFORMATIVE: 'INFORMATIVE',
    }

    let conflictInfo = {};
    let ignoredFiles = [];
    let conflictFiles = {};

    let setConflictInfo = function(file, {severity, message}){
        if (
            typeof file !== 'string'
            || !Object.values(ConflictSeverity).includes(severity)
            || typeof message !== 'string'
        ) {
            throw new Error("Invalid arguments provided to setConflictInfo");
        }
        conflictInfo[file] ??= [];

        conflictInfo[file]["mods"] ??= {
            ...enabledFiles[file],
        };
        conflictInfo[file]["info"] ??= [];
        conflictInfo[file]['info'].push(arguments[1]);
    };

    for (let [file, mods] of Object.entries(enabledFiles)) {

        let cleanPath = !path.isAbsolute(file) ? file : file.replace(path.sep, "");
        if (ignoredFilter.ignores(cleanPath)) {
            ignoredFiles.push(file);
            continue;
        }
        if (mods.length < 2) {
            continue;
        }
        conflictFiles[file] = mods.map((x) => x.modName)
    }

    // Check if the mods are overwriting in order that is allowed by the rules
    for (let [file, mods] of Object.entries(conflictFiles)) {

        mods.forEach((mod, index) => {

            // First mod that is not in the sortedModules -
            // - followed by other mods - it's 100% conflict
            // - because it's not predefined in the rules
            if (
                (index === 0 || index === mods.length - 1)
                && mods.length > 1
                && context['sortedModules'].indexOf(mod) === -1
            ) {
                setConflictInfo(file, {
                    severity: ConflictSeverity.CONFLICT,
                    message: `${mod} is not defined in the load order rules but other mods are overwriting it`,
                })
            }
        })
    }

    console.log(inspect(conflictInfo, false, null, true))
    console.log(conflictFiles)
    return context
}

module.exports = logConflictingFiles;