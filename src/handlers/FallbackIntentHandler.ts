import * as Alexa from "ask-sdk-core";
import { Response } from "ask-sdk-model";

export const FallbackIntentHandler: Alexa.RequestHandler = {
  canHandle(handlerInput: Alexa.HandlerInput): boolean {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) ===
        "AMAZON.FallbackIntent"
    );
  },
  handle(handlerInput: Alexa.HandlerInput): Response {
    const speakOutput =
      "Sorry, I don't know about that. Try telling me to play a certain book.";
    const repromptOutput =
      "What would you like to do? You can try telling me to play a certain book.";

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(repromptOutput)
      .getResponse();
  },
};
