// audioHandler.js serves as a bridge between the audioClient and the players linked with the audio system.
const crypto = require("crypto")
const path = require("path")
const fs = require("fs")
const messageClient = require("./messageClient")

let audioSessions = {}
module.exports = function (fork, gameId, linkSessions) {
    const channel = new messageClient.Channel(fork, "audio")

    channel.on("link", (code, reply) => {
        if (linkSessions[code]) {
            let sessionId = crypto.randomBytes(16).toString("hex")
            audioSessions[sessionId] = linkSessions[code]
            audioSessions[sessionId].emit("linked")
            delete linkSessions[code]
            audioSessions[sessionId].on("disconnect", () => {
                delete audioSessions[sessionId]
            })
            reply({
                sessionId
            })
        } else {
            reply({
                error: "Invalid code."
            })
        }
    })

    channel.on("position", (data) => {
        if (audioSessions[data.sessionId])
            audioSessions[data.sessionId].emit("moved", data.pos, data.rot)
    })

    channel.on("play", (data) => {
        if (audioSessions[data.sessionId])
            audioSessions[data.sessionId].emit("play", data.sound)
    })

    channel.on("stop", (data) => {
        if (audioSessions[data.sessionId])
            audioSessions[data.sessionId].emit("stop", data.sound)
    })

    channel.on("newSound", (data, reply) => {
        let base = path.basename(data.sound.file)
        let path2 = path.join(__dirname, gameId, "sounds", base)
        fs.readFile(path2, async (err, data2) => {
            if (err) {
                return reply({
                    error: "Invalid sound."
                })
            } else {
                data.sound.format = path.extname(data.sound.file).substring(1)
                data.sound.file = data2
                await Promise.all(data.sessions.map(sessionId => new Promise(a => {
                    audioSessions[sessionId].emit("newSound", data.sound, a);
                    setTimeout(() => {
                        a()
                    }, 250);
                })))
                return reply({
                    success: true
                })
            }
        })
        return
    })

    channel.on("left", code => {
        if (audioSessions[code]) {
            audioSessions[code].emit("left")
            delete audioSessions[code]
        }
    })

    channel.on("check", (code, reply) => {
        if (audioSessions[code]) {
            reply({
                connected: true
            })
        } else {
            reply({
                error: "Sound session unlinked."
            })
        }
    })
}