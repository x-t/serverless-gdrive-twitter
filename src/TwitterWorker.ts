import Twitter from "twitter-api-v2";
import { send_failure_message, send_successful_message } from "./Notification";

const maxFilesizes = {
  gif: 15000000,
  image: 5000000,
  video: 512000000,
};

export const maxResolutions = {
  image: [1280, 1080],
};

export const maxLengthMillis = 140000;

export const allowedTypes = [
  { type: "image/png", ext: ["png"], max: maxFilesizes.image },
  { type: "image/jpeg", ext: ["jpeg", "jpg"], max: maxFilesizes.image },

  { type: "video/mp4", ext: ["mp4"], max: maxFilesizes.video },
  { type: "image/gif", ext: ["gif"], max: maxFilesizes.gif },
];
export const allowedTypesByType = allowedTypes.map((x) => x.type);

let client: Twitter;
let mediaSize: number;
let mediaType: string;
let tweetStatus: string;
let mediaData: Buffer;

export async function postMedia(
  client_: Twitter,
  mediaData_: Buffer,
  mediaSize_: number,
  mediaType_: string,
  fileName: string,
  status_: string
) {
  if (status_.length > 280) {
    send_failure_message("Tweet over 280 characters.");
    throw new Error("Tweet over 280 characters.");
  }

  if (!allowedTypesByType.includes(mediaType_)) {
    send_failure_message("Media type is not allowed.");
    throw new Error("Media type is not allowed.");
  }

  if (mediaSize_ > allowedTypes[allowedTypesByType.indexOf(mediaType_)].max) {
    send_failure_message("Media too large.");
    throw new Error("Media too large.");
  }

  client = client_;
  mediaData = mediaData_;
  tweetStatus = status_;
  mediaType = mediaType_;
  mediaSize = mediaSize_;

  const media_ids = await Promise.all([
    client.v1.uploadMedia(mediaData_, {
      type: (() => {
        switch (mediaType_) {
          case "image/png":
            return "png";
          case "image/jpeg":
            return "jpg";
          case "image/gif":
            return "gif";
          case "video/mp4":
            return "longmp4";
        }
      })(),
    }),
  ]);

  try {
    const tw = await client.v1.tweet(fileName, { media_ids: media_ids });
    send_successful_message(`Tweeted ${fileName} (${tw.id})`);
  } catch (e) {
    send_failure_message(JSON.stringify(e));
    throw e;
  }
}
