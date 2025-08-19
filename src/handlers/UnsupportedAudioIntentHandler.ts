import * as Alexa from "ask-sdk-core";
import { Response } from "ask-sdk-model";
import { sanitizeForSSML } from "../helpers";
/**
 * Intent handler for built-in intents that aren't supported in this skill.
 * Regardless, the skill needs to handle this gracefully, which is why this handler exists.
 * */
export const UnsupportedAudioIntentHandler = {
  canHandle(handlerInput: Alexa.HandlerInput): boolean {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      (Alexa.getIntentName(handlerInput.requestEnvelope) ===
        "AMAZON.LoopOffIntent" ||
        Alexa.getIntentName(handlerInput.requestEnvelope) ===
          "AMAZON.LoopOnIntent" ||
        Alexa.getIntentName(handlerInput.requestEnvelope) ===
          "AMAZON.RepeatIntent" ||
        Alexa.getIntentName(handlerInput.requestEnvelope) ===
          "AMAZON.ShuffleOffIntent" ||
        Alexa.getIntentName(handlerInput.requestEnvelope) ===
          "AMAZON.ShuffleOnIntent" ||
        Alexa.getIntentName(handlerInput.requestEnvelope) ===
          "AMAZON.StartOverIntent")
    );
  },
  handle(handlerInput: Alexa.HandlerInput): Response {
    const speakOutput = "Sorry, I can't support that yet.";

    return handlerInput.responseBuilder
      .speak(sanitizeForSSML(speakOutput))
      .getResponse();
  },
};
