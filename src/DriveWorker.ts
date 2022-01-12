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

  const file = await getRandomFile(allFiles);
  return downloadFileToBuffer(file, cacheCon);
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
          throw new Error("Drive API error.");
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
        fields: "nextPageToken,files(name,id,parents,size,mimeType)",
      },
      (err, res) => {
        if (err) {
          send_failure_message(JSON.stringify(err));
          throw new Error("Drive API error.");
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
  allFiles: drive_v3.Schema$File[]
): Promise<drive_v3.Schema$File> {
  return new Promise((resolve) => {
    let randNum = Random.Num(allFiles.length);
    const randomFile: drive_v3.Schema$File = allFiles[randNum];

    while (true) {
      if (!TwitterWorker.allowedTypesByType.includes(randomFile.mimeType!)) {
        // TODO: If decided to support video, below line
        // should take in consideration the filesize of the video.
        // With images it will be fine, as we already resize/compress them.

        /*|| parseInt(randomFile.size!) > TwitterWorker.allowedTypes[TwitterWorker.allowedTypesByType.indexOf(randomFile.mimeType!)].max*/
        randNum = Random.Num(allFiles.length);
        continue;
      } else {
        break;
      }
    }

    resolve(randomFile);
  });
}

export function downloadFileToBuffer(
  file: drive_v3.Schema$File,
  cacheCon: DetaT | null
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
          throw new Error("Drive API error.");
        }

        let buf: Uint8Array[] = [];
        data?.data.on("data", (chunk) => buf.push(chunk));
        data?.data.on("end", async () => {
          fileBuf.buffer = Buffer.concat(buf);

          // Resizing the image.
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

            if (cacheCon) {
              save_image(
                cacheCon,
                fileBuf.buffer,
                resizedBuffer,
                fileBuf.filename
              );
            }

            fileBuf.buffer = resizedBuffer;
            fileBuf.mimeType = "image/jpeg";
            fileBuf.size = resizedBuffer.byteLength;
            resolve(fileBuf);
          } catch (error) {
            send_failure_message(JSON.stringify(error));
            throw new Error(JSON.stringify(error));
          }
        });
      }
    );
  });
}
