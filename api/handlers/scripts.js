const master = require("../../games/master")
const path = require("path")
const fs = require("fs")

module.exports = function (socket, db) {
    socket.on("add-script", async (data) => {
        if (socket.editing) {
            if (data.script.length > 1000 * 1000 * 2) {
                socket.emit("update", {
                    id: data.id,
                    prop: "scripts.error",
                    value: "Script size must be less than 2MB"
                })
                socket.emit("add-script")
                return
            }
            if(!data.name.endsWith(".js")) {
                socket.emit("update", {
                    id: data.id,
                    prop: "scripts.error",
                    value: "Script name must end with .js"
                })
                socket.emit("add-script")
                return
            }

            if (fs.existsSync(path.join(__dirname, "../../games/", socket.editing))) {
                fs.writeFile(path.join(__dirname, "../../games/", socket.editing, "scripts", path.basename(data.name)), data.script, () => {
                    setTimeout(() => {
                        let info = master.getGameInfo(socket.editing)
                        socket.emit("update", {
                            id: data.id,
                            prop: "scripts.scriptList",
                            value: info.scripts
                        })
                        socket.emit("add-script")
                    }, 1000)
                })
            }
        }
    })

    socket.on("delete-script", async (data) => {
        if (socket.editing) {
            if (fs.existsSync(path.join(__dirname, "../../games/", socket.editing, "scripts", path.basename(data.name)))) {
                fs.unlink(path.join(__dirname, "../../games/", socket.editing, "scripts", path.basename(data.name)), () => {
                    let info = master.getGameInfo(socket.editing)
                    socket.emit("update", {
                        id: data.id,
                        prop: "scripts.scriptList",
                        value: info.scripts
                    })
                })
            }
        }
    })
}