const crypto = require("crypto")
let positional = false

module.exports = {
    init(Game) {
        Game.sounds = []

        Game.command("sound", (caller, args) => {
            if (!args) return caller.message("Usage: /sound <command>")
            if (caller.audioLinked) return caller.message("You are already linked to an audio session.")

            let reqId = crypto.randomBytes(16).toString("hex")
            process.send({
                type: "audio",
                data: {
                    type: "link",
                    reqId,
                    code: args,
                }
            })

            let got = false
            let handler = (data) => {
                if (data.type == "audio" && data.data.reqId == reqId) {
                    got = true
                    process.removeListener("message", handler)

                    if (data.data.error) {
                        return caller.message("[#ff0000]" + data.data.error)
                    }

                    caller.message("[#00ff00]Successfully linked.")
                    caller.audioLinked = true
                    caller.audioSessionId = data.data.sessionId

                    if (positional) {
                        process.send({
                            type: "audio",
                            data: {
                                type: "position",
                                sessionId: caller.audioSessionId,
                                pos: [caller.position.x, caller.position.y, caller.position.z],
                                rot: caller.rotation.z
                            }
                        })
                        caller.on("moved", (newPos, newRot) => {
                            process.send({
                                type: "audio",
                                data: {
                                    type: "position",
                                    sessionId: caller.audioSessionId,
                                    pos: [newPos.x, newPos.y, newPos.z],
                                    rot: newRot,
                                }
                            })
                        })
                    }

                    caller.newSound = (sound) => {
                        return new Promise((resolve, reject) => {
                            let reqId = crypto.randomBytes(16).toString("hex")
                            process.send({
                                type: "audio",
                                data: {
                                    type: "newSound",
                                    sound,
                                    sessions: [caller.audioSessionId],
                                    reqId,
                                }
                            })

                            let handler = (data) => {
                                if (data.type == "audio" && data.data.reqId == reqId) {
                                    process.removeListener("message", handler)
                                    if(data.data.error) {
                                        return reject(new Error(data.data.error))
                                    }
                                    resolve()
                                }
                            }
                            process.on("message", handler)

                            setTimeout(() => {
                                if (!got) {
                                    process.removeListener("message", handler)
                                    reject(new Error("newSound timed out."))
                                }
                            }, 10000);
                        })
                    }

                    Promise.all(Object.values(Game.sounds).map(sound => caller.newSound(sound))).then(() => {
                        caller.emit("audioReady")
                    })

                    caller.emit("linked")

                    let checkInt = setInterval(() => {
                        let reqId = crypto.randomBytes(16).toString("hex")
                        process.send({
                            type: "audio",
                            data: {
                                type: "check",
                                sessionId: caller.audioSessionId,
                                reqId,
                            }
                        })

                        let handler = (data) => {
                            if (data.type == "audio" && data.data.reqId == reqId) {
                                process.removeListener("message", handler)
                                if (data.data.error) {
                                    caller.message("[#ff0000]" + data.data.error)
                                    caller.audioLinked = false
                                    caller.audioSessionId = null
                                    caller.emit("unlinked")
                                    clearInterval(checkInt)
                                }
                            }
                        }

                        process.on("message", handler)
                    }, 1000)
                }
            }
            process.on("message", handler)

            setTimeout(() => {
                if (!got) {
                    process.removeListener("message", handler)
                    caller.message("[#ff0000]Linking timed out.")
                }
            }, 10000);
        })

        Game.on("playerLeave", player => {
            if (player.audioLinked) {
                process.send({
                    type: "audio",
                    data: {
                        type: "left",
                        sessionId: player.audioSessionId,
                    }
                })
            }   
        })

        Game.on("playerJoin", player => {
            if(Game.sounds.length > 0 && !player.audioLinked) {
                player.message(`[#90fc03]This game has sounds enabled! Go to ${process.env.URL}/sound to link.`)
            }
            setInterval(() => {
                if(Game.sounds.length > 0 && !player.audioLinked) {
                    player.message(`[#90fc03]This game has sounds enabled! Go to ${process.env.URL}/sound to link.`)
                }
            }, 120000)
        })

        return class Sound {
            constructor(file) {
                this.id = crypto.randomBytes(16).toString("hex")
                this.file = file
                this.volume = 1
                this.speed = 1
                this.loop = false
                this.position = null
                this.finalized = false
                this.credit = ""
            }

            setVolume(volume) {
                if (this.finalized) return new Error("Cannot set volume after finalizing.")
                if (volume < 0 || volume > 1) return new Error("Volume must be between 0 and 1.")
                this.volume = volume
                return this
            }

            setSpeed(speed) {
                if (this.finalized) return new Error("Cannot set speed after finalizing.")
                if (speed < 0.5 || speed > 4) return new Error("Speed must be between 0.5 and 4.")
                this.speed = speed
                return this
            }

            setLoop(loop) {
                if (this.finalized) return new Error("Cannot set loop after finalizing.")
                this.loop = !!loop
                return this
            }

            setPosition(pos) {
                if (this.finalized) return new Error("Cannot set position after finalizing.")
                if (["x", "y", "z"].some(key => !pos.hasOwnProperty(key))) return new Error("Position must have x, y, and z properties.")
                this.position = [pos.x, pos.y, pos.z]
                return this
            }

            setCredit(credit) {
                if (this.finalized) return new Error("Cannot set credit after finalizing.")
                this.credit = credit
                return this
            }

            setOrientation(orientation) {
                if (this.finalized) return new Error("Cannot set orientation after finalizing.")
                if (["x", "y", "z"].some(key => !orientation.hasOwnProperty(key))) return new Error("Orientation must have x, y, and z properties.")
                this.orientation = [orientation.x, orientation.y, orientation.z]
                return this
            }

            setPannerAttr(attr) {
                if (this.finalized) return new Error("Cannot set pannerAttr after finalizing.")
                if(typeof attr != "object") return new Error("PannerAttr must be an object.")
                if(Object.keys(attr).some(key => !["refDistance", "maxDistance", "rolloffFactor", "coneInnerAngle", "coneOuterAngle", "coneOuterGain", "distanceModel", "panningModel"].includes(key))) return new Error("Unknown pannerAttr key. Must be one of refDistance, maxDistance, rolloffFactor, coneInnerAngle, coneOuterAngle, coneOuterGain, distanceModel, and panningModel.")
                this.pannerAttr = attr
                return this
            }

            finalize() {
                if (!this.finalized) {
                    return new Promise((resolve, reject) => {
                        this.finalized = true
                        Game.sounds.push(this)

                        if(!positional && this.position) {
                            positional = true
                            Game.players.filter(v => v.audioLinked).forEach(v => {
                                process.send({
                                    type: "audio",
                                    data: {
                                        type: "position",
                                        sessionId: v.audioSessionId,
                                        pos: [v.position.x, v.position.y, v.position.z],
                                        rot: v.rotation.z
                                    }
                                })
                            })
                            Game.players.filter(v => v.audioLinked).forEach(v => {
                                v.on("moved", (newPos, newRot) => {
                                    process.send({
                                        type: "audio",
                                        data: {
                                            type: "position",
                                            sessionId: caller.audioSessionId,
                                            pos: [newPos.x, newPos.y, newPos.z],
                                            rot: newRot,
                                        }
                                    })
                                })
                            })
                        }

                        let reqId = crypto.randomBytes(16).toString("hex")
                        process.send({
                            type: "audio",
                            data: {
                                type: "newSound",
                                sound: this,
                                sessions: Game.players.filter(v => v.audioLinked).map(v => v.audioSessionId),
                                reqId,
                            }
                        })

                        let got = false
                        let handler = (data) => {
                            if(data.type == "audio" && data.data.reqId == reqId) {
                                got = true
                                process.removeListener("message", handler)
                                resolve(this)
                            }
                        }

                        process.on("message", handler)

                        setTimeout(() => {
                            if (!got) {
                                process.removeListener("message", handler)
                                reject(new Error("finalize timed out."))
                            }
                        }, 10000);
                    })
                }
                return this
            }

            play(player) {
                if (!this.finalized) return new Error("Cannot play a sound before finalizing.")
                if (player.audioLinked) {
                    process.send({
                        type: "audio",
                        data: {
                            type: "play",
                            sessionId: player.audioSessionId,
                            sound: this.id,
                        }
                    })
                }
            }

            stop(player) {
                if (!this.finalized) return new Error("Cannot stop a sound before finalizing.")
                if (player.audioLinked) {
                    process.send({
                        type: "audio",
                        data: {
                            type: "stop",
                            sessionId: player.audioSessionId,
                            sound: this.id,
                        }
                    })
                }
            }

            playAll() {
                if (!this.finalized) return new Error("Cannot play a sound before finalizing.")
                Game.players.forEach(p => {
                    if (p.audioLinked) {
                        this.play(p)
                    }
                })
            }

            stopAll() {
                if (!this.finalized) return new Error("Cannot stop a sound before finalizing.")
                Game.players.forEach(p => {
                    if (p.audioLinked) {
                        this.stop(p)
                    }
                })
            }
        }
    },
}