import * as Alexa from "ask-sdk-core";
import { Response, SessionEndedRequest } from "ask-sdk-model";
import { closeUserPlaySession } from "../abs/ABSFunctions";
import { PlaybackAttributes } from "../utils/globals";
import { getCurrentBookTime } from "../utils/helpers";

export const SessionEndedRequestHandler: Alexa.RequestHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) ===
      "SessionEndedRequest"
    );
  },
  async handle(handlerInput: Alexa.HandlerInput): Promise<Response> {
    try {
      const request = Alexa.getRequest<SessionEndedRequest>(
        handlerInput.requestEnvelope,
      );
      console.log("SessionEndedRequest reason:", request.reason);
      if (request.error) {
        console.error("SessionEndedRequest error:", request.error);
      }
      const attributes =
        (await handlerInput.attributesManager.getPersistentAttributes()) as PlaybackAttributes;
      const userPlaySession = attributes.userPlaySession;
      const audioPlayer = handlerInput.requestEnvelope.context.AudioPlayer;

      if (audioPlayer && userPlaySession) {
        const currentBookTime = getCurrentBookTime(
          audioPlayer,
          userPlaySession,
        );
        if (currentBookTime !== null) {
          void closeUserPlaySession(userPlaySession, currentBookTime);
        }
      }

      // clear all
      attributes.userPlaySession = undefined;

      console.log(
        `~~~~ Session ended: ${JSON.stringify(handlerInput.requestEnvelope)}`,
      );
      console.log(`~~~~ Session ended reason: ${request.reason}`);
      // Any cleanup logic goes here.
      return handlerInput.responseBuilder.getResponse(); // notice we send an empty response
    } catch (error) {
      console.error("Error during SessionEndedRequestHandler:", error);
      throw error;
    }
  },
};
