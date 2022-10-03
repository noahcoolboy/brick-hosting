const master = require("../../games/master")

module.exports = function (socket, db) {
    socket.on("get-server", async (data) => {
        if(!data.hasOwnProperty("serverIndex")) {
            return socket.emit("get-server", {
                error: "Missing information."
            })
        }

        let user = await db.collection("users").findOne({
            token: socket.cookie
        })

        if(isNaN(data.serverIndex) || data.serverIndex < 0 || data.serverIndex >= user.servers.length) {
            return socket.emit("get-server", {
                error: "Invalid server index."
            })
        }

        let server = user.servers[data.serverIndex]
        let info = master.getGameInfo(server.id)

        socket.editing = server.id
        socket.emit("get-server", {
            gameName: server.name,
            status: info.server ? "running": "stopped",
            overview: {
                playerCount: info.playerCount,
                visits: server.visits || 0,
                startTime: info.startTime || Date.now(),
            },
            console: {
                logs: info.logs,
            },
            maps: {
                mapList: info.maps,
                selected: server.map,
            },
            scripts: {
                scriptList: info.scripts,
            },
            sounds: {
                soundList: info.sounds,
            },
        })
    })
}