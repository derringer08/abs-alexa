import * as Alexa from "ask-sdk-core";
import { Response } from "ask-sdk-model";
import { updateUserPlaySession } from "../ABSFunctions";
import { PlaybackAttributes } from "../globals";
import { calcBookTimeFromTrackAndOffset } from "../helpers";

export const PauseAudioIntentHandler = {
  canHandle(handlerInput: Alexa.HandlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "AMAZON.PauseIntent"
    );
  },
  async handle(handlerInput: Alexa.HandlerInput) {
    return GetPauseResponse(handlerInput, true);
  },
};

/**
 * Pauses the audio and
 * @param handlerInput Handler input from Alexa
 * @param shouldSpeak True if Alexa should speak (if audio isn't playing)
 * @returns The Response object to pause the audio
 */
export async function GetPauseResponse(
  handlerInput: Alexa.HandlerInput,
  shouldSpeak: boolean,
): Promise<Response> {
  const attributes: PlaybackAttributes =
    (await handlerInput.attributesManager.getPersistentAttributes()) as PlaybackAttributes;

  const audioPlayer = handlerInput.requestEnvelope.context.AudioPlayer;

  if (!audioPlayer) {
    const speakText = shouldSpeak ? "I'm not playing anything right now." : "";
    return handlerInput.responseBuilder.speak(speakText).getResponse();
  }

  if (
    attributes.userPlaySession &&
    audioPlayer.offsetInMilliseconds != undefined
  ) {
    const offsetInMilliseconds = audioPlayer.offsetInMilliseconds;
    const amazonToken = audioPlayer.token;

    const currentBookTime = calcBookTimeFromTrackAndOffset(
      attributes.userPlaySession,
      offsetInMilliseconds,
      amazonToken,
    );

    await updateUserPlaySession(attributes.userPlaySession, currentBookTime);
    handlerInput.attributesManager.setPersistentAttributes(attributes);
    await handlerInput.attributesManager.savePersistentAttributes();
  }
  return handlerInput.responseBuilder
    .addAudioPlayerStopDirective()
    .getResponse();
}
