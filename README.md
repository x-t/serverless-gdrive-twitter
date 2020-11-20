# serverless-gdrive-twitter
### Codename: 3 horsepower v8
Select and upload random images from a Google Drive folder to Twitter

## Building
```
$ npm i
$ npm run build
```

## Running
It doesn't really run anymore, because it's based on Azure triggers. However if you remove the Azure wrapper from [index.ts](src/index.ts) you can run it locally:
```
$ node dist/index.js
```

## Set up
### Google
**From https://github.com/terence410/ts-google-drive**

- Create a Google Cloud Project
- [Create Service Account](https://console.cloud.google.com/iam-admin/serviceaccounts/create)
    - Service account details > Choose any service account name > CREATE
    - Grant this service account access to project > CONTINUE
    - Grant users access to this service account > CREATE KEY
    - Save the key file into your project
- Enable Drive API
    -  [APIs and Services](https://console.cloud.google.com/apis/dashboard) > Enable APIS AND SERVICES 
    - Search Google Drive API > Enable
- To access shared folder 
    - Open the JSON key file, you will find an email xxx@xxx.iam.gserviceaccount.com. 
    - Go to your Google Drive Folder and shared the edit permission to the email address.
- Add your authentication in code from JSON
```
{
  [...]
  "private_key": "",
  "client_email": "",
  [...]
}
```
These are the only two values you'll need.

### Twitter
**From https://github.com/desmondmorris/node-twitter**

You will need valid Twitter developer credentials in the form of a set of consumer and access tokens/keys.  You can get these [here](https://apps.twitter.com/).  Do not forgot to adjust your permissions - most POST request require write permissions.

### Azure
- You will need an account for this (free does fine)
- Create a Function App from the dashboard
- To deploy to Azure, use the VSC extension, Cmd-Shift-P > Deploy to Function App. I cannot be bothered to set up automatic git deployments, lmao.

### Discord
Sends you Discord notifications via a webhook. Looks something like this:
![discord webhook](https://i.arxius.io/6c95835f.png)

- Add a webhook to your channel
- Make an username, copy the `/api` link into `prod.env` like in the example.

### prod.env
**This is the file that stores all the tokens, usernames and emails.**
```
DISCORD_USERNAME=""
DISCORD_HOOK_ENDPOINT=""
TWITTER_CONSUMER_KEY=""
TWITTER_CONSUMER_SECRET=""
TWITTER_ACCESS_TOKEN_KEY=""
TWITTER_ACCESS_TOKEN_SECRET=""
GOOGLE_EMAIL=""
GOOGLE_KEY=""
```
*Example*
```
DISCORD_USERNAME="anything here"
DISCORD_HOOK_ENDPOINT="/api/webhooks/number/thing"
TWITTER_CONSUMER_KEY="key"
TWITTER_CONSUMER_SECRET="key"
TWITTER_ACCESS_TOKEN_KEY="key"
TWITTER_ACCESS_TOKEN_SECRET="key"
GOOGLE_EMAIL="id-whatever-whenever@idyllic-script-000000.iam.gserviceaccount.com"
GOOGLE_KEY="-----BEGIN PRIVATE KEY-----\nVERYLONG\n-----END PRIVATE KEY-----\n"
```

## Architecture
![architecture](https://i.arxius.io/812f05c7.png)

You could possibly simplify this with a better Drive query, I don't know. Also, currently there's no big video support (only <15MB will be uploaded)

## Enabling debug
Change in [src/_debug.ts](src/_debug.ts):
```diff
export const _debug = {
-  enabled: false,
+  enabled: true,
```

## Different fire times
This is controlled by your Azure Function, via a NCRONTAB syntax. Changes in [TwitterTimer1/function.json](TwitterTimer1/function.json):
```diff
      "direction": "in",
-      "schedule": "0 */5 * * * *"
+      "schedule": "0 0 */1 * * *"
```
Exp.: removed to run every 5 minutes, added to run every 1 hour.
