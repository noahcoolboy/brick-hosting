const messageClient = require("./messageClient")

module.exports = function (fork, gameId, db) {
    const channel = new messageClient.Channel(fork, "grpc")

    channel.on("getSaveData", (userId, reply) => {
        if (isNaN(userId))
            return reply({
                error: "User ID must be a number."
            })
        userId = Number(userId)

        db.collection("savedata").findOne({ userId: userId, gameId }).then(doc => {
            reply({
                data: doc?.data || {}
            })
        }).catch(e => {
            reply({
                error: e.message
            })
        })
    })

    channel.on("setSaveData", (data, reply) => {
        if (isNaN(data.userId))
            return reply({
                error: "User ID must be a number."
            })
        data.userId = Number(data.userId)

        if (!JSON.stringify(data.data))
            return reply({
                error: "Data is not serializable."
            })

        if (JSON.stringify(data.data).length > 2048)
            return reply({
                error: "Data length may not exceed 2048 bytes."
            })

        db.collection("savedata").findOneAndUpdate({ userId: data.userId, gameId }, { $set: { data: data.data } }, { upsert: true }).then(() => {
            reply({})
        }).catch(e => {
            reply({
                error: e.message
            })
        })
    })
}