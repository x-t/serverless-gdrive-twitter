# 3 horsepower v8 configuration

## Required

### TWITTER_CONSUMER_KEY

Twitter's consumer key, see [README.md](README.md) on how to find it.

Example: `xxxxxxxxxxxxxxxxxxxxxxxx`

### TWITTER_CONSUMER_SECRET

Twitter's consumer secret, see [README.md](README.md) on how to find it.

Example: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### TWITTER_ACCESS_TOKEN_KEY

Twitter's access token key, see [README.md](README.md) on how to find it.

Example: `0000000000000000000-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### TWITTER_ACCESS_TOKEN_SECRET

Twitter's access token secret, see [README.md](README.md) on how to find it.

Example: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### GOOGLE_EMAIL

Google Service Account JWT e-mail address, see [README.md](README.md) on how to find it.

Example: `id-example@example-000000.iam.gserviceaccount.com`

### GOOGLE_KEY

Google Service Account JWT private key, see [README.md](README.md) on how to find it.

Example: `-----BEGIN PRIVATE KEY-----\nxxxxxxxxxxxxxxxx\n-----END PRIVATE KEY-----\n` (⚠️ Warning: This is a very long key)

### DRIVE_FOLDER

The name of the folder where files are located at.

Example: `Cats`

## Optional

### NOTIFICATION_WORKER

* Default: `console`
* Options: `discord` | `slack` | `console`
* `discord` requires `DISCORD_HOOK_ENDPOINT`
* `slack` requires `SLACK_HOOK_ENDPOINT`

Specifies what notification worker should be used for success/failure messages.

Versions f578280 and below had the default as `discord`, and if `DISCORD_HOOK_ENDPOINT` wasn't set, all messages would've been voided. To avoid this, use `NOTIFICATION_WORKER=console`.

### DISCORD_USERNAME

* Requires: `NOTIFICATION_WORKER=discord`

Specifies the username for Discord webhook, if it isn't specified, the default one specified in Discord channel settings is used.

### DISCORD_HOOK_ENDPOINT

* Requires: `NOTIFICATION_WORKER=discord`
* Required by `NOTIFICATION_WORKER=discord`

Specifies the webhook URI path.

Example: `/api/webhooks/000000000000000000/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### SLACK_HOOK_ENDPOINT

* Requires: `NOTIFICATION_WORKER=slack`
* Required by `NOTIFICATION_WORKER=slack`

Specifies the webhook URI path.

Example: `/services/XXXXXXXXX/XXXXXXXXXXX/xxxxxxxxxxxxxxxxxxxxxxxx`

### SLACK_USERNAME

* Requires: `NOTIFICATION_WORKER=slack`

Specifies the username for Slack webhook, if it isn't specified, the default one specified in Slack incoming-webhook settings is used.

### DETA_KEY

Deta Project key. If specified, it will cache the file listing from Google Drive inside Deta Base, which will speed up the process of fetching next time, as well as minimise the amount of Google Drive API requests. The cache is updated every 7 days.

It will also cache the last uploaded image/video as `latest.(webp|mp4|gif)` and `resized.jpg` (if it was an image, the resized/compressed Twitter upload) to Deta Drive, for use in other projects.

Before considering using this, consider the comment left in [src/CacheWorker.ts](ts/CacheWorker.ts):

```js
/*
  The thing about Deta is that its database is a glorified
  REST-accessible JSON file, while it is free, it's also not very
  fast for bulk operations, like updating a several-thousand
  file listing cache.

  So, this section bunk, while reducing the API calls to Google
  Drive, it *will* eat up a lot of memory and CPU time. Beware
  of this if you have a not-so-liberal serverless environment.
*/
```

Example: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### SENTRY_DSN

Sentry is a service that uploads and catalogs all errors that happen in the bot. DSN is the provided link to upload all logs to, when you create a new project.

Example: `https://xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx@xxxxxxx.ingest.sentry.io/0000000`

### DETA_CONFIG_TABLE

* Default: `config`

Deta Base table that holds values `DETA_KEY_LAST_RUN` - the timestamp of last upload, `DETA_KEY_LAST_CACHED` - the timestamp of last Google Drive cache (should be every 7 days), `DETA_KEY_LAST_FOLDER_USED` - the name of last run's `DRIVE_FOLDER`, `DETA_KEY_LAST_FILENAME` - the filename of last upload.

If `DRIVE_FOLDER` isn't `last_folder_used`, a forced cache rebuild is initiated.

### DETA_CACHE_TABLE

* Default: `cache`

Deta Base table that holds the Google Drive listing cache.

### DETA_KEY_LAST_RUN

* Default: `last_time_run`

### DETA_KEY_LAST_CACHED

* Default: `last_time_drive_cached`

### DETA_KEY_LAST_FILENAME

* Default: `last_filename`

### DETA_KEY_LAST_FOLDER_USED

* Default: `last_folder_used`

### DETA_IMAGE_DRIVE

* Default: `cache_drive`

The Deta Drive name which will hold the last uploaded image/video.

### TWITTER_TWEET_FORMAT

* Default: `{fileName}`
* Format values: `fileName` - uploaded file's filename

The status format string, seen on the uploaded Twitter post.

### SUCCESS_MESSAGE_FORMAT

* Default: `Tweeted {fileName} ({id})`
* Format values: `fileName` - uploaded file's filename, `id` - the ID of the posted tweet

The success message format, seen on `NOTIFICATION_WORKER`.

## Examples

The most minimal configuration would be:

```
GOOGLE_EMAIL=
GOOGLE_KEY=
DRIVE_FOLDER=
TWITTER_ACCESS_TOKEN_KEY=
TWITTER_ACCESS_TOKEN_SECRET=
TWITTER_CONSUMER_KEY=
TWITTER_CONSUMER_SECRET=
```

All this does is upload random files from Drive to Twitter, and outputs the success/failure to the terminal, that's it.

To add Discord notifications:

```
<minimal>
NOTIFICATION_WORKER=discord
DISCORD_HOOK_ENDPOINT=
```

Or for Slack:

```
<minimal>
NOTIFICATION_WORKER=slack
SLACK_HOOK_ENDPOINT=
```

The minimal setup for Deta caching is just:

```
<minimal>
DETA_KEY=
```