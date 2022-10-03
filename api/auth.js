let oauth = {}

const crypto = require('crypto')
const undici = require('undici')

export default function(req, res, next) {
    const collection = req.db.collection("users")
    const url = new URL(req.url, process.env.URL)

    if(url.pathname == "/" && !req.cookies.token) {
        res.writeHead(302, {
            "Location": "/welcome"
        })
        return res.end()
    } else if(url.pathname == "/welcome") {
        if(req.cookies.token) {
            res.writeHead(302, {
                "Location": "/"
            })
            return res.end()
        }
        return next()
    }

    if(!req.cookies.token && url.pathname == "/oauth/callback") {
        if(url.searchParams.get("error") || !url.searchParams.get("code")) {
            res.writeHead(200, {'Content-Type': 'text/html'})
            return res.end("<h1>Error</h1><p>" + { "access_denied": "Access has been denied. Please authorize the oauth2 application. Click <a href=\"/\">here</a> to try again." }[url.searchParams.get("error")] || "Unknown Error" + "</p>")
        } else if(!url.searchParams.get("state") || !oauth[url.searchParams.get("state")]) {
            res.writeHead(200, {'Content-Type': 'text/html'})
            return res.end("<h1>Error</h1><p>Invalid state. Please <a href=\"/\">try again.</a></p>")
        } else {
            undici.request("https://www.brick-hill.com/oauth/token", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    code: url.searchParams.get("code"),
                    client_id: process.env.OAUTH_CLIENT_ID,
                    client_secret: process.env.OAUTH_CLIENT_SECRET,
                    grant_type: "authorization_code",
                    redirect_uri: process.env.URL + "/oauth/callback",
                    code_verifier: oauth[url.searchParams.get("state")].code_verifier
                })
            }).then(async function(response) {
                let data = await response.body.json()
                if(data.access_token) {
                    let userRes = await undici.request("https://api.brick-hill.com/v1/auth/currentUser", {
                        method: "GET",
                        headers: {
                            "Authorization": "Bearer " + data.access_token
                        }
                    })
                    let user = await userRes.body.json()
                    if(user.user) {
                        let dbUser = await collection.findOne({
                            userId: user.user.id
                        })
                        if(dbUser) {
                            res.writeHead(302, {
                                'location': "/",
                                'Set-Cookie': "token=" + dbUser.token + "; max-age=31536000; same-site=strict; path=/; HttpOnly",
                            })
                            return res.end()
                        } else {
                            let token = crypto.randomBytes(32).toString("hex")
                            await collection.insertOne({
                                userId: user.user.id,
                                token: token,
                                servers: []
                            })
                            res.writeHead(302, {
                                'location': "/",
                                'Set-Cookie': "token=" + token + "; max-age=31536000; same-site=strict; path=/; HttpOnly",
                            })
                            return res.end()
                        }
                    } else {
                        res.writeHead(200, {'Content-Type': 'text/html'})
                        return res.end("<h1>Error</h1>" + JSON.stringify(user))
                    }
                } else {
                    res.writeHead(200, {'Content-Type': 'text/html'})
                    return res.end("<h1>Error</h1><p>" + data.hint + "</p>")
                }
            })
            return
        }
    } else if(!req.cookies.token && url.pathname == "/login") {
        let code_challenge = Array(43 + Math.floor(Math.random() * 86)).fill(0).map(_ => "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~"[Math.floor(Math.random() * 66)]).join("")
        let code_verifier = code_challenge
        let state = crypto.randomBytes(16).toString('hex')

        oauth[state] = {
            code_challenge,
            code_verifier,
            state,
        }

        res.writeHead(302, {
            "location": `https://brick-hill.com/oauth/authorize?client_id=2&redirect_uri=${encodeURIComponent(url.origin + "/oauth/callback")}&response_type=code&code_challenge_method=plain&code_challenge=${encodeURIComponent(code_challenge)}&state=${state}`
        })
        return res.end()
    } else if(!req.cookies.token && !req.url.startsWith("/_loading/")) {
        res.writeHead(302, {
            "location": "/login"
        })
        return res.end()
    }

    next()
}