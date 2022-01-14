# serverless-gdrive-twitter

### Codename: 3 horsepower v8

[![Gitpod ready-to-code](https://img.shields.io/badge/Gitpod-ready--to--code-908a85?logo=gitpod)](https://gitpod.io/#https://github.com/x-t/serverless-gdrive-twitter)

Select and upload random images from a Google Drive folder to Twitter

## Building

```
$ npm install
$ npm run build
```

## Running (from binary)

```
$ docker pull ghcr.io/x-t/serverless-gdrive-twitter:latest
$ docker run -t --rm --env-file prod.env ghcr.io/x-t/serverless-gdrive-twitter
```

## Running (from source)

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
$ node dist/index.js
```

## Set up

### Google (required)

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

### Twitter (required)

**From https://github.com/desmondmorris/node-twitter**

You will need valid Twitter developer credentials in the form of a set of consumer and access tokens/keys.  You can get these [here](https://apps.twitter.com/).  Do not forgot to adjust your permissions - most POST request require write permissions.

To set a custom status, use `TWITTER_TWEET_FORMAT`, default is `{fileName}`.

### Azure (optional)

- You will need an account for this (free does fine)
- Create a Function App from the dashboard

### Discord/Slack (optional)

Sends you Discord or Slack notifications via a webhook. Looks something like this:
![discord webhook](https://i.arxius.io/6c95835f.png)
![slack webhook](https://pomf2.lain.la/f/o8v5l25x.png)

- Add a webhook to your channel
- Make an username, copy the `/api` or `/services` link into `prod.env` like in the example.

To mess with the format of the message, use `SUCCESS_MESSAGE_FORMAT`, default is `Tweeted {fileName} - {id}`

### Console logging

Use `NOTIFICATION_WORKER=console` to replace the Discord & Slack webhook requests with plain old `console.log`

### Deta (as cache) (optional)

To reduce the amount of listing done by Google Drive, [Deta](https://deta.sh) can be used as a cache, where it holds the latest full-resolution image as well as the full listing of your Google Drive folder.

To opt in, provide your Deta project key as the `DETA_KEY` environment variable.

### Sentry (optional)

Monitor the failures of your bot using [Sentry](https://sentry.io). Use the `SENTRY_DSN` environment variable.

### prod.env

**This is the file that stores all the tokens, usernames and emails.**

It can be replaced by just using the environment, such as the "Configuration" tab in Azure or [-env in Docker](https://docs.docker.com/engine/reference/commandline/run/#set-environment-variables--e---env---env-file).

For a list of all options and examples, see [CONFIG.md](CONFIG.md)

## Architecture (outdated)

![architecture](https://i.arxius.io/8b2deaae.png)

You could possibly simplify this with a better Drive query, I don't know. [Sharp](https://github.com/lovell/sharp) is used to scale images.

Video support isn't battle-tested, but should work. Remember Twitter's limits: `<512MB && <140s`.

## Different fire times (Azure)

This is controlled by your Azure Function, via a NCRONTAB syntax. Changes in [TwitterTimer1/function.json](TwitterTimer1/function.json):

```diff
      "direction": "in",
-      "schedule": "0 */5 * * * *"
+      "schedule": "0 0 */1 * * *"
```

Example: removed to run every 5 minutes, added to run every 1 hour.
