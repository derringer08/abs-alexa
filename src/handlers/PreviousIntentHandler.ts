import * as Alexa from "ask-sdk-core";
import { Response } from "ask-sdk-model";
import { updateUserPlaySession } from "../abs/ABSFunctions";
import { PlaybackAttributes } from "../utils/globals";
import {
  calcBookTimeFromTrackAndOffset,
  getCurrentChapterByBookTime,
} from "../utils/helpers";
import { buildResponseForAudioPlayer } from "./PlayAudioIntentHandler";

/**
 * Seeks to beginning of either this chapter or of the previous chapter
 */
export const PreviousIntentHandler = {
  canHandle(handlerInput: Alexa.HandlerInput): boolean {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) ===
        "AMAZON.PreviousIntent"
    );
  },
  async handle(handlerInput: Alexa.HandlerInput): Promise<Response> {
    return getPreviousIntentResponse(handlerInput, true);
  },
};

export async function getPreviousIntentResponse(
  handlerInput: Alexa.HandlerInput,
  shouldSpeak: boolean,
): Promise<Response> {
  const attributesHandler = handlerInput.attributesManager;
  const attributes: PlaybackAttributes =
    (await attributesHandler.getPersistentAttributes()) as PlaybackAttributes;

  const audioPlayer = handlerInput.requestEnvelope.context.AudioPlayer;
  const userPlaySession = attributes.userPlaySession;

  if (!userPlaySession || !audioPlayer) {
    return handlerInput.responseBuilder
      .speak("I'm not playing anything at the moment")
      .getResponse();
  }

  const offsetInMilliseconds = audioPlayer.offsetInMilliseconds;
  const amazonToken = handlerInput.requestEnvelope.context.AudioPlayer?.token;

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
    offsetInMilliseconds,
    amazonToken,
  );

  // default behavior: go to beginning of chapter. If within 5 seconds of beginning, go to previous chapter
  let currentChapter = getCurrentChapterByBookTime(
    currentBookTime,
    userPlaySession,
  );

  let newBookTime: number;
  if (offsetInMilliseconds > currentChapter.start * 1000 + 5000) {
    // go to beginning of current chapter
    newBookTime = currentChapter.start;
  } else {
    // go to beginning of prior chapter
    const previousChapter = getCurrentChapterByBookTime(
      currentChapter.start - 1,
      userPlaySession,
    );
    currentChapter = previousChapter;
    newBookTime = previousChapter.start;
  }

  await updateUserPlaySession(userPlaySession, newBookTime);

  return buildResponseForAudioPlayer(handlerInput, undefined, shouldSpeak);
}
