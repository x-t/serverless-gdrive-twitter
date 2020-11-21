import Twitter from "twitter";
import { DiscordHookAuth, Messages, sendDiscord } from "./DiscordWorker";
import {_debug} from "./_debug";


const maxFilesizes = {
  video: 15000000,
  image: 5000000
};

export const maxResolutions = {
  image: [1280, 1080]
}

export const allowedTypes = [
  {type: "image/png", ext: ["png"], max: maxFilesizes.image},
  {type: "image/jpeg", ext: ["jpeg", "jpg"], max: maxFilesizes.image},
//  Videos disabled due to new processing.
//  {type: "video/mp4", ext: ["mp4"], max: maxFilesizes.video},
//  {type: "image/gif", ext: ["gif"], max: maxFilesizes.video}
];
export const allowedTypesByType = allowedTypes.map(x => x.type);

let discordAuth: DiscordHookAuth;

let client: Twitter;
let mediaSize: number;
let mediaType: string;
let tweetStatus: string;
let mediaData: Buffer;
let fileName: string = "";

export function passFilename(fn: string) {
  fileName = fn;
}

export function setDiscordAuth(auth: DiscordHookAuth) {
  discordAuth = auth;
}

export function postMedia(client_: Twitter, mediaData_: Buffer, mediaSize_: number, mediaType_: string, status_: string) {
  if (status_.length > 280) {
    sendDiscord(discordAuth, Messages.fail("Tweet over 280 characters."));
    throw new Error("Tweet over 280 characters.");
  }

  if (!allowedTypesByType.includes(mediaType_)) {
    sendDiscord(discordAuth, Messages.fail("Media type is not allowed."));
    throw new Error("Media type is not allowed.")
  }

  if (mediaSize_ > allowedTypes[allowedTypesByType.indexOf(mediaType_)].max) {
    _debug.print("Media size: "+mediaSize_)
    sendDiscord(discordAuth, Messages.fail("Media too large."));
    throw new Error("Media too large.")
  }

  client = client_;
  mediaData = mediaData_;
  tweetStatus = status_;
  mediaType = mediaType_;
  mediaSize = mediaSize_;

  // initializeMediaUpload()
  //   .then(appendFileChunk)
  //   .then(finalizeUpload)
  //   .then(publishStatusUpdate)
  publishImage()
    .then(_ => sendDiscord(discordAuth, Messages.success(fileName)))
}

// function initializeMediaUpload(): Promise<string> {
//   return new Promise((resolve, reject) => {
//     client.post("media/upload", {
//       command: "INIT",
//       total_bytes: mediaSize,
//       media_type: mediaType
//     }, (error, data) => {
//       if (error) {
//         sendDiscord(discordAuth, Messages.fail(JSON.stringify(error)));
//         throw new Error(JSON.stringify(error));
//       } else {
//         _debug.print("Initializing media upload.")
//         resolve(data.media_id_string);
//       }
//     });
//   });
// }

// function appendFileChunk(mediaId: string): Promise<string> {
//   return new Promise((resolve, reject) => {
//     client.post("media/upload", {
//       command: "APPEND",
//       media_id: mediaId,
//       media: mediaData,
//       segment_index: 0
//     }, (error, data, response) => {
//       if (error) {
//         sendDiscord(discordAuth, Messages.fail(JSON.stringify(error)));
//         throw new Error(JSON.stringify(error));
//       } else {
//         _debug.print("Appending data chunk");
//         resolve(mediaId);
//       }
//     });
//   });
// }

// function finalizeUpload(mediaId: string): Promise<string> {
//   return new Promise((resolve, reject) => {
//     client.post("media/upload", {
//       command: "FINALIZE",
//       media_id: mediaId
//     }, (error, data, response) => {
//       if (error) {
//         sendDiscord(discordAuth, Messages.fail(JSON.stringify(error)));
//         console.log(error);
//         throw new Error(JSON.stringify(error));
//       } else {
//         _debug.print("Finalizing data upload")
//         resolve(mediaId);
//       }
//     });
//   });
// }

// function publishStatusUpdate(mediaId: string): Promise<Twitter.ResponseData> {
//   return new Promise((resolve, reject) => {
//     client.post("statuses/update", {
//       status: tweetStatus,
//       media_ids: mediaId
//     }, (error, data, response) => {
//       if (error) {
//         sendDiscord(discordAuth, Messages.fail(JSON.stringify(error)));
//         throw new Error(JSON.stringify(error));
//       } else {
//         _debug.print("Successfully posted full tweet");
//         resolve(data);
//       }
//     });
//   });
// }

function publishImage() {
  return new Promise((resolve) => {
    client.post("media/upload", {
      media: mediaData
    }, (err, data, response) => {
      if (err) {
        sendDiscord(discordAuth, Messages.fail(JSON.stringify(err)));
        console.log(err);
        throw new Error(JSON.stringify(err));
      } else {
        const status = {
          status: tweetStatus,
          media_ids: data.media_id_string
        }

        client.post("statuses/update", status, (err, tweet, res) => {
          if (err) {
            sendDiscord(discordAuth, Messages.fail(JSON.stringify(err)));
            console.log(err);
            throw new Error(JSON.stringify(err));
          } else {
            resolve(data);
          }
        })
      }
    })
  });
}
