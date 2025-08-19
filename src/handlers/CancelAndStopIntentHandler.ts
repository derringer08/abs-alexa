import * as Alexa from "ask-sdk-core";
import { Response } from "ask-sdk-model";
import { closeUserPlaySession } from "../abs/ABSFunctions";
import { PlaybackAttributes } from "../utils/globals";
import {
  calcBookTimeFromTrackAndOffset,
  sanitizeForSSML,
} from "../utils/helpers";

/**
 * Handles "Cancel" and "Stop", but notably not "Exit" or "Quit", which are handled by SessionEndedHandler
 * This should end the skill completely
 */
export const CancelAndStopIntentHandler = {
  canHandle(handlerInput: Alexa.HandlerInput): boolean {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      (Alexa.getIntentName(handlerInput.requestEnvelope) ===
        "AMAZON.CancelIntent" ||
        Alexa.getIntentName(handlerInput.requestEnvelope) ===
          "AMAZON.StopIntent")
    );
  },
  async handle(handlerInput: Alexa.HandlerInput): Promise<Response> {
    const speakOutput = "Goodbye!";

    const sessionAttributes =
      (await handlerInput.attributesManager.getPersistentAttributes()) as PlaybackAttributes;
    const userPlaySession = sessionAttributes.userPlaySession;
    const audioPlayer = handlerInput.requestEnvelope.context.AudioPlayer;
    const offsetInMilliseconds = audioPlayer?.offsetInMilliseconds;
    const amazonToken = audioPlayer?.token;
    if (
      userPlaySession &&
      offsetInMilliseconds !== undefined &&
      amazonToken !== undefined
    ) {
      const currentBookTime = calcBookTimeFromTrackAndOffset(
        userPlaySession,
        offsetInMilliseconds,
        amazonToken,
      );

      if (await closeUserPlaySession(userPlaySession, currentBookTime)) {
        sessionAttributes.userPlaySession = undefined;
        await handlerInput.attributesManager.savePersistentAttributes();
      }
    } else {
      console.log(
        "CancelAndStopIntentHandler: userPlaySession or offsetInMilliseconds or amazonToken is null; could not close ABS play session",
      );
    }
    console.log("CancelAndStopIntentHandler: closing Alexa skill");
    return handlerInput.responseBuilder
      .speak(sanitizeForSSML(speakOutput))
      .addAudioPlayerStopDirective()
      .withShouldEndSession(true)
      .getResponse();
  },
};
