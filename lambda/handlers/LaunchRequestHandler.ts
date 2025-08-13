import * as Alexa from "ask-sdk-core";

/**
 * Handler for the skill launch request
 */
export const LaunchRequestHandler: Alexa.RequestHandler = {
  canHandle(handlerInput: Alexa.HandlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "LaunchRequest"
    );
  },
  handle(handlerInput: Alexa.HandlerInput) {
    const speakOutput =
      'Welcome to Audiobookshelf, you can say "play audiobook" to start listening.';

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(speakOutput)
      .getResponse();
  },
};
