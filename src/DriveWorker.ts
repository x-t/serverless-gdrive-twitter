import { drive_v3, drive as google_drive } from "@googleapis/drive";
import * as TwitterWorker from "./TwitterWorker";
import * as Random from "./Random";
import { JWT } from "googleapis-common";
import sharp from "sharp";
import { send_failure_message } from "./Notification";
import type DetaT from "deta/dist/types/deta";
import {
  CachedFile,
  cache_files,
  is_cache_too_old,
  read_cache_files,
  save_image,
  save_video,
} from "./CacheWorker";

type AnyFile = drive_v3.Schema$File[] | CachedFile[];

interface DriveFileBuf {
  buffer: Buffer | undefined;
  filename: string;
  size: number;
  mimeType: string;
}

let drive: drive_v3.Drive;

let maxWidth = TwitterWorker.maxResolutions.image[0];
let maxHeight = TwitterWorker.maxResolutions.image[1];

function resizeCalc(width: number, height: number): Array<number> {
  const aspectRatio = height / width;
  let newDim = [0, 0];
  if (width > maxWidth) {
    newDim[0] = maxWidth;
    newDim[1] = Math.round(maxWidth * aspectRatio);
  }

  if (height > maxHeight) {
    newDim[1] = maxHeight;
    newDim[0] = Math.round(maxHeight / aspectRatio);
  }

  if (newDim[0] > maxWidth || newDim[1] > maxHeight)
    return resizeCalc(newDim[0], newDim[1]);

  if (newDim[0] == 0 && newDim[1] == 0) newDim = [width, height];

  return newDim;
}

export async function getRandomBuffer(
  folderName: string,
  auth_: JWT,
  cacheCon: DetaT | null
): Promise<DriveFileBuf> {
  drive = google_drive({ version: "v3", auth: auth_ });

  const is_cache_old = cacheCon ? await is_cache_too_old(cacheCon) : true;

  let correct_folder: drive_v3.Schema$File, allFiles: AnyFile;
  if (is_cache_old) {
    correct_folder = await getCorrectFolder(folderName);
    allFiles = await getFolderContents(correct_folder, [], "");
  } else {
    allFiles = await read_cache_files(cacheCon!);
  }

  if (is_cache_old && cacheCon) {
    cache_files(cacheCon, allFiles);
  }

  const file = await getRandomFile(allFiles, cacheCon);
  return file;
}

export function getCorrectFolder(
  folderName: string
): Promise<drive_v3.Schema$File> {
  let correctFolder: drive_v3.Schema$File | undefined = undefined;

  return new Promise((resolve) =>
    drive.files.list(
      {
        q: `name='${folderName}'`,
      },
      (err, res) => {
        if (err) {
          send_failure_message(JSON.stringify(err));
          throw err;
        } else {
          const files = res?.data.files!;
          if (files.length) {
            files.map((file) => {
              if (file.mimeType === "application/vnd.google-apps.folder") {
                correctFolder = file;
              }
            });

            if (!correctFolder) {
              throw new Error("There was an error trying to find the folder.");
            }

            resolve(correctFolder);
          } else {
            send_failure_message(
              "Drive API: No files found. (scope:getCorrectFolder)"
            );
            throw new Error("No files found.");
          }
        }
      }
    )
  );
}

export function getFolderContents(
  correctFolder: drive_v3.Schema$File,
  allFiles: drive_v3.Schema$File[],
  nextPageToken = ""
): Promise<drive_v3.Schema$File[]> {
  return new Promise((resolve) =>
    drive.files.list(
      {
        q: `'${correctFolder!.id}' in parents`,
        pageToken: nextPageToken,
        fields:
          "nextPageToken,files(name,id,parents,size,mimeType,videoMediaMetadata)",
      },
      (err, res) => {
        if (err) {
          send_failure_message(JSON.stringify(err));
          throw err;
        } else {
          const files = res?.data.files!;
          if (files.length) {
            allFiles = allFiles.concat(res?.data.files!);
            if (res?.data.nextPageToken) {
              getFolderContents(
                correctFolder,
                allFiles,
                res.data.nextPageToken
              ).then((resAllFiles) => resolve(resAllFiles));
            } else {
              resolve(allFiles);
            }
          } else {
            send_failure_message(
              "Drive API: No files found. (scope:getFolderContents)"
            );
            throw new Error("No files found.");
          }
        }
      }
    )
  );
}

