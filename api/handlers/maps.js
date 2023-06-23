const master = require("../../games/master")
const path = require("path")
const fs = require("fs")

module.exports = function (socket, db) {
    socket.on("add-map", async (data) => {
        if (socket.editing) {
            if (data.map.length > 1000 * 1000 * 5) {
                socket.emit("update", {
                    id: data.id,
                    prop: "maps.error",
                    value: "Map size must be less than 5MB"
                })
                socket.emit("add-map")
                return
            }
            if(data.map.toString().split("\n").slice(7).filter(v => v.match(/^-?\d/)).length < 100) {
                socket.emit("update", {
                    id: data.id,
                    prop: "maps.error",
                    value: "Maps must contain at least 100 bricks"
                })
                socket.emit("add-map")
                return
            }
            if(!data.name.endsWith(".brk")) {
                socket.emit("update", {
                    id: data.id,
                    prop: "maps.error",
                    value: "Map name must end with .brk"
                })
                socket.emit("add-map")
                return
            }

            if (fs.existsSync(path.join(__dirname, "../../games/", socket.editing))) {
                fs.writeFile(path.join(__dirname, "../../games/", socket.editing, "maps", path.basename(data.name)), data.map, () => {
                    setTimeout(() => {
                        let info = master.getGameInfo(socket.editing)
                        socket.emit("update", {
                            id: data.id,
                            prop: "maps.mapList",
                            value: info.maps
                        })
                        socket.emit("add-map") // Notify that the map has been uploaded
                    }, 1000) // Timeout is simply for making it look like something is happening
                })
            }
        }
    })

    socket.on("delete-map", async (data) => {
        if (socket.editing) {
            if (fs.existsSync(path.join(__dirname, "../../games/", socket.editing, "maps", path.basename(data.name)))) {
                fs.unlink(path.join(__dirname, "../../games/", socket.editing, "maps", path.basename(data.name)), () => {
                    let info = master.getGameInfo(socket.editing)
                    socket.emit("update", {
                        id: data.id,
                        prop: "maps.mapList",
                        value: info.maps
                    })
                })
            }
        }
    })

    socket.on("set-map", async (data) => {
        if (socket.editing) {
            if(!data.name) {
                db.collection("users").findOneAndUpdate({ "servers.id": socket.editing }, { $set: { "servers.$.map": null } })
            } else if (fs.existsSync(path.join(__dirname, "../../games/", socket.editing, "maps", path.basename(data.name)))) {
                db.collection("users").findOneAndUpdate({ "servers.id": socket.editing }, { $set: { "servers.$.map": path.basename(data.name) } })
            }
        }
    })
}