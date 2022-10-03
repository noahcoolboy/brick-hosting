const crypto = require("crypto")
const path = require("path")
const master = require("../../games/master")
const fs = require("fs")

module.exports = function (socket, db) {
    socket.on("add-server", async (data) => {
        let user = await db.collection("users").findOne({
            token: socket.cookie
        })
        if(!data.name || !data.name.trim().length || !data.hostKey) {
            return socket.emit("add-server", {
                error: "Missing information."
            })
        }

        if(user.servers.length >= 10) {
            return socket.emit("add-server", {
                error: "You have reached the maximum number of servers"
            })
        }

        if(data.name.length < 2 || data.name.length > 30) {
            return socket.emit("add-server", {
                error: "Server name must be between 2 and 30 characters"
            })
        }

        if(data.hostKey.match(/[^a-zA-Z0-9]/) || data.hostKey.length != 64) {
            return socket.emit("add-server", {
                error: "Host Key must be 64 characters long and only contain letters and numbers"
            })
        }

        let id;
        while(true) {
            id = crypto.randomBytes(16).toString("hex")
            if(!fs.existsSync(path.join(__dirname, "../../games/", id))) {
                break
            }
        }

        master.create(id)

        await db.collection("users").findOneAndUpdate({
            token: socket.cookie
        }, {
            $push: {
                servers: {
                    name: data.name,
                    hostKey: data.hostKey,
                    id,
                    visits: 0,
                    running: false,
                }
            }
        })

        socket.emit("add-server", {
            success: true
        })
    })
}