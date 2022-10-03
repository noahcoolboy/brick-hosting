const crypto = require("crypto")

module.exports = {
    getSaveData(userId) {
        return new Promise((resolve, reject) => {
            let reqId = crypto.randomBytes(16).toString("hex")
            process.send({
                type: "grpc",
                data: {
                    type: "getSaveData",
                    userId,
                    reqId,
                }   
            })
    
            let got = false
            let handler = (data) => {
                if(data.type == "grpc" && data.data.reqId == reqId) {
                    got = true
                    process.removeListener("message", handler)

                    if(data.data.error) {
                        return reject(new Error(data.data.error))
                    }

                    resolve(data.data.data || {})
                }
            }
            process.on("message", handler)

            setTimeout(() => {
                if (!got) {
                    process.removeListener("message", handler)
                    reject(new Error("getSaveData timed out."))
                }
            }, 10000);
        })
    },

    setSaveData(userId, data) {
        return new Promise((resolve, reject) => {
            let reqId = crypto.randomBytes(16).toString("hex")
            process.send({
                type: "grpc",
                data: {
                    type: "setSaveData",
                    userId,
                    reqId,
                    data,
                }   
            })
    
            let got = false
            let handler = (data) => {
                if(data.type == "grpc" && data.data.reqId == reqId) {
                    got = true
                    process.removeListener("message", handler)
                    
                    if(data.data.error) {
                        return reject(new Error(data.data.error))
                    }

                    resolve("OK")
                }
            }
            process.on("message", handler)

            setTimeout(() => {
                if (!got) {
                    process.removeListener("message", handler)
                    reject(new Error("setSaveData timed out."))
                }
            }, 10000);
        })
    }
}