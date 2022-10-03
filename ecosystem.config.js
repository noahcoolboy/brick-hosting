module.exports = {
  apps: [
    {
      name: 'brick-hosting',
      script: './node_modules/nuxt/bin/nuxt.js',
      args: 'start',
      env: {
        "PORT": 80,
        "NODE_ENV": "production",
        "HOST": "0.0.0.0",
        "DB": "mongodb+srv://username:password@subdomain.mongodb.net/test",
        "URL": "http://brick-hosting.xyz",
        "OAUTH_CLIENT_ID": "15",
        "OAUTH_CLIENT_SECRET": "qsdQSRGdfb572fDFH"
      }
    }
  ]
}
