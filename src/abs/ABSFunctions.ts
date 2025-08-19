import { HandlerInput } from "ask-sdk-core";
import { ABS_API_KEY, SERVER_URL, USER_AGENT } from "../utils/globals";
import {
  AuthorWithItems,
  DeviceInfoParameters,
  Library,
  LibraryFilterData,
  LibraryItem,
  LibraryItemMinified,
  LibrarySearchResults,
  PlaybackSession,
  PlaybackSessionExpanded,
  PlayLibraryItemParameters,
} from "./ABSInterfaces";

const baseheaders = {
  "Content-Type": "application/json",
  Authorization: "Bearer " + ABS_API_KEY,
  "User-Agent": USER_AGENT,
};


class ABSError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, ABSError.prototype);
  }
}

async function getRequestOutput(
  extension: string,
  method: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body?: any,
): Promise<unknown> {
  const res = await fetch(`${SERVER_URL}${extension}`, {
    method: method,
    headers: baseheaders,
    body: body ? JSON.stringify(body) : null,
  });

  if (res.ok) {
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await res.json();
    } else {
      return await res.text(); // fallback for plain text responses
    }
  } else {
    throw new ABSError(
      `ABS API Error: ${res.status} ${res.statusText}`,
      res.status,
    );
  }
}

export async function getLastPlayedLibraryItem(): Promise<
  LibraryItemMinified | undefined
> {
  try {
    const items = (await getRequestOutput(
      "/api/me/items-in-progress",
      "GET",
    )) as { libraryItems: LibraryItemMinified[] };
    return items.libraryItems.length > 0 ? items.libraryItems[0] : undefined;
  } catch (error) {
    console.error("Error during getLastPlayedLibraryItem: ", error);
    throw error;
  }
}

/**
 * Function to call the GET /api/items/:id endpoint
 * @param {string} id - The ID of the item to retrieve
 * @param {object} [options] - Optional query parameters
 * @param {string[]} [options.include] - Entities to include (e.g., ['progress', 'rssfeed', 'downloads', 'share'])
 * @param {number} [options.expanded] - Whether to expand the response (1 for true, undefined or 0 for false)
 * @param {string} [options.episode] - Episode ID if including user media progress
 * @returns {object} - The response body parsed as JSON
 */
export async function getItemById(
  id: string,
  options: {
    include?: string[];
    expanded?: boolean | undefined;
    episode?: string;
  },
): Promise<LibraryItem> {
  try {
    const baseExtension = "/api/items/";
    let url = `${baseExtension}${id}`;

    const queryParams: string[] = [];
    if (options.include) {
      queryParams.push(`include=${options.include.join(",")}`);
    }
    if (options.expanded) {
      queryParams.push("expanded=1");
    }
    if (options.episode) {
      queryParams.push(`episode=${options.episode}`);
    }

    if (queryParams.length > 0) {
      url += `?${queryParams.join("&")}`;
    }

    return (await getRequestOutput(url, "GET")) as LibraryItem;
  } catch (error) {
    console.error("Error during getItemById: ", error);
    throw error;
  }
}

export async function startUserPlaySession(
  itemID: string,
  handlerInput: HandlerInput,
): Promise<PlaybackSessionExpanded> {
  console.log("startUserPlaySession");
  const deviceInfo: DeviceInfoParameters = {
    deviceId: handlerInput.requestEnvelope.context.System.device?.deviceId,
    clientName: "Alexa Device",
    clientVersion: "1.0",
    manufacturer: "Amazon",
    model: "Echo",
    sdkVersion: 1,
  };
  const bodyParameters: PlayLibraryItemParameters = {
    deviceInfo: deviceInfo,
    forceDirectPlay: false,
    forceTranscode: false,
    supportedMimeTypes: [
      "audio/flac",
      "audio/mpeg",
      "audio/mp4",
      "audio/aac",
      "audio/x-aiff",
    ],
    mediaPlayer: "unknown",
  };

  try {
    return (await getRequestOutput(
      `/api/items/${itemID}/play`,
      "POST",
      bodyParameters,
    )) as PlaybackSessionExpanded;
  } catch (error) {
    let message: string | undefined;
    if (error instanceof ABSError) {
      if (error.statusCode === 404) {
        message = "- The library item does not have any audio tracks to play.";
      }
    }
    console.error("Error during startUserPlaySession: ", error, message);
    throw error;
  }
}

