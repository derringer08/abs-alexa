import * as Alexa from "ask-sdk-core";
import { Response } from "ask-sdk-model";
import { Duration } from "luxon";
import { updateUserPlaySession } from "../abs/ABSFunctions";
import { PlaybackAttributes } from "../utils/globals";
import { getCurrentBookTime } from "../utils/helpers";
import { buildResponseForAudioPlayer } from "./PlayAudioIntentHandler";

export const ChangeXTimeHandler = {
  canHandle(handlerInput: Alexa.HandlerInput): boolean {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      (Alexa.getIntentName(handlerInput.requestEnvelope) ===
        "GoForwardXTimeIntent" ||
        Alexa.getIntentName(handlerInput.requestEnvelope) ===
          "GoBackXTimeIntent")
    );
  },
  async handle(handlerInput: Alexa.HandlerInput): Promise<Response> {
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

    const currentBookTime = getCurrentBookTime(audioPlayer, userPlaySession);

    if (currentBookTime === null) {
      return handlerInput.responseBuilder
        .speak("Something went wrong")
        .getResponse();
    }

    const timeCode = Alexa.getSlotValue(handlerInput.requestEnvelope, "time");
    let milliseconds = Duration.fromISO(timeCode).milliseconds;
    if (
      Alexa.getIntentName(handlerInput.requestEnvelope) === "GoBackXTimeIntent"
    ) {
      milliseconds = -milliseconds;
    }
    let newBookTime = currentBookTime + milliseconds / 1000;

    if (newBookTime < 0) {
      newBookTime = 0;
    } else if (newBookTime > userPlaySession.duration) {
      newBookTime = userPlaySession.duration - 5;
    }

    await updateUserPlaySession(userPlaySession, newBookTime);

    return buildResponseForAudioPlayer(handlerInput);
  },
};
