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
        //server.listen = () => { }

        nh.startServer({
            local: process.env.NODE_ENV != "production",
            mapDirectory: path.join(__dirname, dir, "maps"),
            scripts: path.join(__dirname, dir, "scripts"),
            map,
            hostKey,
            postServer: false,
            port: 42400 + Math.floor(Math.random() * 20), // Random port to be used while game is starting up
        }).then(Game => {
            server.on("connection", Game.server._events.connection) // Add the old server's connection event to the new server
            Game.server.close() // Close the old server
            Game.server = server // Replace the old server with the new one

            Game.Sound = audioClient.init(Game)
            Game.grpc = grpcClient
            Game.MOTD = "\\c7[NOTICE]: This server is proudly hosted on Brick-Hosting.xyz."

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
                    }, 1000 * 60 * 5)
                }
            })

            process.send({ type: "ready" })
            process.once("message", (socketCount) => {
                getSocket(server, socketCount)
            })
        })
    })
})
