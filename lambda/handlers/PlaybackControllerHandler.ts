import * as Alexa from "ask-sdk-core";
import { Response } from "ask-sdk-model";
import { GetNextIntentResponse } from "./NextIntentHandler";
import { GetPauseResponse } from "./PauseAudioIntentHandler";
import { buildResponseForAudioPlayer as GetPlayResponse } from "./PlayAudioIntentHandler";
import { getPreviousIntentResponse } from "./PreviousIntentHandler";

// This is for devices with external play controls (such as Echo Show)
// This handler will always be followed by AudioPlayer events (stopped -> started),
// so not necessary to update ABS here
export const PlaybackControllerHandler: Alexa.RequestHandler = {
  canHandle(handlerInput: Alexa.HandlerInput) {
    return handlerInput.requestEnvelope.request.type.startsWith(
      "PlaybackController.",
    );
  },
  async handle(handlerInput): Promise<Response> {
    const playbackControllerEventName =
      handlerInput.requestEnvelope.request.type.split(".")[1];
    console.log(
      `PlaybackControllerHandler event: ${handlerInput.requestEnvelope.request.type}`,
    );

    let response;
    switch (playbackControllerEventName) {
      case "PlayCommandIssued":
        response = GetPlayResponse(handlerInput, undefined, false);
        break;
      case "PauseCommandIssued":
        response = GetPauseResponse(handlerInput, false);
        break;
      case "PreviousCommandIssued":
        response = getPreviousIntentResponse(handlerInput, false);
        break;
      case "NextCommandIssued":
        response = GetNextIntentResponse(handlerInput, false);
        break;
      default:
        response = handlerInput.responseBuilder.getResponse();
        break;
    }

    return response;
  },
};
