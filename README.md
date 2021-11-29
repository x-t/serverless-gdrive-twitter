# serverless-gdrive-twitter

### Codename: 3 horsepower v8

[![Gitpod ready-to-code](https://img.shields.io/badge/Gitpod-ready--to--code-908a85?logo=gitpod)](https://gitpod.io/#https://github.com/x-t/serverless-gdrive-twitter)

Select and upload random images from a Google Drive folder to Twitter

## Building

```
$ npm install
$ npm run build
```

## Running

### On Azure

GitHub Actions workflow included, just bring your own publishing profile.

### On Azure (local)

You can use the Azure Functions CLI to test the function locally, or even deploy it manually. [See here](https://docs.microsoft.com/en-us/azure/azure-functions/create-first-function-cli-node?tabs=azure-cli%2Cbrowser).

### On Docker

It's a one-shot image, this means you'll have to bring in your own cron timer, most likely [provided by your own OS](https://www.cloudsavvyit.com/9033/how-to-use-cron-with-your-docker-containers/).

```
$ docker build -t 3horsepowerv8 .
$ docker run -t --rm --env-file prod.env 3horsepowerv8
```

This creates a ~250MB image, if a smaller size is needed, [docker-slim](https://dockersl.im) can be used.

```
$ brew install docker-slim
$ docker build -t 3horsepowerv8 .
$ docker-slim build --http-probe-off 3horsepowerv8
$ docker run -t --rm --env-file prod.env 3horsepowerv8.slim
```

Now you have a ~130MB container.

### On your own machine

```
$ node dist/entrypoint.js
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

### Discord

Sends you Discord notifications via a webhook. Looks something like this:
![discord webhook](https://i.arxius.io/6c95835f.png)

- Add a webhook to your channel
- Make an username, copy the `/api` link into `prod.env` like in the example.

### prod.env

**This is the file that stores all the tokens, usernames and emails.**

It can be replaced by just using the environment, such as the "Configuration" tab in Azure or [-env in Docker](https://docs.docker.com/engine/reference/commandline/run/#set-environment-variables--e---env---env-file).

```
DISCORD_USERNAME=""
DISCORD_HOOK_ENDPOINT=""
TWITTER_CONSUMER_KEY=""
TWITTER_CONSUMER_SECRET=""
TWITTER_ACCESS_TOKEN_KEY=""
TWITTER_ACCESS_TOKEN_SECRET=""
GOOGLE_EMAIL=""
GOOGLE_KEY=""
DRIVE_FOLDER=""
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
DRIVE_FOLDER="Cats"
```

## Architecture

![architecture](https://i.arxius.io/8b2deaae.png)

You could possibly simplify this with a better Drive query, I don't know. There is no video support as of now. [Sharp](https://github.com/lovell/sharp) is used to scale images.

## Different fire times

This is controlled by your Azure Function, via a NCRONTAB syntax. Changes in [TwitterTimer1/function.json](TwitterTimer1/function.json):

```diff
      "direction": "in",
-      "schedule": "0 */5 * * * *"
+      "schedule": "0 0 */1 * * *"
```

Example: removed to run every 5 minutes, added to run every 1 hour.
