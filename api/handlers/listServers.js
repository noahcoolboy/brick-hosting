const master = require("../../games/master")

module.exports = function (socket, db) {
    socket.on("list-servers", async () => {
        let user = await db.collection("users").findOne({
            token: socket.cookie
        })
        socket.emit("list-servers", user.servers.map((server, i) => {
            return {
                name: server.name,
                n: i,
                status: master.games[server.id]?.server ? "running": "stopped",
                id: server.id
            }
        }))
    })
}