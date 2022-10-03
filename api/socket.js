const socketio = require("socket.io")
const fs = require("fs")
const master = require("../games/master")

let io;

export default function (req, res, next) {
    if(!io) {
        io = new socketio.Server(res.connection.server, {
            transports: ["websocket", "polling"],
            maxHttpBufferSize: 1000 * 1000 * 10
        })
        io.on("connection", async socket => {
            if(socket.handshake.query && socket.handshake.query.audio) {
                return master.audio(socket)
            }

            if(!socket.handshake.headers.cookie || !socket.handshake.headers.cookie.match(/token=[0-9a-f]+/))
                return socket.disconnect()
            
            socket.cookie = socket.handshake.headers.cookie.match(/token=([0-9a-f]+)/)[1]
            let user = await req.db.collection("users").findOne({
                token: socket.cookie
            })
            if (user) {
                for (let file of fs.readdirSync("./api/handlers")) {
                    if(process.env.NODE_ENV != "production")
                        delete require.cache[require.resolve(`./handlers/${file}`)]
                    require(`./handlers/${file}`)(socket, req.db)
                }
                socket.emit("auth", {
                    success: true
                })
            } else {
                socket.emit("auth", {
                    error: "Invalid Token"
                })
                socket.disconnect()
            }
        })
    }
    next()
}