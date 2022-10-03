const cookieParser = require("cookie-parser")
const socketio = require("socket.io")
const express = require("express")
const app = express()
const master = require("../games/master")

app.use(cookieParser())

const mongodb = require('mongodb')
const client = new mongodb.MongoClient(process.env.DB)
const db = client.db("brick-hosting" + (process.env.NODE_ENV == "production" ? "" : "-testing"))

app.use((req, res, next) => {
    req.db = db
    next()
})

master.emitter.on("visit", function (id) {
    db.collection("users").findOneAndUpdate({ "servers.id": id }, { $inc: { "servers.$.visits": 1 } })
})

let sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

db.collection("users").countDocuments().then(async count => {
    let cursor = db.collection("users").find({})
    for (let i = 0; i < count; i++) {
        let user = await cursor.next()
        if (user.servers.length > 0) {
            for (let server of user.servers) {
                if (server.running) {
                    master.start(server.id, {
                        hostKey: server.hostKey,
                        map: server.map
                    }, db)
                    await sleep(250)
                }
            }
        }
    }
})

module.exports = app