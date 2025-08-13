import { interfaces } from "ask-sdk-model";
import { getCoverUrl } from "./ABSFunctions";
import {
  AudioTrack,
  BookChapter,
  PlaybackSession,
  PlaybackSessionExpanded,
} from "./ABSInterfaces";
import { ABS_API_KEY, SERVER_URL } from "./config";
import { BACKGROUND_URL } from "./globals";

export function sanitizeForSSML(input: string): string {
  if (input) {
    // Remove characters that are not allowed in XML/SSML
    // eslint-disable-next-line no-control-regex
    const disallowedRegex = /[\u0000-\u001F\u007F-\u009F]/g;
    let sanitizedInput = input.replace(disallowedRegex, "");

    // Escape special characters for XML
    const escapeXml = (str: string) => {
      return str.replace(/[<>&'"]/g, (char: string) => {
        switch (char) {
          case "<":
            return "&lt;";
          case ">":
            return "&gt;";
          case "&":
            return "&amp;";
          case "'":
            return "&apos;";
          case '"':
            return "&quot;";
          default:
            return char;
        }
      });
    };

    sanitizedInput = escapeXml(sanitizedInput);

    // Further sanitize any remaining invalid sequences
    // If needed, add more logic here to validate input thoroughly

    return sanitizedInput;
  } else {
    return "";
  }
}

/**
 * Retrieves the current book time from the handler inputs and persistent attributes
 * @param handlerInput The HandlerInput passed to the skill handler
 * @returns The number of seconds from the beginning of the book
 */
export function getCurrentBookTime(
  audioPlayer: interfaces.audioplayer.AudioPlayerState,
  userPlaySession: PlaybackSessionExpanded,
): number | null {
  const offsetInMilliseconds = audioPlayer.offsetInMilliseconds;
  const amazonToken = audioPlayer.token;

  if (offsetInMilliseconds === undefined || amazonToken === undefined) {
    console.log(
      "Something went wrong - Audioplayer missing offsetInMilliseconds or amazonToken",
    );
    return null;
  }

  const currentBookTime = calcBookTimeFromTrackAndOffset(
    userPlaySession,
    offsetInMilliseconds ?? 0,
    amazonToken,
  );

  return currentBookTime;
}

export type TrackAndOffsetInfo = { track: AudioTrack; offsetInSeconds: number };

export function getTrackAndOffsetInfoByBookTime(
  currentTimeInSeconds: number,
  userPlaySession: PlaybackSessionExpanded,
): TrackAndOffsetInfo {
  const audioTracks = userPlaySession.audioTracks;
  for (const track of audioTracks) {
    if (
      track.startOffset <= currentTimeInSeconds &&
      track.startOffset + track.duration > currentTimeInSeconds
    ) {
      return {
        track: track,
        offsetInSeconds: currentTimeInSeconds - track.startOffset,
      };
    }
  }

  console.log(
    "Something went wrong - current time doesn't correspond to a track. Default to first track.",
  );
  return { track: audioTracks[0], offsetInSeconds: 0 };
}

export function getCurrentChapterByBookTime(
  currentBookTime: number,
  playSession: PlaybackSessionExpanded,
): BookChapter {
  const chapters = playSession.chapters;
  for (let i = 0; i < chapters.length; i++) {
    if (
      currentBookTime >= chapters[i].start &&
      currentBookTime <= chapters[i].end
    ) {
      return chapters[i];
    }
  }
  return chapters[0]; // Default to first chapter if no chapter is found
}

/**
 * Calculates the current time of the book from a given track and offset
 * @param playSession The current play session, retrieved from the persistent attributes
 * @param currentTrackOffset Time since the beginning of the track in milliseconds
 * @param currentToken The amazon token - string representation of the track number
 * @returns the time of the book in seconds
 */
export function calcBookTimeFromTrackAndOffset(
  playSession: PlaybackSessionExpanded,
  currentTrackOffset: number,
  currentToken?: string,
): number {
  try {
    let currentTrack: AudioTrack | undefined;
    if (currentToken) {
      const currentIndex = Number.parseInt(currentToken);
      currentTrack = playSession.audioTracks.filter(
        (track: AudioTrack) => track.index == currentIndex,
      )[0];
    }

    if (!currentTrack) {
      return 0.0; // Return a default value if no track is found
    }

    const currentTime = currentTrack.startOffset + currentTrackOffset / 1000;

    // Ensure the result is a non-null float
    return typeof currentTime === "number" && !isNaN(currentTime)
      ? currentTime
      : 0.0;
  } catch (error) {
    console.error("Error calculating current book time:", error);
    return 0.0;
  }
}

export function getPlaybackMetadata(
  chapterTitle: string,
  userPlaySession: PlaybackSession,
) {
  return {
    title: chapterTitle,
    subtitle: userPlaySession.displayTitle,
    art: {
      sources: [
        {
          url: getCoverUrl(userPlaySession.libraryItemId),
          widthPixels: 512, // these seem to be necessary even though docs say it's not
          heightPixels: 512,
        },
      ],
    },
    backgroundImage: {
      sources: [
        {
          url: BACKGROUND_URL,
          widthPixels: 1600,
          heightPixels: 900,
        },
      ],
    },
  };
}

export function getPlayURL(
  userPlaySession: PlaybackSessionExpanded,
  trackIndexZeroBased: number,
): string {
  return (
    SERVER_URL +
    userPlaySession.audioTracks[trackIndexZeroBased].contentUrl +
    "?token=" +
    ABS_API_KEY
  );
}

export function getPlayUrl(audioTrack: AudioTrack): string {
  return SERVER_URL + audioTrack.contentUrl + "?token=" + ABS_API_KEY;
}
