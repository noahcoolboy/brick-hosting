const crypto = require("crypto")
const path = require("path")
const fs = require("fs")

module.exports = function (data, id, linkSessions, audioSessions) {
    return new Promise((resolve, reject) => {
        if (data.type == "link") {
            if (linkSessions[data.code]) {
                let sessionId = crypto.randomBytes(16).toString("hex")
                audioSessions[sessionId] = linkSessions[data.code]
                audioSessions[sessionId].emit("linked")
                delete linkSessions[data.code]
                audioSessions[sessionId].on("disconnect", () => {
                    delete audioSessions[sessionId]
                })
                return resolve({
                    type: "link",
                    reqId: data.reqId,
                    sessionId
                })
            } else {
                return resolve({
                    type: "link",
                    reqId: data.reqId,
                    error: "Invalid code."
                })
            }
        } else if (data.type == "position") {
            if (audioSessions[data.sessionId]) {
                audioSessions[data.sessionId].emit("moved", data.pos, data.rot)
            }
        } else if (data.type == "play") {
            if (audioSessions[data.sessionId]) {
                audioSessions[data.sessionId].emit("play", data.sound)
            }
        } else if (data.type == "stop") {
            if (audioSessions[data.sessionId]) {
                audioSessions[data.sessionId].emit("stop", data.sound)
            }
        } else if (data.type == "newSound") {
            let base = path.basename(data.sound.file)
            let path2 = path.join(__dirname, id, "sounds", base)
            fs.readFile(path2, async (err, data2) => {
                if (err) {
                    return resolve({
                        type: "newSound",
                        reqId: data.reqId,
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
                    return resolve({
                        type: "newSound",
                        reqId: data.reqId
                    })
                }
            })
            return
        } else if (data.type == "left") {
            if (audioSessions[data.sessionId]) {
                audioSessions[data.sessionId].emit("left")
                delete audioSessions[data.sessionId]
            }
        } else if (data.type == "check") {
            if (audioSessions[data.sessionId]) {
                return resolve({
                    type: "check",
                    reqId: data.reqId,
                    sessionId: data.sessionId,
                    connected: true
                })
            } else {
                return resolve({
                    type: "check",
                    reqId: data.reqId,
                    sessionId: data.sessionId,
                    error: "Sound session unlinked."
                })
            }
        }
        resolve({})
    })
}