import {
  DynamoDbPersistenceAdapter,
  PartitionKeyGenerators,
  SkillBuilders,
} from "ask-sdk";
import { RequestEnvelope } from "ask-sdk-model";
import "dotenv/config";
import { AudioPlayerEventHandler } from "./handlers/AudioPlayerEventHandler";
import { CancelAndStopIntentHandler } from "./handlers/CancelAndStopIntentHandler";
import { ChangeXTimeHandler } from "./handlers/ChangeXTimeHandler";
import { ErrorHandler } from "./handlers/ErrorHandler";
import { FallbackIntentHandler } from "./handlers/FallbackIntentHandler";
import { HelpIntentHandler } from "./handlers/HelpIntentHandler";
import { LaunchRequestHandler } from "./handlers/LaunchRequestHandler";
import { NextIntentHandler } from "./handlers/NextIntentHandler";
import { PauseAudioIntentHandler } from "./handlers/PauseAudioIntentHandler";
import { PlayAudioIntentHandler } from "./handlers/PlayAudioIntentHandler";
import { PlaybackBookHandler } from "./handlers/PlaybackBookHandler";
import { PlaybackControllerHandler } from "./handlers/PlaybackControllerHandler";
import { PreviousIntentHandler } from "./handlers/PreviousIntentHandler";
import { SessionEndedRequestHandler } from "./handlers/SessionEndedRequestHandler";
import { SystemExceptionHandler } from "./handlers/SystemExceptionHandler";
import { UnsupportedAudioIntentHandler } from "./handlers/UnsupportedAudioIntentHandler";
import { PersistentAttributeResponseInterceptor } from "./Interceptors/PersistentAttributeResponseInterceptor";

//const app = express();
export const handler = SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    PlayAudioIntentHandler,
    PlaybackBookHandler,
    PauseAudioIntentHandler,
    PreviousIntentHandler,
    NextIntentHandler,
    ChangeXTimeHandler,
    UnsupportedAudioIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    AudioPlayerEventHandler,
    PlaybackControllerHandler,
    SystemExceptionHandler,
    FallbackIntentHandler,
    SessionEndedRequestHandler,
  )
  .addErrorHandlers(ErrorHandler)
  //.addRequestInterceptors()
  .addResponseInterceptors(PersistentAttributeResponseInterceptor)
  .withPersistenceAdapter(
    new DynamoDbPersistenceAdapter({
      tableName: process.env.DYNAMODB_PERSISTENCE_TABLE_NAME!,
      partitionKeyGenerator: (requestEnvelope: RequestEnvelope) =>
        PartitionKeyGenerators.deviceId(requestEnvelope),
      createTable: true,
    }),
  )
  .lambda();
