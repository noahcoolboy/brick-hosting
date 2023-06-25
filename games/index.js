const nh = require('node-hill')
const path = require("path")
const grpcClient = require("./grpcClient")
const audioClient = require("./audioClient")
const messageClient = require("./messageClient")

let ch = new messageClient.Channel(process, "main")
let inactivityTimeout;

process.once("message", ({ map, hostKey, dir, setId }, netServer) => {
    // Data object contains map, hostKey, server and dir
    nh.startServer({
        local: process.env.NODE_ENV != "production",
        mapDirectory: path.join(__dirname, dir, "maps"),
        scripts: path.join(__dirname, dir, "scripts"),
        map,
        hostKey,
        postServer: false,
        port: 42400 + Math.floor(Math.random() * 20), // Random port to be used while game is starting up
    }).then(async Game => {
        netServer.on("connection", Game.server._events.connection) // Add the old server's connection event to the new server
        Game.server.close() // Close the old server
        Game.server = netServer // Replace the old server with the new one

        Game.Sound = audioClient.init(Game)
        Game.grpc = grpcClient
        Game.MOTD = "\\c7[NOTICE]: This server is proudly hosted on Brick-Hosting.xyz."

        Game.on("playerJoin", player => {
            //process.send({ type: "players", players: Game.players.map(v => v.validationToken) })
            ch.send("players", Game.players.map(v => v.validationToken))
            if (inactivityTimeout) {
                clearTimeout(inactivityTimeout)
                inactivityTimeout = null
            }

            setTimeout(() => {
                if (!player.destroyed) {
                    ch.send("visit")
                }
            }, 60000);
        })

        Game.on("playerLeave", player => {
            ch.send("players", Game.players.map(v => v.validationToken))
            if (Game.players.length == 0) {
                inactivityTimeout = setTimeout(async () => {
                    process.exit(200)
                }, 1000 * 60 * 5)
            }
        })

        ch.send("ready")
        ch.once("socketCount", (socketCount) => {
            let handler = (data, socket) => {
                netServer.emit("connection", socket)
                socket.push(Buffer.from(data, "base64"))
                socketCount--
                if (socketCount <= 0) return process.removeListener("message", handler)
            }
            process.on("message", handler)
        })

        // Automatically make the game owner admin
        // Also RPC
        const setData = await Game.getSetData(setId)
        Game.setData = setData
        Game.emit("setDataLoaded")
        
        process.title = `node BHost: ${setData.name} (${setId})`
    })
})