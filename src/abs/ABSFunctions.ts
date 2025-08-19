import { HandlerInput } from "ask-sdk-core";
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
import { ABS_API_KEY, SERVER_URL } from "./config";

const baseheaders = {
  "Content-Type": "application/json",
  Authorization: "Bearer " + ABS_API_KEY,
  "User-Agent": "AlexaSkill",
};

export async function getLastPlayedLibraryItem(): Promise<
  LibraryItemMinified | undefined
> {
  try {
    const res = await fetch(`${SERVER_URL}/api/me/items-in-progress`, {
      method: "GET",
      headers: baseheaders,
    });

    if (res.ok) {
      const data = (await res.json()) as {
        libraryItems: LibraryItemMinified[];
      };

      return data.libraryItems.length > 0 ? data.libraryItems[0] : undefined;
    } else {
      throw new Error(
        `HTTP error in getLastPlayedLibraryItem. Status: ${res.status}`,
      );
    }
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
  const baseUrl = SERVER_URL + "/api/items/";
  let url = `${baseUrl}${id}`;

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

  const res = await fetch(url, {
    method: "GET",
    headers: baseheaders,
  });

  if (!res.ok || !res.body) {
    throw new Error(`Failed to fetch item: ${res.status} ${await res.json()}`);
  }

  const data: LibraryItem = (await res.json()) as LibraryItem;

  return data;
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

  const res = await fetch(SERVER_URL + `/api/items/${itemID}/play`, {
    method: "POST",
    headers: baseheaders,
    body: JSON.stringify(bodyParameters),
  });

  if (!res.ok) {
    throw new Error(`Failed to start play session. Status: ${res.status}`);
  }

  const data: PlaybackSessionExpanded =
    (await res.json()) as PlaybackSessionExpanded;

  return data;
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

  const body = JSON.stringify({
    currentTime: currentBookTime,
    // duration:
    timeListened: timeListened,
    // !!! if I want ABS to save session, have to return timeListened
    // timeListened = number of seconds since last update
    // duration = length of currently playing item....
  });

  // update user play session
  console.log(
    "Update ABS play session for book: " + playSession.mediaMetadata.title,
  );

  const res = await fetch(SERVER_URL + `/api/session/${playSessionID}/sync`, {
    method: "POST",
    headers: baseheaders,
    body: body,
  });

  switch (res.status) {
    case 200:
      console.log(
        "updateUserPlaySession - Successfully synced play session with ABS",
      );
      playSession.updatedAt = currentTime;
      playSession.currentTime = currentBookTime;
      break;
    case 404:
      console.log(
        "updateUserPlaySession - ABS: No listening session with the provided ID is open, or the session belongs to another user.",
      );
      throw new Error(
        `Failed to sync play session: ${res.status} ${res.statusText}`,
      );
    case 500:
      console.log(
        "updateUserPlaySession - ABS: Internal Server Error: There was an error syncing the session.",
      );
      throw new Error(
        `Failed to sync play session: ${res.status} ${res.statusText}`,
      );
  }

  return true;
}

export function getCoverUrl(libraryItemId: string): string {
  // as of 11/28/24, retrieving cover does not require authentication
  return SERVER_URL + `/api/items/${libraryItemId}/cover`;
}

export async function getAllLibraries(): Promise<Library[]> {
  const res = await fetch(`${SERVER_URL}/api/libraries`, {
    method: "GET",
    headers: baseheaders,
  });

  if (res.ok) {
    const data: { libraries: Library[] } = (await res.json()) as {
      libraries: Library[];
    };
    return data.libraries;
  } else {
    const error = `Error during getAllLibraries: ${res.status} ${res.statusText}`;
    console.error(error);
    throw new Error(error);
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
  const res = await fetch(
    `${SERVER_URL}/api/libraries/${libraryID}/filterdata`,
    {
      method: "GET",
      headers: baseheaders,
    },
  );

  if (!res.ok) {
    throw new Error(
      `Error during getLibraryFilterData: ${res.status} ${res.statusText}`,
    );
  }

  return (await res.json()) as LibraryFilterData;
}

export async function getAuthor(authorID: string): Promise<AuthorWithItems> {
  const res = await fetch(
    `${SERVER_URL}/api/authors/${authorID}?include=items`,
    {
      method: "GET",
      headers: baseheaders,
    },
  );

  if (!res.ok) {
    throw new Error(`Error during getAuthor: ${res.status} ${res.statusText}`);
  }

  return (await res.json()) as AuthorWithItems;
}

export async function searchFor(
  query: string,
  libraryID: string,
): Promise<LibrarySearchResults> {
  const res = await fetch(
    `${SERVER_URL}/api/libraries/${libraryID}/search?q=${query}`,
    {
      method: "GET",
      headers: baseheaders,
    },
  );

  if (!res.ok) {
    throw new Error(`Error during searchFor: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as LibrarySearchResults;
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

    const body = JSON.stringify({
      currentTime: currentBookTime,
      // duration:
      timeListened: timeListened,
      // !!! if I want ABS to save session, have to return timeListened
      // timeListened = time (in seconds) since last update
    });

    const apiUrl = SERVER_URL + `/api/session/${userPlaySession.id}/close`;
    console.log(
      "Closing ABS play session for book: " +
        userPlaySession.mediaMetadata.title,
    );
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: baseheaders,
      body: body,
    });

    if (res.ok) {
      console.log(
        "closeUserPlaySession - Successfully synced and closed play session with ABS",
      );
      return true;
    } else if (res.status == 404) {
      console.log(
        "closeUserPlaySession - ABS: No listening session with the provided ID is open, or the session belongs to another user.",
      );
      throw new Error(
        `closeUserPlaySession - Failed to close play session: ${res.status} ${res.statusText}`,
      );
    } else {
      throw new Error(
        `closeUserPlaySession - Failed to close play session: ${res.status} ${res.statusText}`,
      );
    }
  } catch (error) {
    console.error("closeUserPlaySession - Error closing play session:", error);
    return false;
  }
}
