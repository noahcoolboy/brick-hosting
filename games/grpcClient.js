const messageClient = require("./messageClient")
const channel = new messageClient.Channel(process, "grpc")

module.exports = {
    getSaveData(userId) {
        return new Promise((resolve, reject) => {
            channel.send("getSaveData", userId, (data) => {
                if(!data)
                    return reject(new Error("Unable to get save data."))
                if(data.error)
                    return reject(new Error(data.error))

                resolve(data.data || {})
            })
        })
    },

    setSaveData(userId, data) {
        return new Promise((resolve, reject) => {
            channel.send("setSaveData", {
                userId,
                data
            }, (data) => {
                if(data.error)
                    return reject(new Error(data.error))

                resolve("OK")
            })
        })
    }
}