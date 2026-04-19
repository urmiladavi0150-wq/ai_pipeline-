import { JobInput, NormaliseResult } from "@/types";
import youtubeDl from "youtube-dl-exec";

export async function normalizeInput(input: JobInput): Promise<NormaliseResult> {
  switch (input.type) {
    case "youtube":
      return resolveYouTube(input.input);
    case "video":
      return { downloadUrl: input.input, mediaType: "video" };
    case "audio":
      return { downloadUrl: input.input, mediaType: "audio" };
    default:
      throw new Error(`Unsupported input type: ${(input as any).type}`);
  }
}

async function resolveYouTube(url: string): Promise<NormaliseResult> {
  // Validate the YouTube URL is accessible
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
  const check = await fetch(oembedUrl);
  if (!check.ok) {
    throw new Error(`YouTube video not found or not embeddable: ${url}`);
  }

  try {
    const directUrl = (await youtubeDl(url, {
      format: "bestaudio",
      getUrl: true,
      noWarnings: true,
      quiet: true,
    })) as string;

    const urlString = directUrl?.toString().trim().split("\n")[0];
    if (!urlString) throw new Error("Failed to extract direct audio URL from YouTube");
    return { downloadUrl: urlString, mediaType: "audio" };
  } catch (error) {
    throw new Error(`YouTube audio extraction failed: ${(error as Error).message}`);
  }
}
