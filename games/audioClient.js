// audioClient.js handles the audio library for the node-hill game
// It takes care of audio linking, syncing, and positional audio
const crypto = require("crypto")
const messageClient = require("./messageClient")
const channel = new messageClient.Channel(process, "audio")
let positional = false

module.exports = {
    init(Game) {
        Game.sounds = []

        Game.command("sound", (caller, args) => {
            if (!args) return caller.message("Usage: /sound <command>")
            if (caller.audioLinked) return caller.message("You are already linked to an audio session.")

            channel.send("link", args, (data) => {
                if(data == null)
                    return caller.message("[#ff0000]Linking timed out.")   
                    
                if (data.error) {
                    return caller.message("[#ff0000]" + data.error)
                }

                caller.message("[#00ff00]Successfully linked.")
                caller.audioLinked = true
                caller.audioSessionId = data.sessionId

                // Send position if needed
                if(positional) {
                    channel.send("position", {
                        sessionId: caller.audioSessionId,
                        pos: [caller.position.x, caller.position.y, caller.position.z],
                        rot: caller.rotation.z
                    })
                    caller.on("moved", (newPos, newRot) => {
                        // TODO: Remove moved listener when audio session is unlinked
                        channel.send("position", {
                            sessionId: caller.audioSessionId,
                            pos: [newPos.x, newPos.y, newPos.z],
                            rot: newRot,
                        })
                    })
                }

                // Inject newSound function
                caller.newSound = (sound) => {
                    return new Promise((resolve, reject) => {
                        channel.send("newSound", {
                            sound,
                            sessions: [caller.audioSessionId],
                        }, (data) => {
                            if(data.error)
                                return reject(new Error(data.error))
                            resolve()   
                        }, 10000)
                    })
                }

                // Sync all songs
                Promise.all(Object.values(Game.sounds).map(sound => caller.newSound(sound))).then(() => {
                    caller.emit("audioReady")
                })

                caller.emit("linked")

                let checkInt = setInterval(() => {
                    channel.send("check", caller.audioSessionId, (data) => {
                        if(data.error) {
                            caller.message("[#ff0000]" + data.error)
                            caller.audioLinked = false
                            caller.audioSessionId = null
                            caller.emit("unlinked")
                            clearInterval(checkInt)
                        }
                    })
                }, 1000)
            })
        })

        Game.on("playerLeave", player => {
            if (player.audioLinked) {
                channel.send("left", player.audioSessionId)
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
                                channel.send("position", {
                                    sessionId: v.audioSessionId,
                                    pos: [v.position.x, v.position.y, v.position.z],
                                    rot: v.rotation.z
                                })
                            })
                            Game.players.filter(v => v.audioLinked).forEach(v => {
                                v.on("moved", (newPos, newRot) => {
                                    channel.send("position", {
                                        sessionId: v.audioSessionId,
                                        pos: [newPos.x, newPos.y, newPos.z],
                                        rot: newRot.z
                                    })
                                })
                            })
                        }

                        channel.send("newSound", {
                            sound: this,
                            sessions: Game.players.filter(v => v.audioLinked).map(v => v.audioSessionId)
                        }, (d) => {
                            if(!d)
                                return reject(new Error("Failed to create sound."))
                            if(d.error)
                                return reject(new Error(d.error))
                            resolve(this)
                        })
                    })
                }
                return this
            }

            play(player) {
                if (!this.finalized) return new Error("Cannot play a sound before finalizing.")
                if (player.audioLinked) {
                    channel.send("play", {
                        sessionId: player.audioSessionId,
                        sound: this.id
                    })
                }
            }

            stop(player) {
                if (!this.finalized) return new Error("Cannot stop a sound before finalizing.")
                if (player.audioLinked) {
                    channel.send("stop", {
                        sessionId: player.audioSessionId,
                        sound: this.id
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