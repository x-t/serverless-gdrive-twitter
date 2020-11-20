import { drive_v3, google } from "googleapis";
import * as TwitterWorker from "./TwitterWorker";
import * as Random from "./Random";
import { JWT } from "googleapis-common";
import { DiscordHookAuth, Messages, sendDiscord } from "./DiscordWorker";
import {_debug} from "./_debug";
import "./env";

interface DriveFileBuf {
  buffer: Buffer | undefined,
  filename: string,
  size: number,
  mimeType: string
}

let drive: drive_v3.Drive;
let discordAuth: DiscordHookAuth;

export function setDiscordAuth(auth: DiscordHookAuth) {
  discordAuth = auth;
}

export async function getRandomBuffer(folderName: string, auth_: JWT): Promise<DriveFileBuf> {
  drive = google.drive({version: "v3", auth: auth_});
  _debug.print("Authenticated to Google Drive");

  const x = await getCorrectFolder(folderName);
  const allFiles = await getFolderContents(x, [], "");
  const file = await getRandomFile(allFiles);
  return downloadFileToBuffer(file);
}

export function getCorrectFolder(folderName: string): Promise<drive_v3.Schema$File> {
  let correctFolder: drive_v3.Schema$File | undefined = undefined;

  return new Promise((resolve) => 
  drive.files.list({
    q: `name='${folderName}'`
  }, (err, res) => {
    if (err) {
      sendDiscord(discordAuth, Messages.fail(JSON.stringify(err)));
      throw new Error("Drive API error.");
    } else {
      const files = res?.data.files!;
      if (files.length) {
        files.map(file => {
          if (file.mimeType === "application/vnd.google-apps.folder") {
            correctFolder = file;
          }
        });

        if (!correctFolder) {
          throw new Error("There was an error trying to find the folder.");
        }
        
        _debug.print("Got correct folder (scope:getCorrectFolder)")
        resolve(correctFolder);
      } else {
        sendDiscord(discordAuth, Messages.fail("Drive API: No files found. (scope:getCorrectFolder)"));
        throw new Error("No files found.");
      }
    }
  }));
}

export function getFolderContents(correctFolder: drive_v3.Schema$File, allFiles: drive_v3.Schema$File[], nextPageToken = ""): Promise<drive_v3.Schema$File[]> {
  return new Promise((resolve) => 
  drive.files.list({
    q: `'${correctFolder!.id}' in parents`,
    pageToken: nextPageToken,
    fields: "nextPageToken,files(name,id,parents,size,mimeType)"
  }, (err, res) => {
    if (err) {
      sendDiscord(discordAuth, Messages.fail(JSON.stringify(err)));
      throw new Error("Drive API error.");
    } else {
      const files = res?.data.files!;
      if (files.length) {
        allFiles = allFiles.concat(res?.data.files!);
        if (res?.data.nextPageToken) {
          getFolderContents(correctFolder, allFiles, res.data.nextPageToken).then(
            resAllFiles => resolve(resAllFiles)
          );
        } else {
          _debug.print("Got all files. (scope:getFolderContents)")
          resolve(allFiles);
        }
      } else {
        sendDiscord(discordAuth, Messages.fail("Drive API: No files found. (scope:getFolderContents)"));
        throw new Error("No files found.");
      }
    }
  }));
}

export function getRandomFile(allFiles: drive_v3.Schema$File[]): Promise<drive_v3.Schema$File> {
  return new Promise((resolve) => {
    let randNum = Random.Num(allFiles.length);
    const randomFile: drive_v3.Schema$File = allFiles[randNum];

    while (true) {
      if (!TwitterWorker.allowedTypesByType.includes(randomFile.mimeType!)
          || parseInt(randomFile.size!) > TwitterWorker.allowedTypes[TwitterWorker.allowedTypesByType.indexOf(randomFile.mimeType!)].max) {
        randNum = Random.Num(allFiles.length);
        continue;
      } else {
        _debug.print("Got a random file that meets criteria. (scope:getRandomFile)")
        break;
      }
    }

    resolve(randomFile);
  });
}

export function downloadFileToBuffer(file: drive_v3.Schema$File): Promise<DriveFileBuf> {
  return new Promise((resolve) => {
    let fileBuf: DriveFileBuf = {
      filename: file.name!,
      mimeType: file.mimeType!,
      size: parseInt(file.size!),
      buffer: undefined
    };

    drive.files.get({
      fileId: file.id!,
      alt: "media",
      supportsAllDrives: true
    }, {
      responseType: "stream"
    }, (err, data) => {
      if (err) {
        sendDiscord(discordAuth, Messages.fail(JSON.stringify(err)));
        throw new Error("Drive API error.");
      }

      let buf: Uint8Array[] = [];
      data?.data.on("data", chunk => buf.push(chunk));
      data?.data.on("end", () => {
        _debug.print("Got buffer for file. (scope:downloadFileToBuffer)")
        fileBuf.buffer = Buffer.concat(buf);
        resolve(fileBuf);
      });
    });

  });
}