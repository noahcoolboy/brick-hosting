export const state = () => ({
    gameName: "Game Name",
    status: "unknown",
    overview: {
        playerCount: 0,
        visits: 0,
        startTime: Date.now(),
    },
    console: {
        logs: [],
    },
    maps: {
        mapList: [],
        selected: null,
        error: ""
    },
    scripts: {
        scriptList: [],
        error: ""
    },
    sounds: {
        soundList: [],
        error: ""
    },
    
})

export const mutations = {
    set(state, data) {
        Object.assign(state, data)
    },
    update(state, { prop, value }) {
        prop.split('.').slice(0, -1).reduce((prev, cur) => prev[cur], state)[prop.split(".").slice(-1)[0]] = value
    }
}
