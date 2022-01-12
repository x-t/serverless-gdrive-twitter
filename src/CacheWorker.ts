import { drive_v3 } from "@googleapis/drive";
import { Deta } from "deta";
import type DetaT from "deta/dist/types/deta";
import { FetchResponse } from "deta/dist/types/types/base/response";
import sharp from "sharp";

/*
  The thing about Deta is that its database is a glorified
  REST-accessible JSON file, while it is free, it's also not very
  fast for bulk operations, like updating a several-thousand
  file listing cache.

  So, this section bunk, while reducing the API calls to Google
  Drive, it *will* eat up a lot of memory and CPU time. Beware
  of this if you have a not-so-liberal serverless environment.
*/

export interface CachedFile {
  filename: string;
  mimeType: string;
  size: string;
  id: string;
}

const env_config = {
  config_table: process.env.DETA_CONFIG_TABLE || "config",
  cache_table: process.env.DETA_CACHE_TABLE || "cache",
  last_run: process.env.DETA_KEY_LAST_RUN || "last_time_run",
  last_cached: process.env.DETA_KEY_LAST_CACHED || "last_time_drive_cached",
  last_filename: process.env.DETA_KEY_LAST_FILENAME || "last_filename",
  image_drive: process.env.DETA_IMAGE_DRIVE || "cache_drive",
};

export const deta_connect = () => {
  if (!process.env.DETA_KEY) {
    return null;
  }

  return Deta(process.env.DETA_KEY);
};

const read_config = async (con: DetaT): Promise<any> => {
  const db = con.Base(env_config.config_table);
  const last_time_run = await db.get(env_config.last_run);
  const last_time_cached = await db.get(env_config.last_cached);
  return { db, last_time_run, last_time_cached };
};

export const is_cache_too_old = async (con: DetaT): Promise<boolean> => {
  const { last_time_cached } = await read_config(con);
  if (!last_time_cached) return true;
  return Date.parse(last_time_cached) < Date.now() - 1000 * 60 * 60 * 24 * 7;
};

export const save_image = async (
  con: DetaT,
  image: Buffer,
  resized: Buffer,
  filename: string
) => {
  const drive = con.Drive(env_config.image_drive);
  const db = con.Base(env_config.config_table);
  const data = await sharp(image).webp({ lossless: true }).toBuffer();
  await drive.put("latest.webp", { data: data, contentType: "image/webp" });
  await drive.put("resized.jpg", { data: resized, contentType: "image/jpg" });
  await db.put(filename, env_config.last_filename);
  await db.put(new Date().toISOString(), env_config.last_run);
};

export const read_cache_files = async (con: DetaT): Promise<CachedFile[]> => {
  const rename_key_to_id = (res: FetchResponse) => {
    res.items.forEach((_, idx) => {
      res.items[idx].id = res.items[idx].key;
      res.items[idx];
      delete res.items[idx].key;
    });
    return res;
  };

  const db = con.Base(env_config.cache_table);
  let res = await db.fetch();
  let allItems = rename_key_to_id(res).items as unknown as CachedFile[];

  // continue fetching until last is not seen
  while (res.last) {
    res = await db.fetch({}, { last: res.last });

    allItems = allItems.concat(
      rename_key_to_id(res).items as unknown as CachedFile[]
    );
  }

  return allItems;
};

export const cache_files = async (
  con: DetaT,
  files: drive_v3.Schema$File[]
) => {
  const db = con.Base(env_config.cache_table);

  // There isn't a particularly "fast" way to do this,
  // but downloading the list first will allow only the updates
  // to be cached. Otherwise, regular put requests will take
  // forever.

  const allFiles = await read_cache_files(con);
  const newFiles = files.filter(
    (file) => !allFiles.find((f) => f.id === file.id)
  );
  const deletedFiles = allFiles.filter(
    (file) => !files.find((f) => f.id === file.id)
  );

  for (const file of newFiles) {
    await db.put(
      {
        name: file.name,
        size: file.size,
        mimeType: file.mimeType,
      },
      file.id!
    );
  }

  for (const file of deletedFiles) {
    await db.delete(file.id!);
  }

  const db_config = con.Base(env_config.config_table);
  await db_config.put(new Date().toISOString(), env_config.last_cached);
};
