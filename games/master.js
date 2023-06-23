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
                if(body.error.message.host_key && body.error.message.host_key[0] == "The selected host key is invalid.") {
                    return "host_key";
                } else if(body.error.message == "Banned users cannot host a set") {
                    return "banned";
                } else if (body.error.message === "You can only postServer once every minute") {
                    return "wait";
                }
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

    let port = firstAvailablePort()
    let server = net.createServer((socket) => {
        // Buffer out the data while starting

        let startBuffer = {
            socket,
            buffer: Buffer.alloc(0),
        }
        let handler = (data) => {
            startBuffer.buffer = Buffer.concat([startBuffer.buffer, data])
        }
        socket.on('data', handler)

        if (!games[id].startBuffer) {
            games[id].startBuffer = [startBuffer]
        } else {
            games[id].startBuffer.push(startBuffer)
            return
        }

        games[id].sleep = false
        let launched = false

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

        fork.send({
            dir: id,
            ...options
        })

        fork.send("start", server)

        fork.on("message", (msg) => {
            if (msg.type == "ready") {
                launched = true
                fork.send(games[id].startBuffer.length)
                for (let buffer of games[id].startBuffer) {
                    fork.send("socket", buffer.socket)
                    fork.send(buffer.buffer.toString("base64"))
                    buffer.socket.removeListener('data', handler)
                }
                delete games[id].startBuffer
            } else if (msg.type == "visit") {
                emitter.emit("visit", id)
            } else if (msg.type == "players") {
                games[id].playerCount = msg.players.length
                games[id].players = msg.players
            } else if (msg.type == "grpc") {
                grpcHandler(msg.data, id, db).then(data => {
                    fork.send({ type: "grpc", data })
                })
            } else if (msg.type == "audio") {
                audioHandler(msg.data, id, linkSessions, audioSessions).then(data => {
                    fork.send({ type: "audio", data })
                })
            }
        })

        setTimeout(() => {
            if (!launched) {
                games[id].startBuffer.forEach(b => {
                    b.socket.removeListener('data', handler)
                    b.socket.end()
                })
                if (!fork.killed) {
                    games[id].log("Game did not launch in time and has been shut down.")
                    games[id].log("Please check for any infinite loops.")
                    fork.kill()
                }
            }
        }, 7500);

        fork.on("exit", (code) => {
            if (code == 200) {
                games[id].log("Game has been put to sleep by brick hosting.")
            } else {
                if (code != null) {
                    games[id].log("Game has shut down or crashed.")
                }
                server.close()
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
        ports.splice(ports.indexOf(port), 1)
        games[id].server = null
    })

    games[id].server = server
    games[id].startTime = Date.now()
    games[id].log("Game has been started.")
    if (process.env.NODE_ENV == "production") {
        let res = postServer({ hostKey: options.hostKey, port, players: games[id].players })
        games[id].int = setInterval(async () => {
            if (await res == "wait") return res = ""
            res = await postServer({ hostKey: options.hostKey, port, players: games[id].players })
            if(res == "banned") {
                games[id].log("User is banned.")
                stop(id)
            } else if(res == "host_key") {
                games[id].log("Host key is invalid.")
                stop(id)
            }
        }, 62500)
    }
}

function stop(id) {
    if (games[id] && games[id].server) {
        if (games[id].fork && !games[id].fork.killed) {
            games[id].fork.kill()
        }
        games[id].fork = null
        games[id].server.close()
        games[id].server = null
        games[id].log("Game has been stopped.")
        clearInterval(games[id].int)
    }
}

let linkSessions = {}
let audioSessions = {}
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