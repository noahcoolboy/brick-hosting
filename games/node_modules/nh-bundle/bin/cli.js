#!/usr/bin/env node
const { bundleMapData, debundleMapData } = require('../lib')
const path = require('path')

const args = process.argv.slice(2)

const DEFAULT_DEBUNDLE_SETTINGS = {
    map: "./bundled/maps/",
    scripts: {
        directory: "./bundled/user_scripts/"
    }
}

const DEFAULT_OPTIONS = {
    bundleConfig: "./bundle_config.json",
    bundlePath: null,
    compression: false,
    binary: false,
    nomap: false
}

for (const arg of args) {
    const config = arg.split("=")
    switch (config.shift()) {
        case "--config": {
            DEFAULT_OPTIONS.bundleConfig = config.pop()
            break
        }
        case "--nomap": {
            DEFAULT_OPTIONS.nomap = true
            break
        }
        case "--debundle": {
            DEFAULT_OPTIONS.bundlePath = config.pop()
            break
        }
        case "--compress": {
            DEFAULT_OPTIONS.compression = true
            break
        }
        case "--binary": {
            DEFAULT_OPTIONS.binary = true
            break
        }
    }
}

let config = {
    bundle: {},
    debundle: {}
};

try {
    config = require(path.resolve(process.cwd(), DEFAULT_OPTIONS.bundleConfig))
} catch (err) {
    if (!DEFAULT_OPTIONS.bundlePath) throw new Error("Cannot bundle without a bundle_config.json.");

    console.warn("WARNING: Could not load bundle_config.json, using default settings.")

    config.debundle = DEFAULT_DEBUNDLE_SETTINGS
}

DEFAULT_OPTIONS.compression = Boolean(DEFAULT_OPTIONS.compression || config?.bundle?.compression)
DEFAULT_OPTIONS.binary = Boolean(DEFAULT_OPTIONS.binary || config?.bundle?.binary)

if (DEFAULT_OPTIONS.nomap) config.bundle.map = false

if (!DEFAULT_OPTIONS.bundlePath)
    bundleMapData(Object.assign(config.bundle, DEFAULT_OPTIONS))
else
    debundleMapData(Object.assign(config.debundle, DEFAULT_OPTIONS))