const nh = require('node-hill')
const path = require("path")
const grpcClient = require("./grpcClient")
const audioClient = require("./audioClient")

function getSocket(server, socketCount) {
    if (socketCount <= 0) return
    process.once("message", (msg, socket) => {
        if (msg == "socket") {
            server.emit("connection", socket)
            process.once("message", (data) => {
                setTimeout(() => {
                    socket.push(Buffer.from(data, "base64"))
                }, 150);
                getSocket(socketCount)
            })
        }
    })
}

let int;
process.once("message", ({ dir, map, hostKey }) => {
    process.once("message", (msg, server) => {
        server.listen = () => { }

        nh.startServer({
            local: process.env.NODE_ENV != "production",
            mapDirectory: path.join(__dirname, dir, "maps"),
            scripts: path.join(__dirname, dir, "scripts"),
            map,
            server: server,
            hostKey,
            postServer: false
        }).then(Game => {
            Game.Sound = audioClient.init(Game)
            Game.grpc = grpcClient

            Game.on("playerJoin", player => {
                process.send({ type: "players", players: Game.players.map(v => v.validationToken) })
                if (int) {
                    clearTimeout(int)
                    int = null
                }

                setTimeout(() => {
                    if (!player.destroyed) {
                        process.send({ type: "visit" })
                    }
                }, 60000);
            })

            Game.on("playerLeave", player => {
                process.send({ type: "players", players: Game.players.map(v => v.validationToken) })
                if (Game.players.length == 0) {
                    int = setTimeout(async () => {
                        process.exit(200)
                    }, 1000 * 60 * 15)
                }
            })

            process.send({ type: "ready" })
            process.once("message", (socketCount) => {
                getSocket(server, socketCount)
            })
        })
    })
})
