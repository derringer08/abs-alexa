import * as Alexa from "ask-sdk-core";
import { SimpleSlotValue } from "ask-sdk-model";
import Fuse, { IFuseOptions } from "fuse.js";
import {
  getAllLibraries,
  getAuthor,
  getLibraryFilterData,
  searchFor,
} from "../abs/ABSFunctions";
import {
  AuthorMinified,
  LibraryItemExpanded,
  LibraryItemMinified,
} from "../abs/ABSInterfaces";
import { sanitizeForSSML } from "../utils/helpers";
import { buildResponseForAudioPlayer } from "./PlayAudioIntentHandler";

export const PlayBookHandler = {
  // this handler is not currently used (has limitations)
  canHandle(handlerInput: Alexa.HandlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === "IntentRequest" &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === "PlayBookIntent"
    );
  },
  async handle(handlerInput: Alexa.HandlerInput) {
    // this function is mainly limited by the poor intent slots that are returned. May only be
    // actually useful if I were to upload the catalogue for Alexa to analyze.....
    // it doesn't do any entity resolution, which is stupid
    // created a custom handler that does entity resolution through amazon
    console.log("Intent: PlaybackBookHandler Triggered");

    const requestEnvelope = handlerInput.requestEnvelope;

    let bookTitle: string | undefined;

    const bookSlotValue = Alexa.getSlotValueV2(
      requestEnvelope,
      "object.name",
    ) as SimpleSlotValue;
    const bookTitleRaw = bookSlotValue?.value;
    const bookTitleAmazon =
      bookSlotValue?.resolutions?.resolutionsPerAuthority?.[0]?.values?.[0]
        ?.value?.name;

    const authorSlotValue = Alexa.getSlotValueV2(
      requestEnvelope,
      "object.author.name",
    ) as SimpleSlotValue;
    const authorNameRaw = authorSlotValue?.value;
    const authorNameAmazon =
      authorSlotValue?.resolutions?.resolutionsPerAuthority?.[0]?.values?.[0]
        ?.value?.name;

    console.log("Title: " + bookTitleRaw);
    console.log("Author: " + authorNameRaw);

    if (!bookTitleRaw) {
      const speakOutput =
        'I did not understand the request. For example, try saying "Play audiobook title" or "Play audiobook title by author".';
      console.log("Book slot undefined");
      return handlerInput.responseBuilder
        .speak(speakOutput)
        .reprompt(speakOutput)
        .getResponse();
    }

    const allLibraries = await getAllLibraries();
    const bookLibraries = allLibraries.filter(
      (library) => library.mediaType === "book",
    );
    const audiobooksOnlyLibraries = bookLibraries.filter(
      (library) => library.settings.audiobooksOnly,
    );
    const bookLibraryIDs = audiobooksOnlyLibraries.map((library) => library.id);

    let matchedItemId: string | null | undefined;

    if (bookTitleAmazon) {
      // Run both searches at the same time for speed
      const amazonItemIdPromise = getMatchingItemId(
        bookLibraryIDs,
        bookTitleAmazon,
        authorNameAmazon,
      );
      const rawItemIdPromise = getMatchingItemId(
        bookLibraryIDs,
        bookTitleRaw,
        authorNameRaw,
      );

      matchedItemId = await amazonItemIdPromise;
      if (!matchedItemId) {
        // Only wait for raw search if Amazon search failed
        matchedItemId = await rawItemIdPromise;
      }
    } else {
      // No Amazon title, just do the raw search
      matchedItemId = await getMatchingItemId(
        bookLibraryIDs,
        bookTitleRaw,
        authorNameRaw,
      );
    }

    if (!matchedItemId) {
      //If we don't have a match here, then we didn't find anything
      console.log("No book of title '" + bookTitle + "' found");
      const speakOutput =
        "No book of title '" + bookTitle + "' found. Please try again.";
      return handlerInput.responseBuilder
        .speak(sanitizeForSSML(speakOutput))
        .reprompt(sanitizeForSSML(speakOutput))
        .getResponse();
    }

    return buildResponseForAudioPlayer(handlerInput, matchedItemId);
  },
};

async function getMatchingItemId(
  libraryIDs: string[],
  bookTitle: string,
  authorName?: string,
): Promise<string | null> {
  let libraryItems: LibraryItemMinified[] | LibraryItemExpanded[] | undefined;
  if (authorName) {
    //if we have an author name, filter down to books from the matched author
    const allAuthorsDict: { [id: string]: AuthorMinified } = {};
    await Promise.all(
      libraryIDs.map(async (libraryID) => {
        const filterData = await getLibraryFilterData(libraryID);
        for (const author of filterData.authors) {
          allAuthorsDict[author.id] = author;
        }
      }),
    );

    const allAuthorsArray: AuthorMinified[] = Object.values(allAuthorsDict);

    // fuzzy match author
    const optionsAuthor = {
      keys: ["name"],
      threshold: 0.3, // Adjust the threshold according to your needs
    };

    //Find the best author match from the libraries and get their list of books
    const fuseAuthor = new Fuse(allAuthorsArray, optionsAuthor);
    const results = fuseAuthor.search(authorName);
    let matchedAuthor: AuthorMinified;
    if (results.length > 0) {
      matchedAuthor = results[0].item;
      const absAuthorItem = await getAuthor(matchedAuthor.id);
      libraryItems = absAuthorItem.libraryItems;
    }
  }

  if (!libraryItems) {
    //If we didn't narrow down books by author, do a search over all libraries
    const results: { [id: string]: LibraryItemExpanded } = {};

    await Promise.all(
      libraryIDs.map(async (libraryID) => {
        //Should we limit the number of results to speed things up?
        const searchResults = await searchFor(bookTitle, libraryID);
        if (searchResults.book.length > 0) {
          const firstBook = searchResults.book[0].libraryItem;
          results[firstBook.id] = firstBook;
        }
      }),
    );

    libraryItems = Object.values(results);
    //TODO: Figure out if it's faster to do the ABS search and then fuzzy match, or just load all titles and then fuzzy match
  }

  // fuzzy match title
  const optionsTitle: IFuseOptions<LibraryItemMinified | LibraryItemExpanded> =
    {
      keys: ["media.metadata.title"], // Specify the keys to search within the nested structure
      includeScore: true, // Include score in the results
      threshold: 0.3, // Adjust the threshold to control the fuzzy matching sensitivity
      ignoreDiacritics: true, // Indicates whether comparisons should ignore diacritics (accents).
    };

  // Create a Fuse instance
  const fuseTitle = new Fuse<LibraryItemMinified | LibraryItemExpanded>(
    libraryItems,
    optionsTitle,
  );

  const fuseTitleResults = fuseTitle.search(bookTitle);

  if (fuseTitleResults.length === 0) {
    return null;
  }

  const libraryItem = fuseTitleResults[0].item;

  console.log("Found a book in the library!");
  console.log("Title: " + libraryItem.media.metadata.title);
  console.log("Author: " + libraryItem.media.metadata.authorName);

  return libraryItem.id;
}
