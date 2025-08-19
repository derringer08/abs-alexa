import * as Alexa from "ask-sdk-core";

export const PersistentAttributeResponseInterceptor: Alexa.ResponseInterceptor =
  {
    async process(handlerInput: Alexa.HandlerInput): Promise<void> {
      await handlerInput.attributesManager.savePersistentAttributes();
    },
  };