export async function updateUserPlaySession(
  playSession: PlaybackSession,
  currentBookTime: number,
) {
  if (!playSession) {
    console.log("updateUserPlaySession: Empty userPlaySession");
    return false;
  }

  const playSessionID = playSession.id;
  if (!playSessionID) {
    console.log("updateUserPlaySession: Invalid userPlaySessionID");
    return false;
  }
  // Ensure currentBookTime is a float and not null
  if (currentBookTime == null || isNaN(currentBookTime)) {
    console.log("updateUserPlaySession: Invalid currentBookTime");
    return false;
  }

  const currentTime = Date.now();

  const timeListened = (currentTime - playSession.updatedAt) / 1000;

  const body = {
    currentTime: currentBookTime,
    // duration:
    timeListened: timeListened,
    // !!! if I want ABS to save session, have to return timeListened
    // timeListened = number of seconds since last update
    // duration = length of currently playing item....
  };

  // update user play session
  console.log(
    "Update ABS play session for book: " + playSession.mediaMetadata.title,
  );

  try {
    await getRequestOutput(`/api/session/${playSessionID}/sync`, "POST", body);

    playSession.updatedAt = currentTime;
    playSession.currentTime = currentBookTime;

    return true;
  } catch (error) {
    let message: string | undefined;
    if (error instanceof ABSError) {
      switch (error.statusCode) {
        case 404:
          message =
            "- No listening session with the provided ID is open, or the session belongs to another user.";
          break;
        case 500:
          message = "- There was an error syncing the session.";
          break;
        default:
          break;
      }
    }
    console.error("Error during updateUserPlaySession: ", error, message);
    throw error;
  }
}

export function getCoverUrl(libraryItemId: string): string {
  // as of 11/28/24, retrieving cover does not require authentication
  return SERVER_URL + `/api/items/${libraryItemId}/cover`;
}

/**
 * Gets all the libraries from the ABS instance
 * @returns Array of libraries
 */
export async function getAllLibraries(): Promise<Library[]> {
  try {
    const data = (await getRequestOutput("/api/libraries", "GET")) as {
      libraries: Library[];
    };

    return data.libraries;
  } catch (error) {
    console.error("Error during getAllLibraries: ", error);
    throw error;
  }
}

/**
 * Gets the library filter data like authors, genres, and tags
 * @param libraryID ID of the library
 * @returns Library filter data
 */
export async function getLibraryFilterData(
  libraryID: string,
): Promise<LibraryFilterData> {
  try {
    return (await getRequestOutput(
      `/api/libraries/${libraryID}/filterdata`,
      "GET",
    )) as LibraryFilterData;
  } catch (error) {
    let message: string | undefined;
    if (error instanceof ABSError) {
      if (error.statusCode === 404) {
        message =
          "- The user cannot access the library, or no library with the provided ID exists.";
      }
    }
    console.error("Error during getLibraryFilterData: ", error, message);
    throw error;
  }
}

export async function getAuthor(authorID: string): Promise<AuthorWithItems> {
  try {
    return (await getRequestOutput(
      `/api/authors/${authorID}?include=items`,
      "GET",
    )) as AuthorWithItems;
  } catch (error) {
    let message: string | undefined;
    if (error instanceof ABSError) {
      if (error.statusCode === 404) {
        message = "- No author with provided ID exists.";
      }
    }
    console.error("Error during getAuthor: ", error, message);
    throw error;
  }
}

export async function searchFor(
  query: string,
  libraryID: string,
): Promise<LibrarySearchResults> {
  try {
    return (await getRequestOutput(
      `/api/libraries/${libraryID}/search?q=${query}`,
      "GET",
    )) as LibrarySearchResults;
  } catch (error) {
    let message: string | undefined;
    if (error instanceof ABSError) {
      switch (error.statusCode) {
        case 400:
          message = "- No query string.";
          break;
        case 404:
          message =
            "- The user cannot access the library, or no library with the provided ID exists.";
          break;
        default:
          break;
      }
    }
    console.error("Error during searchFor: ", error, message);
    throw error;
  }
}

export async function closeUserPlaySession(
  userPlaySession: PlaybackSession,
  currentBookTime: number,
): Promise<boolean> {
  try {
    if (!userPlaySession) {
      console.log("closeUserPlaySession: Empty userPlaySession");
      return false;
    }

    if (!userPlaySession.id) {
      console.log("closeUserPlaySession: Invalid userPlaySessionID");
      return false;
    }

    // Ensure currentBookTime is a float and not null
    if (currentBookTime == null || isNaN(currentBookTime)) {
      console.log("closeUserPlaySession: Invalid currentBookTime");
      return false;
    }

    const timeListened = (Date.now() - userPlaySession.updatedAt) / 1000;

    const body = {
      currentTime: currentBookTime,
      // duration:
      timeListened: timeListened,
      // !!! if I want ABS to save session, have to return timeListened
      // timeListened = time (in seconds) since last update
    };

    console.log(
      "Closing ABS play session for book: " +
        userPlaySession.mediaMetadata.title,
    );
    await getRequestOutput(
      `/api/session/${userPlaySession.id}/close`,
      "POST",
      body,
    );
    console.log(
      "closeUserPlaySession - Successfully synced and closed play session with ABS",
    );
    return true;
  } catch (error) {
    let message: string | undefined;
    if (error instanceof ABSError && error.statusCode === 404) {
      message =
        "- No listening session with the provided ID is open, or the session belongs to another user.";
    }
    console.error(
      "closeUserPlaySession - Error closing play session:",
      error,
      message,
    );
    return false; //Should I rethrow the error or just continue and deal with it not being closed in ABS?
  }
}
