// messageClient.js handles the interprocess communication between the game and the server manager.
const crypto = require("crypto")
const EventEmitter = require("events")

// Function to generate a random request ID
let genId = () => crypto.randomBytes(16).toString("hex")

// For each communication type (game info, audio, grpc, etc.) a channel is created
class Channel extends EventEmitter {
    constructor(socket, type) {
        super()
        this.socket = socket
        this.type = type

        // When we receive a message
        this.socket.on("message", (data) => {
            if(data.type == type && !data.reply) {
                this.emit(data.subtype, data.data, (reply) => {
                    this.socket.send({
                        type,
                        subtype: data.subtype,
                        id: data.id,
                        data: reply,
                        reply: true // Replies should not fire events
                    })
                })
            }
        })
    }

    // When we send a message
    send(subtype, data, callback, timeout = 1000) {
        let id = genId()
        this.socket.send({
            type: this.type,
            subtype,
            id,
            data,
        })

        if(callback) {
            let got = false
            let listener = (data) => {
                if(data.id == id) {
                    got = true
                    callback(data.data)
                    this.socket.removeListener("message", listener)
                }
            }
            this.socket.on("message", listener)
            setTimeout(() => {
                if(!got) {
                    callback(null)
                    this.socket.removeListener("message", listener)
                }
            }, timeout)
        }
    }
}

module.exports = {
    Channel
}