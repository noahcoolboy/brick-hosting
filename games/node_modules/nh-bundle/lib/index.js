const fs = require('fs')
const zlib = require('zlib')
const { resolve, basename, dirname, join } = require('path')
const glob = require('glob')

function createDirectoryIfNotExists(directory) {
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, {
            recursive: true
        })
    }
}

function debundleMapData(config) {
    let scripts = []
    let mapName = "bundle"

    let bbrk = fs.readFileSync(resolve(config.bundlePath), () => { })

    try {
        bbrk = zlib.inflateSync(bbrk)
    } catch (err) { }

    bbrk = bbrk.toString()

    const bbrkSections = bbrk.split("---")

    const scriptData = bbrkSections.pop().trim()
    const lines = scriptData.split('\r\n')

    let scriptCount = 0

    for (let line of lines) {
        if (line.startsWith("::")) {
            scriptCount++
            let name = line.split(":")[2]
            let binary = false
            if (name.endsWith(".bin")) {
                binary = true
                name = name.slice(0, -4)
            }
            scripts.push({
                name: name,
                data: "",
                binary: binary
            })
        } else if (scriptCount > 0) {
            const script = scripts[scriptCount - 1]
            script.data += (script.binary && line) || `${line}\r\n`
        }
    }

    if (bbrkSections[0]) {
        const header = bbrkSections.shift().split("\r\n")
        mapName = basename(header.shift().split(":")[2], ".brk")
        const brk = header.join("\r\n").trim()
        createDirectoryIfNotExists(config.map)
        fs.writeFileSync(resolve(config.map, `${mapName}.brk`), brk, () => { })
    }

    const scriptDir = resolve(process.cwd(), config.scripts.directory)

    for (const script of scripts) {
        const scriptFile = join(scriptDir, script.name)
        if (scriptFile.indexOf(scriptDir) !== 0) throw new Error("that's illegal.")

        createDirectoryIfNotExists(dirname(scriptFile))

        if (!script.binary) 
            script.data = script.data.trim()
        else
            script.data = Buffer.from(script.data, 'base64')

        if (!fs.existsSync(scriptFile))
            fs.writeFileSync(scriptFile, script.data, () => { })
        else
            console.warn(`WARNING: Script already exists. Cannot overwrite. [${scriptFile}]`)
    }

    console.log(`Successfully debundled: ${mapName}.bbrk`)
}

function bundleMapData(config) {
    let bundleName = "bundle"
    let bbrk = ""
    
    if (config.map) {
        const brkData = fs.readFileSync(resolve(config.map), () => { })
        bundleName = basename(config.map, ".brk")
        bbrk +=`::${bundleName}.brk:\r\n` + brkData.toString()
        bbrk = bbrk.trim() + "\r\n"
    }

    bbrk += "---"

    for (const file of config.scripts.files) {
        const matchedFiles = glob.sync(file, {
            cwd: join(process.cwd(), config.scripts.directory)
        })
        for (const file of matchedFiles) {
            bbrk += `\r\n::${config.binary && (file + '.bin') || file}:`

            const fileBuffer = fs.readFileSync(resolve(config.scripts.directory, file), () => { })

            if (fileBuffer.length) {
                const fileData = (config.binary && Buffer.from(fileBuffer).toString('base64')) || fileBuffer
                bbrk += '\r\n'
                bbrk += fileData
            }
        }
    }

    const bbrkPath = resolve(process.cwd(), `${bundleName}.bbrk`)

    if (config.compression)
        bbrk = zlib.deflateSync(bbrk)

    fs.writeFileSync(bbrkPath, bbrk, () => { })

    console.log("Successfully bundled: " + bbrkPath)
}

module.exports = { bundleMapData, debundleMapData }