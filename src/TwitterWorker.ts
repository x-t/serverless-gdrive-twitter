import Twitter from "twitter";
import { send_failure_message, send_successful_message } from "./Notification";

const maxFilesizes = {
  video: 15000000,
  image: 5000000,
};

export const maxResolutions = {
  image: [1280, 1080],
};

export const allowedTypes = [
  { type: "image/png", ext: ["png"], max: maxFilesizes.image },
  { type: "image/jpeg", ext: ["jpeg", "jpg"], max: maxFilesizes.image },
  //  {type: "video/mp4", ext: ["mp4"], max: maxFilesizes.video},
  //  {type: "image/gif", ext: ["gif"], max: maxFilesizes.video}
];
export const allowedTypesByType = allowedTypes.map((x) => x.type);

let client: Twitter;
let mediaSize: number;
let mediaType: string;
let tweetStatus: string;
let mediaData: Buffer;

export function postMedia(
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

  initUpload() // Declare that you wish to upload some media
    .then(appendUpload) // Send the data for the media
    .then(finalizeUpload)
    .then(publishStatusUpdate)
    .then(() => {
      send_successful_message(`Successfully uploaded ${fileName}`);
    })
    .catch((err) => {
      send_failure_message(JSON.stringify(err));
    });
}

/**
 * Step 1 of 3: Initialize a media upload
 * @return Promise resolving to String mediaId
 */
function initUpload() {
  return makePost("media/upload", {
    command: "INIT",
    total_bytes: mediaSize,
    media_type: mediaType,
  }).then((data: any) => data.media_id_string);
}

/**
 * Step 2 of 3: Append file chunk
 * @param String mediaId    Reference to media object being uploaded
 * @return Promise resolving to String mediaId (for chaining)
 */
function appendUpload(mediaId: string) {
  return makePost("media/upload", {
    command: "APPEND",
    media_id: mediaId,
    media: mediaData,
    segment_index: 0,
  }).then((data) => mediaId);
}

/**
 * Step 3 of 3: Finalize upload
 * @param String mediaId   Reference to media
 * @return Promise resolving to mediaId (for chaining)
 */
function finalizeUpload(mediaId: string) {
  return makePost("media/upload", {
    command: "FINALIZE",
    media_id: mediaId,
  }).then((data) => mediaId);
}

/**
 * (Utility function) Send a POST request to the Twitter API
 * @param String endpoint  e.g. 'statuses/upload'
 * @param Object params    Params object to send
 * @return Promise         Rejects if response is error
 */
function makePost(endpoint: string, params: any) {
  return new Promise((resolve, reject) => {
    client.post(endpoint, params, (error, data, response) => {
      if (error) {
        reject(error);
      } else {
        resolve(data);
      }
    });
  });
}

function publishStatusUpdate(mediaId: string): Promise<Twitter.ResponseData> {
  return new Promise((resolve, reject) => {
    client.post(
      "statuses/update",
      {
        status: tweetStatus,
        media_ids: mediaId,
      },
      (error, data, response) => {
        if (error) {
          send_failure_message(JSON.stringify(error));
          throw new Error(JSON.stringify(error));
        } else {
          resolve(data);
        }
      }
    );
  });
}
