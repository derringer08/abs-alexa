import * as Alexa from "ask-sdk-core";
import { interfaces, Response } from "ask-sdk-model";
import { closeUserPlaySession, updateUserPlaySession } from "../ABSFunctions";
import { PlaybackAttributes } from "../globals";
import {
  calcBookTimeFromTrackAndOffset,
  getCurrentChapterByBookTime,
  getPlaybackMetadata,
  getPlayURL,
} from "../helpers";

/* *
 * AudioPlayer events can be triggered when users interact with your audio playback, such as stopping and
 * starting the audio, as well as when playback is about to finish playing or playback fails.
 * This handler will save the appropriate details for each event and log the details of the exception,
 * which can help troubleshoot issues with audio playback.
 * */
export const AudioPlayerEventHandler: Alexa.RequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type.startsWith("AudioPlayer.");
  },
  async handle(handlerInput: Alexa.HandlerInput): Promise<Response> {
    try {
      // this offset isn't always being set; is offsetInMilliseconds passed in different
      // parts of handlerInput sometimes?
      const audioPlayerEventName =
        handlerInput.requestEnvelope.request.type.split(".")[1];
      const attributes =
        (await handlerInput.attributesManager.getPersistentAttributes()) as PlaybackAttributes;
      const userPlaySession = attributes.userPlaySession;
      console.log(`AudioPlayer event encountered: ${audioPlayerEventName}`);
      let offsetInMilliseconds;
      let amazonToken;
      let currentBookTime;

      switch (audioPlayerEventName) {
        case "PlaybackStarted": {
          console.log("PlaybackStarted");
          const request =
            Alexa.getRequest<interfaces.audioplayer.PlaybackStartedRequest>(
              handlerInput.requestEnvelope,
            );
          offsetInMilliseconds = request.offsetInMilliseconds;
          amazonToken = request.token;
          if (userPlaySession && offsetInMilliseconds && amazonToken) {
            currentBookTime = calcBookTimeFromTrackAndOffset(
              userPlaySession,
              offsetInMilliseconds,
              amazonToken,
            );
            await updateUserPlaySession(userPlaySession, currentBookTime);
          }

          break;
        }

        case "PlaybackFinished": {
          // run when playback finishes on its own
          console.log("PlaybackFinished");
          const request =
            Alexa.getRequest<interfaces.audioplayer.PlaybackFinishedRequest>(
              handlerInput.requestEnvelope,
            );
          offsetInMilliseconds = request.offsetInMilliseconds;
          amazonToken = request.token;
          if (userPlaySession && offsetInMilliseconds && amazonToken) {
            currentBookTime = calcBookTimeFromTrackAndOffset(
              userPlaySession,
              offsetInMilliseconds,
              amazonToken,
            );
          }

          if (attributes.nextStreamEnqueued) {
            if (userPlaySession && currentBookTime !== undefined)
              await updateUserPlaySession(userPlaySession, currentBookTime);
          } else {
            // if no stream enqueued, then likely the end of the book. Close the play session

            if (userPlaySession && currentBookTime !== undefined) {
              void closeUserPlaySession(userPlaySession, currentBookTime);
              // PlaybackFinished is the terminal handler -- it doesn't mvoe on to PlaybackStopped
            }
            // book end, clear all attributes
            console.log("PlaybackFinished (book end?): clearing all memory");
            attributes.userPlaySession = undefined;
          }
          break;
        }

        case "PlaybackStopped": {
          console.log("PlaybackStopped");
          const request =
            Alexa.getRequest<interfaces.audioplayer.PlaybackStoppedRequest>(
              handlerInput.requestEnvelope,
            );

          offsetInMilliseconds = request.offsetInMilliseconds;
          amazonToken = request.token;
          if (
            userPlaySession &&
            offsetInMilliseconds !== undefined &&
            amazonToken !== undefined
          ) {
            currentBookTime = calcBookTimeFromTrackAndOffset(
              userPlaySession,
              offsetInMilliseconds,
              amazonToken,
            );
            await updateUserPlaySession(userPlaySession, currentBookTime);
          }
          break;
        }

        case "PlaybackNearlyFinished": {
          const request =
            Alexa.getRequest<interfaces.audioplayer.PlaybackNearlyFinishedRequest>(
              handlerInput.requestEnvelope,
            );
          offsetInMilliseconds = request.offsetInMilliseconds;
          amazonToken = request.token;
          if (
            !userPlaySession ||
            offsetInMilliseconds === undefined ||
            amazonToken === undefined
          ) {
            break;
          }

          currentBookTime = calcBookTimeFromTrackAndOffset(
            userPlaySession,
            offsetInMilliseconds,
            amazonToken,
          );
          await updateUserPlaySession(userPlaySession, currentBookTime);

          const currentToken = parseInt(amazonToken); //token is base 1 index (because audiotrack.index starts at 1)
          if (userPlaySession.audioTracks.length > currentToken) {
            const nextToken = (currentToken + 1).toString();
            const nextTrack = userPlaySession.audioTracks[currentToken];
            attributes.nextStreamEnqueued = true;

            const nextUrl = getPlayURL(nextTrack);
            const newBookTime = calcBookTimeFromTrackAndOffset(
              userPlaySession,
              0,
              nextToken,
            );
            const chapter = getCurrentChapterByBookTime(
              newBookTime,
              userPlaySession,
            );

            const metadata = getPlaybackMetadata(
              chapter.title,
              userPlaySession,
            );
            return handlerInput.responseBuilder
              .addAudioPlayerPlayDirective(
                "ENQUEUE",
                nextUrl,
                nextToken,
                0,
                currentToken.toString(),
                metadata,
              )
              .getResponse();
          } else {
            attributes.nextStreamEnqueued = false;
          }
          break;
        }

        case "PlaybackFailed": {
          const request =
            Alexa.getRequest<interfaces.audioplayer.PlaybackFailedRequest>(
              handlerInput.requestEnvelope,
            );
          console.log("Playback Failed : %j", request.error);
          if (!userPlaySession || currentBookTime === undefined) {
            console.log(
              "PlaybackFailed, but userPlaySession or currentBookTime was undefined, so could not sync or close ABS play session.",
            );
            attributes.userPlaySession = undefined;
          } else {
            void closeUserPlaySession(userPlaySession, currentBookTime);
            attributes.userPlaySession = undefined;
          }
          break;
        }
        default:
          break;
      }
      return handlerInput.responseBuilder.getResponse();
    } catch (error) {
      console.error("Error handling AudioPlayer event:", error);
      return handlerInput.responseBuilder.getResponse();
    }
  },
};
