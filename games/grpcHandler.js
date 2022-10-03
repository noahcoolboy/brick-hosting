module.exports = function (data, id, db) {
    return new Promise((resolve, reject) => {
        if (data.type == "getSaveData") {
            db.collection("savedata").findOne({ userId: data.userId, gameId: id }).then(doc => {
                resolve({
                    type: "getSaveData",
                    reqId: data.reqId,
                    data: doc?.data || {},
                })
            }).catch(e => {
                resolve({
                    type: "getSaveData",
                    reqId: data.reqId,
                    error: e.message
                })
            })
        } else if (data.type == "setSaveData") {
            if(isNaN(data.userId))
                resolve({
                    type: "setSaveData",
                    reqId: data.reqId,
                    error: "User ID must be a number."
                })
            data.userId = Number(data.userId)
            
            if(!JSON.stringify(data.data))
                resolve({
                    type: "setSaveData",
                    reqId: data.reqId,
                    error: "Data is not serializable."
                })
                
            if(JSON.stringify(data.data).length > 2048)
                resolve({
                    type: "setSaveData",
                    reqId: data.reqId,
                    error: "Data length may not exceed 2048 bytes."
                })
    
            db.collection("savedata").findOneAndUpdate({ userId: data.userId, gameId: id }, { $set: { data: data.data } }, { upsert: true }).then(() => {
                resolve({
                    type: "setSaveData",
                    reqId: data.reqId,
                })
            }).catch(e => {
                resolve({
                    type: "setSaveData",
                    reqId: data.reqId,
                    error: e.message
                })
            })
        }
    })
}