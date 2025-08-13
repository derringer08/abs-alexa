import * as Alexa from "ask-sdk-core";
import { Response } from "ask-sdk-model";
import { updateUserPlaySession } from "../ABSFunctions";
import { PlaybackAttributes } from "../globals";
import {
  calcBookTimeFromTrackAndOffset,
  getCurrentChapterByBookTime,
} from "../helpers";
import { buildResponseForAudioPlayer } from "./PlayAudioIntentHandler";

/**
 * Seeks to beginning of either this chapter or of the previous chapter
 */
export const NextIntentHandler = {
  canHandle(handlerInput: Alexa.HandlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "AMAZON.NextIntent"
    );
  },
  async handle(handlerInput: Alexa.HandlerInput): Promise<Response> {
    return GetNextIntentResponse(handlerInput, false);
  },
};

export async function GetNextIntentResponse(
  handlerInput: Alexa.HandlerInput,
  shouldSpeak: boolean,
) {
  const attributesHandler = handlerInput.attributesManager;
  const attributes: PlaybackAttributes =
    (await attributesHandler.getPersistentAttributes()) as PlaybackAttributes;

  const audioPlayer = handlerInput.requestEnvelope.context.AudioPlayer;
  const userPlaySession = attributes.userPlaySession;

  if (!userPlaySession || !audioPlayer) {
    const speakText = shouldSpeak
      ? "I'm not playing anything at the moment"
      : "";
    return handlerInput.responseBuilder.speak(speakText).getResponse();
  }

  const offsetInMilliseconds = audioPlayer.offsetInMilliseconds;
  const amazonToken = audioPlayer.token;

  if (offsetInMilliseconds === undefined || amazonToken === undefined) {
    console.log(
      "Something went wrong - Audioplayer missing offsetInMilliseconds or amazonToken",
    );
    return handlerInput.responseBuilder
      .speak("Something went wrong")
      .getResponse();
  }

  const currentBookTime = calcBookTimeFromTrackAndOffset(
    userPlaySession,
    offsetInMilliseconds ?? 0,
    amazonToken,
  );

  // default behavior: go to beginning of chapter.
  const currentChapter = getCurrentChapterByBookTime(
    currentBookTime,
    userPlaySession,
  );

  const chapters = userPlaySession.chapters;
  if (currentChapter.id === chapters.length - 1) {
    return handlerInput.responseBuilder
      .speak("This is the last chapter.")
      .getResponse();
  }

  const nextChapter = chapters[currentChapter.id + 1]; //Should we be skipping to the next track instead of the next chapter?
  const newBookTime = nextChapter.start;

  await updateUserPlaySession(userPlaySession, newBookTime);

  return buildResponseForAudioPlayer(handlerInput, undefined, shouldSpeak);
}