export function getRandomFile(
  allFiles: drive_v3.Schema$File[],
  cacheCon: DetaT | null
): Promise<DriveFileBuf> {
  return new Promise(async (resolve) => {
    let randNum = Random.Num(allFiles.length);

    while (true) {
      if (
        !TwitterWorker.allowedTypesByType.includes(allFiles[randNum].mimeType!)
      ) {
        randNum = Random.Num(allFiles.length);
        continue;
      } else {
        // Check if this file is an image
        if (
          allFiles[randNum].mimeType!.includes("image") &&
          allFiles[randNum].mimeType != "image/gif"
        ) {
          const imageBuffer = await downloadFileToBuffer(allFiles[randNum]);
          const resizedBuffer = await compressImage(imageBuffer);

          if (
            resizedBuffer.size! >
            TwitterWorker.allowedTypes[
              TwitterWorker.allowedTypesByType.indexOf(resizedBuffer.mimeType!)
            ].max
          ) {
            randNum = Random.Num(allFiles.length);
            continue;
          }

          if (cacheCon) {
            save_image(
              cacheCon,
              imageBuffer.buffer!,
              resizedBuffer.buffer!,
              imageBuffer.filename
            );
          }

          resolve(resizedBuffer);
          break;
        } else if (
          allFiles[randNum].mimeType! == "image/gif" ||
          allFiles[randNum].mimeType!.includes("video")
        ) {
          if (
            // GIF must be <15MB, MP4 must be <512MB
            parseInt(allFiles[randNum].size!) >
              TwitterWorker.allowedTypes[
                TwitterWorker.allowedTypesByType.indexOf(
                  allFiles[randNum].mimeType!
                )
              ].max ||
            // MP4 is not yet processed
            (allFiles[randNum].mimeType!.includes("video") &&
              !allFiles[randNum].videoMediaMetadata) ||
            // MP4 must be <140s
            (allFiles[randNum].mimeType!.includes("video") &&
              parseInt(allFiles[randNum].videoMediaMetadata!.durationMillis!) >
                TwitterWorker.maxLengthMillis)
          ) {
            randNum = Random.Num(allFiles.length);
            continue;
          }

          const videoBuffer = await downloadFileToBuffer(allFiles[randNum]);

          if (cacheCon) {
            save_video(
              cacheCon,
              videoBuffer.buffer!,
              videoBuffer.filename,
              videoBuffer.mimeType
            );
          }

          resolve(videoBuffer);
          break;
        }
      }
    }
  });
}

export function downloadFileToBuffer(
  file: drive_v3.Schema$File
): Promise<DriveFileBuf> {
  return new Promise((resolve) => {
    let fileBuf: DriveFileBuf = {
      filename: file.name!,
      mimeType: file.mimeType!,
      size: parseInt(file.size!),
      buffer: undefined,
    };

    drive.files.get(
      {
        fileId: file.id!,
        alt: "media",
        supportsAllDrives: true,
      },
      {
        responseType: "stream",
      },
      (err, data) => {
        if (err) {
          send_failure_message(JSON.stringify(err));
          throw err;
        }

        let buf: Uint8Array[] = [];
        data?.data.on("data", (chunk) => buf.push(chunk));
        data?.data.on("end", async () => {
          fileBuf.buffer = Buffer.concat(buf);

          resolve(fileBuf);
        });
      }
    );
  });
}

const compressImage = async (fileBuf: DriveFileBuf) => {
  let newBuf: DriveFileBuf = {
    filename: fileBuf.filename!,
    mimeType: fileBuf.mimeType!,
    size: 0,
    buffer: undefined,
  };

  try {
    let resizedBuffer: Buffer = await sharp(fileBuf.buffer)
      .metadata()
      .then((md) => {
        let [newX, newY] = resizeCalc(md.width!, md.height!);
        return sharp(fileBuf.buffer)
          .jpeg({ quality: 40 })
          .resize(newX, newY)
          .toBuffer();
      });

    newBuf.buffer = resizedBuffer;
    newBuf.mimeType = "image/jpeg";
    newBuf.size = resizedBuffer.byteLength;
    return newBuf;
  } catch (error) {
    send_failure_message(JSON.stringify(error));
    throw error;
  }
};
