import * as Alexa from "ask-sdk-core";
import { Response } from "ask-sdk-model";
import {
  getItemById,
  getLastPlayedLibraryItem,
  startUserPlaySession,
  updateUserPlaySession,
} from "../ABSFunctions";
import { LibraryItem, PlaybackSessionExpanded } from "../ABSInterfaces";
import { PlaybackAttributes } from "../globals";
import {
  getCurrentChapterByBookTime,
  getPlaybackMetadata,
  getPlayURL,
  getTrackAndOffsetInfoByBookTime,
  sanitizeForSSML,
} from "../helpers";

export const PlayAudioIntentHandler: Alexa.RequestHandler = {
  canHandle(handlerInput: Alexa.HandlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      (Alexa.getIntentName(handlerInput.requestEnvelope) ===
        "PlayAudioIntent" ||
        Alexa.getIntentName(handlerInput.requestEnvelope) ===
          "AMAZON.ResumeIntent" ||
        Alexa.getIntentName(handlerInput.requestEnvelope) === "PlayLastIntent")
    );
  },
  async handle(handlerInput: Alexa.HandlerInput): Promise<Response> {
    try {
      //let timeStart = new Date(); //let timeStart = timestamps.PlayAudioIntentHandlerStartTime = new Date();

      return buildResponseForAudioPlayer(handlerInput, undefined, true);
    } catch (error) {
      console.log(error);
      return handlerInput.responseBuilder
        .speak(sanitizeForSSML("Something went wrong"))
        .getResponse();
    }
  },
};

export async function buildResponseForAudioPlayer(
  handlerInput: Alexa.HandlerInput,
  itemIdToPlay?: string,
  shouldSpeak: boolean = false,
) {
  const attributes: PlaybackAttributes =
    (await handlerInput.attributesManager.getPersistentAttributes()) as PlaybackAttributes;
  const existingSession = attributes.userPlaySession;

  if (!existingSession && !itemIdToPlay) {
    // if no session already in progress, find last played audiobook
    const lastPlayedLibraryItem = await getLastPlayedLibraryItem();
    itemIdToPlay = lastPlayedLibraryItem?.id;
  }

  //We need either an existing play session or we need to know what item to play. Otherwise prompt the user
  if (!existingSession && !itemIdToPlay) {
    const speakOutput = sanitizeForSSML("What would you like to play?");

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  }

  let expandedItem: LibraryItem;
  let userPlaySession: PlaybackSessionExpanded;
  let currentTime: number;
  if (!existingSession) {
    [expandedItem, userPlaySession] = await Promise.all([
      getItemById(itemIdToPlay!, { include: ["progress"], expanded: true }),
      startUserPlaySession(itemIdToPlay!, handlerInput),
    ]);

    currentTime = expandedItem.userMediaProgress?.currentTime ?? 0.0;
    if (currentTime > userPlaySession.duration) {
      // validation
      currentTime = 0.0; // start at beginning
    }
  } else {
    userPlaySession = existingSession;
    currentTime = existingSession.currentTime;
  }

  delete userPlaySession.libraryItem; // this property is very large and not useful

  attributes.userPlaySession = userPlaySession;

  const trackAndOffsetInfo = getTrackAndOffsetInfoByBookTime(
    currentTime,
    userPlaySession,
  );
  const trackToPlay = trackAndOffsetInfo.track;
  const amazonToken = trackToPlay.index.toString(); // should start at 1

  const offsetInMilliseconds = trackAndOffsetInfo.offsetInSeconds * 1000;

  if (userPlaySession.audioTracks[trackToPlay.index]) {
    // if there is another track that exists after the current track
    attributes.nextStreamEnqueued = true;
  } else {
    attributes.nextStreamEnqueued = false;
  }

  const chapterTitle = getCurrentChapterByBookTime(
    currentTime,
    userPlaySession,
  )?.title;
  const author = userPlaySession.displayAuthor;
  const bookTitle = userPlaySession.displayTitle;
  const playUrl = getPlayURL(trackToPlay);

  await updateUserPlaySession(userPlaySession, currentTime);

  handlerInput.attributesManager.setPersistentAttributes(attributes);
  await handlerInput.attributesManager.savePersistentAttributes();

  let speakOutput = "";
  if (shouldSpeak) {
    if (currentTime > 0) {
      speakOutput = `Resuming ${bookTitle} by ${author}`;
    } else {
      speakOutput = "Playing " + bookTitle + " by " + author;
    }
  }
  console.log("Playing: " + playUrl);

  return handlerInput.responseBuilder
    .speak(sanitizeForSSML(speakOutput))
    .addAudioPlayerPlayDirective(
      "REPLACE_ALL",
      playUrl,
      amazonToken, // for amazon's token system
      offsetInMilliseconds, // offset in ms
      undefined, // expected previous token (don't include if playBehavior is REPLACE)
      getPlaybackMetadata(chapterTitle, userPlaySession),
    )
    .getResponse();
}
