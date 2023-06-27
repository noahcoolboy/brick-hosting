const net = require('net')
const child_process = require('child_process')
const fs = require('fs')
const path = require('path')
const events = require('events')
const phin = require("phin")
    .defaults({
        url: "https://api.brick-hill.com/v1/games/postServer",
        method: "POST",
        timeout: 12000
    });

const grpcHandler = require("./grpcHandler")
const audioHandler = require("./audioHandler")
const messageClient = require("./messageClient")
const util = require("util")

async function postServer({ hostKey, port, players }) {
    try {
        const postData = {
            "host_key": hostKey,
            "port": port,
            "players": players
        };
        const response = await phin({ data: postData });
        try {
            const body = JSON.parse(response.body);
            if (body.error) {
                console.warn("Failure while posting to games page:", JSON.stringify(body.error.message || body));
                if (body.error.message.host_key && body.error.message.host_key[0] == "The selected host key is invalid.") {
                    return "host_key";
                } else if (body.error.message == "Banned users cannot host a set") {
                    return "banned";
                } else if (body.error.message === "You can only postServer once every minute") {
                    return "wait";
                }
            } else {
                return body.set_id || 1
            }
        }
        catch (err) {
            console.log("Failure while handling postServer error:", err)
        }
    }
    catch (err) {
        console.warn("Error while posting to games page.");
    }
}
let emitter = new events.EventEmitter()

let ports = []

function firstAvailablePort() {
    let x = 42480
    while (ports.includes(x)) {
        x++
    }
    ports.push(x)
    return x
}

let games = {}

async function create(id) {
    let mkdir = util.promisify(fs.mkdir)
    await mkdir(path.join(__dirname, id))
    await mkdir(path.join(__dirname, id, "maps"))
    await mkdir(path.join(__dirname, id, "scripts"))
    await mkdir(path.join(__dirname, id, "sounds"))
}

function getGameInfo(id) {
    if (!games[id]) {
        games[id] = new Proxy({
            server: null,
            playerCount: 0,
            logs: []
        }, {
            set: (target, key, value) => {
                emitter.emit("update", {
                    id,
                    key,
                    value
                })
                target[key] = value
                return true
            }
        })
        games[id].log = (log) => {
            if (typeof log != "object")
                log = [log]

            games[id].logs = games[id].logs.concat(log).slice(-25)
        }
    }
    return Object.assign(games[id], {
        maps: fs.readdirSync(path.join(__dirname, id, "maps")).filter(f => f.endsWith(".brk")),
        scripts: fs.readdirSync(path.join(__dirname, id, "scripts")).filter(f => f.endsWith(".js")),
        sounds: fs.readdirSync(path.join(__dirname, id, "sounds")),
    })
}

