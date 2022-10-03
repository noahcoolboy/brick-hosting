const master = require("../../games/master")
const path = require("path")
const fs = require("fs")

module.exports = function (socket, db) {
    socket.on("add-sound", async (data) => {
        if (socket.editing) {
            if (data.sound.length > 1000 * 1000 * 10) {
                socket.emit("update", {
                    id: data.id,
                    prop: "sounds.error",
                    value: "Sound size must be less than 10MB"
                })
                socket.emit("add-sound")
                return
            }
            if([".mp3", ".ogg", ".opus", ".wav", ".aac", ".m4a"].indexOf(path.extname(data.name)) == -1) {
                socket.emit("update", {
                    id: data.id,
                    prop: "sounds.error",
                    value: "Sound name must end with .mp3, .ogg, .opus, .wav, .aac, or .m4a"
                })
                socket.emit("add-sound")
                return
            }

            if (fs.existsSync(path.join(__dirname, "../../games/", socket.editing))) {
                fs.writeFile(path.join(__dirname, "../../games/", socket.editing, "sounds", path.basename(data.name)), data.sound, () => {
                    setTimeout(() => {
                        let info = master.getGameInfo(socket.editing)
                        socket.emit("update", {
                            id: data.id,
                            prop: "sounds.soundList",
                            value: info.sounds
                        })
                        socket.emit("add-sound")
                    }, 1000)
                })
            }
        }
    })

    socket.on("delete-sound", async (data) => {
        if (socket.editing) {
            if (fs.existsSync(path.join(__dirname, "../../games/", socket.editing, "sounds", path.basename(data.name)))) {
                fs.unlink(path.join(__dirname, "../../games/", socket.editing, "sounds", path.basename(data.name)), () => {
                    let info = master.getGameInfo(socket.editing)
                    socket.emit("update", {
                        id: data.id,
                        prop: "sounds.soundList",
                        value: info.sounds
                    })
                })
            }
        }
    })
}