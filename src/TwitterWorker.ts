import Twitter from "twitter-api-v2";
import { send_successful_message } from "./Notification";

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
let mediaData: Buffer;

export async function postMedia(
  client_: Twitter,
  mediaData_: Buffer,
  mediaSize_: number,
  mediaType_: string,
  fileName: string
) {
  const status_ = makeStatusStringFromTemplate(fileName);
  if (status_.length > 280) {
    throw new Error("Tweet over 280 characters.");
  }

  if (!allowedTypesByType.includes(mediaType_)) {
    throw new Error("Media type is not allowed.");
  }

  if (mediaSize_ > allowedTypes[allowedTypesByType.indexOf(mediaType_)].max) {
    throw new Error("Media too large.");
  }

  client = client_;
  mediaData = mediaData_;
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
    const tw = await client.v1.tweet(status_, { media_ids: media_ids });
    send_successful_message(makeMessageFromTemplate(fileName, tw.id));
  } catch (e) {
    throw e;
  }
}

const makeStatusStringFromTemplate = (fileName: string) => {
  const template = process.env.TWITTER_TWEET_FORMAT || "{fileName}";
  const status = template.replace(/\{fileName\}/g, fileName);
  return status;
};

const makeMessageFromTemplate = (fileName: string, id: number) => {
  const template =
    process.env.SUCCESS_MESSAGE_FORMAT || "Tweeted {fileName} ({id})";
  const message = template.replace(/\{fileName\}/g, fileName);
  return message.replace(/\{id\}/g, id.toString());
};
