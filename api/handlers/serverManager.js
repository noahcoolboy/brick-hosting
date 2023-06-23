const master = require("../../games/master")

async function verify(socket, data, db) {
    let id;
    let user;
    if (!socket.editing) {
        if (!data.id) {
            return socket.emit("start-server", {
                error: "Missing information."
            })
        }

        user = await db.collection("users").findOne({
            token: socket.cookie
        })

        if (!user.servers.map(v => v.id).includes(data.id)) {
            return socket.emit("start-server", {
                error: "Invalid server ID."
            })
        }

        id = data.id
    } else {
        id = socket.editing
        user = await db.collection("users").findOne({ "servers.id": id })
    }

    return {
        id,
        user,
    }
}

let sockets = {}

module.exports = function (socket, db) {
    socket.on("start-server", async (data) => {
        let { id, user } = await verify(socket, data, db)

        if (!master.games[id]?.server) {
            db.collection("users").findOneAndUpdate({ "servers.id": id }, { $set: { "servers.$.running": true } })
            let game = user.servers.find(v => v.id === id)
            let options = {
                hostKey: game.hostKey,
            }
            if (game.map) {
                options.map = game.map
            }
            master.start(id, options, db)
        }
    })

    socket.on("stop-server", async (data) => {
        let { id, user } = await verify(socket, data, db)

        if (master.games[id]?.server) {
            db.collection("users").findOneAndUpdate({ "servers.id": id }, { $set: { "servers.$.running": false } })
            master.stop(id)
        }
    })

    socket.on("edit-server", async (data) => {
        let { id, user } = await verify(socket, data, db)
        if(!id)
            return

        if(data.name.length < 2 || data.name.length > 30 || data.hostKey.match(/[^a-zA-Z0-9]/) || data.hostKey.length != 64) {
            return socket.emit("edit-server", {
                error: "Invalid information."
            })
        }

        db.collection("users").findOneAndUpdate({ "servers.id": id }, {
            $set: {
                "servers.$.hostKey": data.hostKey,
                "servers.$.name": data.name,
            }
        })
    })

    socket.on("delete-server", async (callback) => {
        let { id, user } = await verify(socket, {}, db)

        if (master.games[id]?.server) {
            master.stop(id)
        }

        setTimeout(async () => {
            await db.collection("users").findOneAndUpdate({ "servers.id": id }, { $pull: { servers: { id } } })
            callback()
        }, 1000)
    })

    socket.on("subscribe", async (data) => {
        let { id, user } = await verify(socket, data, db)

        if (!sockets[id]) {
            sockets[id] = []
        }
        sockets[id].push(socket)
        socket.on("disconnect", () => {
            sockets[id].splice(sockets[id].indexOf(socket), 1)
        })
    })
}

function handler(data) {
    if(process.env.NODE_ENV != "production")
        console.log("Update:", data)
    
    if (sockets[data.id]) {
        sockets[data.id].forEach(socket => {
            if (data.key == "server") {
                socket.emit("update", {
                    id: data.id,
                    prop: "status",
                    value: data.value ? "running" : "stopped"
                })
            } else if (data.key == "startTime") {
                socket.emit("update", {
                    id: data.id,
                    prop: "overview.startTime",
                    value: data.value
                })
            } else if (data.key == "logs") {
                socket.emit("update", {
                    id: data.id,
                    prop: "console.logs",
                    value: data.value
                })
            } else if (data.key == "playerCount") {
                socket.emit("update", {
                    id: data.id,
                    prop: "overview.playerCount",
                    value: data.value
                })
            }
        })
    }
}

master.emitter.removeAllListeners("update")
master.emitter.on("update", handler)