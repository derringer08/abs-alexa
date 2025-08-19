import * as Alexa from "ask-sdk-core";
import { Response } from "ask-sdk-model";

/* *
 * SystemExceptions can be triggered if there is a problem with the audio that is trying to be played.
 * This handler will log the details of the exception and can help troubleshoot issues with audio playback.
 * */
export const SystemExceptionHandler: Alexa.RequestHandler = {
  canHandle(handlerInput: Alexa.HandlerInput): boolean {
    return (
      handlerInput.requestEnvelope.request.type ===
      "System.ExceptionEncountered"
    );
  },
  handle(handlerInput: Alexa.HandlerInput): Response {
    console.log(
      `System exception encountered: ${JSON.stringify(handlerInput.requestEnvelope.request)}`,
    );
    return handlerInput.responseBuilder.getResponse();
  },
};
