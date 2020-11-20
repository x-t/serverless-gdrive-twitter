# serverless-gdrive-twitter
### Codename: 3 horsepower v8
Select and upload random images from a Google Drive folder to Twitter

## Building
```
$ npm i
$ npm run build
```

## Running
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
To deploy to Azure, use the VSC extension, Cmd-Shift-P > Deploy to Function App. I cannot be bothered to set up automatic git deployments, lmao.

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