function start(id, options, db) {
    // Options object:
    // {
    //    hostKey: string,
    //    map: string,
    // }

    // The game object tracks the following properties
    // server: The server object, which listens for connections while the game is asleep
    // startTime: The time at which the game was started, used to calculate uptime
    // logs: The last 25 lines of stdout from the game
    // startBuffer: An array of objects containing the socket object and the data which had been sent up until the server was started
    // sleep: Whether the game is asleep or not
    // playerCount: The number of players in the game
    // players: An array of player objects, containing the player validation tokens
    // map: The map which the game is currently running
    // scripts: An array of scripts which the game is currently running
    // sounds: An array of sounds which the game is currently running
    // fork: The child_process object which is running the game
    // int: postServer interval ID

    if (!games[id]) {
        games[id] = new Proxy({
            server: null,
            playerCount: 0,
            logs: [],
            startTime: 0,
            players: [],
            sleep: true
        }, {
            set: (target, key, value) => {
                emitter.emit("update", {
                    id,
                    key,
                    value
                })
                target[key] = value
                return true
            }
        })
        games[id].log = (log) => {
            if (typeof log != "object")
                log = [log]

            games[id].logs = games[id].logs.concat(log).slice(-25)
        }
    }

    if (!options.map)
        return games[id].log("No map specified")

    let port = firstAvailablePort()
    let server = net.createServer((socket) => {
        // Buffer out the data while starting

        // This object contains the socket object, as well as the data which had been sent up until the server was started
        let startBuffer = {
            socket,
            buffer: Buffer.alloc(0),
        }
        let handler = (data) => {
            startBuffer.buffer = Buffer.concat([startBuffer.buffer, data])
        }
        socket.on('data', handler)
        socket.once('data', () => {
            // Send chat packet as a notice
            let notice = "Brick-Hosting Notice: Please wait while the game starts..."
            socket.write(Buffer.concat([
                Buffer.from([((notice.length + 1) + 1) * 2 + 1, 0x06]),
                Buffer.from(notice + "\0", "ascii"),
            ]))
        })

        if (games[id].fork && games[id].launched) {
            // Sometimes, this listener catches the socket connection and not the game
            // So we will pass the socket to the game for it to handle the rest
            let ch = new messageClient.Channel(games[id].fork, "main")
            ch.send("socketCount", 1)
            games[id].fork.send(startBuffer.buffer.toString("base64"), startBuffer.socket)
            startBuffer.socket.removeListener('data', handler)
            return
        } else {
            if (!games[id].startBuffer) { // Checks if a player is already attempting to connect
                games[id].startBuffer = [startBuffer]
            } else {
                games[id].startBuffer.push(startBuffer)
                return
            }
        }

        // TODO: Don't launch the game if it is already being launched
        // This can happen when a second player connects while the first player is still connecting
        games[id].sleep = false
        games[id].launched = false

        let fork = child_process.fork(path.join(__dirname, "index.js"), {
            silent: true,
            windowsHide: true,
        })

        fork.stdout.on('data', (data) => {
            games[id].log(data.toString().trim().split("\n"))
        })

        fork.stderr.on('data', (data) => {
            games[id].log(data.toString().trim().split("\n"))
        })

        let ch = new messageClient.Channel(fork, "main")

        // Pass the game options to the fork
        // We cannot use messageClient here as we need to send the
        // net.Server object using a separate sendHandle property
        fork.send({
            dir: id,
            ...options,
            setId: games[id].setId || 1,
        }, server)

        // Wait for the node-hill instance to be ready to receive connections
        ch.once("ready", () => {
            games[id].launched = true

            // Empty the connection buffer
            // We will spoof the packets that had been sent to the server manager while the game was starting
            // This is because the authentication packets were sent before the game was ready to receive them
            ch.send("socketCount", games[id].startBuffer.length)
            for (let startBuffer of games[id].startBuffer) {
                // NodeJS doesn't like sending buffers over IPC, so we convert it to a base64 string
                fork.send(startBuffer.buffer.toString("base64"), startBuffer.socket)
                startBuffer.socket.removeListener('data', handler)
            }
            delete games[id].startBuffer
        })

        ch.on("visit", () => {
            emitter.emit("visit", id)
        })
        ch.on("players", validationTokens => {
            games[id].players = validationTokens
            games[id].playerCount = validationTokens.length
        })

        audioHandler(fork, id, linkSessions)
        grpcHandler(fork, id, db)

        setTimeout(() => {
            if (!games[id].launched) {
                games[id].startBuffer.forEach(b => {
                    b.socket.removeListener('data', handler)
                    b.socket.end()
                })
                if (!fork.killed) {
                    games[id].log("Game did not launch in time and has been shut down.")
                    games[id].log("Please check for any infinite loops.")
                    stop(id)
                }
            }
        }, 7500);

        fork.on("exit", (code) => {
            if (code == 200) {
                games[id].log("Game has been put to sleep by brick hosting.")
                games[id].sleep = true
                games[id].fork = null
            } else {
                if (code != null) {
                    games[id].log("Game has shut down or crashed.")
                }
                stop(id)
            }
        })

        games[id].fork = fork
    })

    server.on("error", err => {
        console.warn("Error while starting server:", err)
        if (err.code == "EADDRINUSE") {
            try {
                port = firstAvailablePort()
                server.listen(port)
            } catch (e) { }
        }
    })

    server.listen(port)

    server.on("close", () => {
        ports.splice(ports.indexOf(port), 1) // Free up the port
    })

    games[id].server = server
    games[id].startTime = Date.now()
    games[id].log("Game has been started.")
    if (process.env.NODE_ENV == "production") {
        let res = postServer({ hostKey: options.hostKey, port, players: games[id].players })
        if (typeof res == "number")
            games[id].setId = res
        games[id].int = setInterval(async () => {
            if (await res == "wait") return res = ""
            res = await postServer({ hostKey: options.hostKey, port, players: games[id].players })
            if (res == "banned") {
                games[id].log("User is banned.")
                stop(id)
            } else if (res == "host_key") {
                games[id].log("Host key is invalid.")
                stop(id)
            } else if (typeof res == "number")
                games[id].setId = res
        }, 62500)
    }
}

function stop(id) {
    if (games[id]) {
        try { // FIXME: Sometimes the fork does not get killed properly
            games[id].fork.kill()
        } catch (e) { }
        games[id].fork = null
        try {
            games[id].server.close()
        } catch (e) { }
        games[id].server = null

        games[id].log("Game has been stopped.")
        clearInterval(games[id].int) // Remove postServer interval
    }
}

let linkSessions = {}
function audio(socket) {
    if (!socket.linked) {
        let code = Math.random().toString(36).substring(2, 15)
        socket.emit("code", "/sound " + code)
        linkSessions[code] = socket
        socket.on("disconnect", () => {
            delete linkSessions[code]
        })
    }
}

module.exports = {
    create,
    start,
    emitter,
    getGameInfo,
    games,
    stop,
    audio
}