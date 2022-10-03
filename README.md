# brick-hosting

## Setup

Run the following command to install all the required libraries
```bash
npm i
```

Next, build the nuxt project with
```bash
npm run build
```

You will have to set a database up, you can get one for free at https://cloud.mongodb.com
Once you have your cluster, create 2 databases (via mongodbcompass)
One named brick-hosting, and one brick-hosting-testing
Each database should have 2 collections: "savedata" and "users"

Configure your environment variables in ecosystem.config.js
```
DB: The url of your mongodb database. You can set one up for free on their official website
URL: The domain of your website
OAUTH_CLIENT_ID: The oauth client id provided by brick hill
OAUTH_CLIENT_SECRET: The oauth client secret provided by brick hill
```

Run brick hosting
```bash
pm2 start ecosystem.config.js
```