// ==================== Library Interfaces ====================

/**
 * Represents a media library on the server.
 */
export interface Library {
  /** Unique identifier for the library. (Read Only) */
  id: string;
  /** Name assigned to the library. */
  name: string;
  /** Folders included in the library on the server. */
  folders: Folder[];
  /** Display order of the library within the list. Must be greater than or equal to 1. */
  displayOrder: number;
  /** Icon selected to represent the library. */
  icon: string;
  /** Type of media the library contains: "book" or "podcast". (Read Only) */
  mediaType: "book" | "podcast";
  /** Preferred metadata provider used for the library. */
  provider: string;
  /** Library settings configuration. */
  settings: LibrarySettings;
  /** Creation timestamp in milliseconds since POSIX epoch. (Read Only) */
  createdAt: number;
  /** Last updated timestamp in milliseconds since POSIX epoch. (Read Only) */
  lastUpdate: number;
}

/**
 * Represents a folder associated with a library.
 */
export interface Folder {
  /** Unique identifier for the folder. (Read Only) */
  id: string;
  /** Absolute path of the folder on the server. (Read Only) */
  fullPath: string;
  /** Identifier of the library this folder belongs to. (Read Only) */
  libraryId: string;
  /** Timestamp when the folder was added, in milliseconds since POSIX epoch. (Read Only) */
  addedAt: number;
}

/**
 * Settings for a specific library.
 */
export interface LibrarySettings {
  /** Whether to use square book covers (1 for true, 0 for false). */
  coverAspectRatio: number;
  /** If true, disables the folder watcher for this library. */
  disableWatcher: boolean;
  /** If true, skips matching books that already have an ASIN. */
  skipMatchingMediaWithAsin: boolean;
  /** If true, skips matching books that already have an ISBN. */
  skipMatchingMediaWithIsbn: boolean;
  /** Cron expression specifying when to auto-scan library folders. Null disables automatic scanning. */
  autoScanCronExpression: string | null;
  /** Whether the library has only audiobooks (and not ebooks) */
  audiobooksOnly: boolean;
}

/**
 * Metadata for a file in the library.
 */
export interface FileMetadata {
  /** Filename including extension. */
  filename: string;
  /** File extension (without dot). */
  ext: string;
  /** Absolute path to the file on the server. */
  path: string;
  /** Path to the file relative to the containing folder. */
  relPath: string;
  /** File size in bytes. */
  size: number;
  /** Last modified time in milliseconds since POSIX epoch. */
  mtimeMs: number;
  /** Status change time in milliseconds since POSIX epoch. */
  ctimeMs: number;
  /** Creation time in milliseconds since POSIX epoch, or 0 if unknown. */
  birthtimeMs: number;
}

/**
 * Represents a file belonging to a library item.
 */
export interface LibraryFile {
  /** Inode identifier for the file. */
  ino: string;
  /** Metadata associated with the file. */
  metadata: FileMetadata;
  /** Timestamp when the file was added, in milliseconds since POSIX epoch. */
  addedAt: number;
  /** Timestamp when the file was last updated, in milliseconds since POSIX epoch. */
  updatedAt: number;
  /** Type of file (e.g., audio, image). */
  fileType: string;
}

/**
 *
 */
export interface LibraryFilterData {
  /** The authors of books in the library. */
  authors: AuthorMinified[];
  /** The genres of books in the library. */
  genres: string[];
  /** The tags in the library. */
  tags: string[];
  /** The series in the library. The series will only have their id and name. */
  series: SeriesMinified;
  /** The narrators of books in the library. */
  narrators: string[];
  /** The languages of books in the library. */
  languages: string[];
}

export interface LibrarySearchResults {
  /** The book results of the search. Only for libraries with media type "book." */
  book: LibraryItemSearchResult[];
  /** The podcast results of the search. Only for libraries with media type "podcast." */
  //podcast?: LibraryItemSearchResult[];
  /** The tag results of the search. */
  tags: string[];
  /** The author results of the search. */
  authors: AuthorExpanded[];
  /** The series results of the search */
  series: SeriesWithBooks[];
}

export interface LibraryItemSearchResult {
  /** The matched library item. */
  libraryItem: LibraryItemExpanded;
  /** What the library item was matched on. */
  matchKey: string;
  /** The text in the library item that the query matched to. */
  matchText: string;
}

// ==================== Book and Media Interfaces ====================

interface BookBase {
  /** Absolute path to the book's cover image, or null if not available. */
  coverPath: string | null;
  /** Tags associated with the book. */
  tags: string[];
  /** Total duration of the book, in seconds. */
  duration: number;
  /** Total size of the book, in bytes. */
  size: number;
  /** Audio tracks derived from the book's audio files. */
  tracks: AudioTrack[];
}

/**
 * Represents a book within the library.
 */
export interface Book extends BookBase {
  /** Metadata for the book. */
  metadata: BookMetadata;
  /** Identifier for the library item containing this book. */
  libraryItemId: string;
  /** Audio files associated with the book. */
  audioFiles: AudioFile[];
  /** Chapters defined for the book. */
  chapters: BookChapter[];
  /** Always null for audiobooks. */
  ebookFile: null;
}

/**
 * Minified representation of a book for lightweight use.
 */
export interface BookMinified extends BookBase {
  /** Minified book metadata. */
  metadata: BookMetadataMinified;
  /** Number of audio tracks in the book. */
  numTracks: number;
  /** Number of audio files the book has. */
  numAudioFiles: number;
  /** Number of chapters in the book. */
  numChapters: number;
  /** Total duration of the book, in seconds. */
  duration: number;
  /** Total size of the book, in bytes. */
  size: number;
  /** Ebook format, or null if audiobook. */
  ebookFormat: string | null;
}

export interface BookExpanded extends Book {
  /** The book's metadata. */
  metadata: BookMetadataExpanded;
  /** The total length (in seconds) of the book. */
  duration: number;
  /** The total size (in bytes) of the book. */
  size: number;
  /** The book's audio tracks from the audio files. */
  tracks: AudioTrack[];
}

interface LibraryItemBase {
  /** Unique identifier for the library item. */
  id: string;
  /** Inode of the library item. */
  ino: string;
  /** Identifier of the library this item belongs to. */
  libraryId: string;
  /** Identifier of the folder containing this item. */
  folderId: string;
  /** Absolute path to the library item on the server. */
  path: string;
  /** Path relative to the library folder. */
  relPath: string;
  /** True if this item is a single file in the library root. */
  isFile: boolean;
  /** Last modified timestamp in milliseconds since POSIX epoch. */
  mtimeMs: number;
  /** Status change timestamp in milliseconds since POSIX epoch. */
  ctimeMs: number;
  /** Creation timestamp in milliseconds since POSIX epoch, or 0 if unknown. */
  birthtimeMs: number;
  /** Timestamp when item was added to the library, in milliseconds since POSIX epoch. */
  addedAt: number;
  /** Last updated timestamp in milliseconds since POSIX epoch. (Read Only) */
  updatedAt: number;
  /** True if the item was scanned and no longer exists. */
  isMissing: boolean;
  /** True if the item was scanned and has no media files. */
  isInvalid: boolean;
  /** Media type for the item (e.g., "book"). */
  mediaType: "book"; // | 'podcast';
  /** User's media progress for this item, if available and requested via include=progress. */
  userMediaProgress?: MediaProgress;
  /** RSS feed information if open, or null if closed. Only included if requested via include=rssFeed*/
  rssFeed?: object | null;
}

/**
 * Represents an item in the library, such as a book or podcast.
 */
export interface LibraryItem extends LibraryItemBase {
  /** Media object associated with this item (Book or Podcast). */
  media: Book; // | Podcast;
  /** Last scan timestamp in milliseconds since POSIX epoch, or null if never scanned. */
  lastScan: number | null;
  /** Scanner version used in the last scan, or null if not scanned. */
  scanVersion: string | null;
  /** Files belonging to this library item. */
  libraryFiles: LibraryFile[];
}

/**
 * Lightweight version of a LibraryItem for quick reference.
 */
export interface LibraryItemMinified extends LibraryItemBase {
  /** Minified media object for this item. */
  media: BookMinified;
  /** Number of library files associated with this item. */
  numFiles: number;
  /** Total size of the library item in bytes. */
  size: number;
  /** Last update time for the associated media progress, in milliseconds since POSIX epoch, if available. */
  progressLastUpdate?: number;
}

/**
 * Expanded version of a LibraryItem for quick reference.
 */
export interface LibraryItemExpanded extends LibraryItem {
  /** Media object associated with this item (Book or Podcast). */
  media: BookExpanded; // | PodcastExpanded;
  /** Total size of the library item in bytes. */
  size: number;
}

interface BookMetadataBase {
  /** Book title, or null if unknown. */
  title: string | null;
  /** Subtitle of the book, or null if none. */
  subtitle: string | null;
  /** Genres associated with the book. */
  genres: string[];
  /** Year of publication, or null if unknown. */
  publishedYear: string | null;
  /** Publication date, or null if unknown. */
  publishedDate: string | null;
  /** Publisher, or null if unknown. */
  publisher: string | null;
  /** Description of the book, or null if none. */
  description: string | null;
  /** ISBN, or null if unknown. */
  isbn: string | null;
  /** ASIN, or null if unknown. */
  asin: string | null;
  /** Language of the book, or null if unknown. */
  language: string | null;
  /** True if the book is marked as explicit. */
  explicit: boolean;
}

/**
 * Full metadata for a book.
 */
export interface BookMetadata extends BookMetadataBase {
  /** Array of authors or minified author info. */
  authors: AuthorMinified[] | Author[];
  /** Audiobook narrators. */
  narrators: string[];
  /** Series information for the book. */
  series: SeriesSequence[];
}

/**
 * Minified metadata for a book.
 */
export interface BookMetadataMinified extends BookMetadataBase {
  /** Book title with prefix (e.g., "The") moved to the end. */
  titleIgnorePrefix: string;
  /** Name(s) of the author(s). */
  authorName: string;
  /** Author names, formatted last name first. */
  authorNameLF: string;
  /** Name(s) of the narrator(s). */
  narratorName: string;
  /** Name of the series. */
  seriesName: string;
}

/**
 * Expanded metadata for a book
 */
export interface BookMetadataExpanded
  extends BookMetadata,
    BookMetadataMinified {}

/**
 * Represents an author.
 */
export interface Author {
  /** Unique identifier for the author. */
  id: string;
  /** ASIN for the author, or null if unknown. */
  asin: string | null;
  /** Name of the author. */
  name: string;
  /** Description of the author, or null if none. */
  description: string | null;
  /** Absolute path to the author's image, or null if none. */
  imagePath: string | null;
  /** Timestamp when the author was added, in milliseconds since POSIX epoch. */
  addedAt: number;
  /** Timestamp when the author was last updated, in milliseconds since POSIX epoch. */
  updatedAt: number;
}

/**
 * Represents an author with library items included (retrieved with include=items)
 */
export interface AuthorWithItems extends Author {
  /** The library items written by the author. */
  libraryItems?: LibraryItemMinified[];
}

/**
 * Minified author information.
 */
export interface AuthorMinified {
  /** Unique identifier for the author. */
  id: string;
  /** Name of the author. */
  name: string;
}

export interface AuthorExpanded extends Author {
  /** The number of books associated with the author in the library. */
  numBooks: number;
}

/**
 * Minified series information
 */
export interface SeriesMinified {
  /** The ID of the series. */
  id: string;
  /** The name of the series */
  name: string;
}

/**
 * A series with the books included
 */
export interface SeriesWithBooks {
  /** the id of the series */
  id: string;
  /** The name of the series */
  name: string;
  /** The time (in ms since POSIX epoch) when the series was added. */
  addedAt: number;
  /** The name of the series with any prefix moved to the end. */
  nameIgnorePrefix: string;
  /** The name of the series with any prefix removed. */
  nameIgnorePrefixSort: string;
  /** Series type */
  type: "series";
  /**
   * The library items that contain the books in the series.
   * A sequence attribute that denotes the position in the series the book is in, is tacked on.
   * */
  books: (LibraryItem & { sequence: number })[];
  /** The combined duration (in seconds) of all books in the series. */
  totalDuration: number;
}

/**
 * Represents a book series and position within the series.
 */
export interface SeriesSequence {
  /** Unique identifier for the series. */
  id: string;
  /** Name of the series. */
  name: string;
  /** Sequence or position in the series, or null if unknown. */
  sequence: string | null;
}

/**
 * Represents a chapter in a book or audio file.
 */
export interface BookChapter {
  /** Unique identifier for the chapter. */
  id: number;
  /** Start time of the chapter in seconds. */
  start: number;
  /** End time of the chapter in seconds. */
  end: number;
  /** Chapter title. */
  title: string;
}

/**
 * Represents an audio file associated with a book.
 */
export interface AudioFile {
  /** Index position of the audio file. */
  index: number;
  /** Inode of the audio file. */
  ino: string;
  /** Metadata for the audio file. */
  metadata: FileMetadata;
  /** Timestamp when added to the library, in milliseconds since POSIX epoch. */
  addedAt: number;
  /** Timestamp when last updated, in milliseconds since POSIX epoch. (Read Only) */
  updatedAt: number;
  /** Track number from file metadata, or null if unknown. */
  trackNumFromMeta: number | null;
  /** Disc number from file metadata, or null if unknown. */
  discNumFromMeta: number | null;
  /** Track number from the filename, or null if unknown. */
  trackNumFromFilename: number | null;
  /** Disc number from the filename, or null if unknown. */
  discNumFromFilename: number | null;
  /** True if this file has been manually verified. */
  manuallyVerified: boolean;
  /** True if the file is marked for exclusion. */
  exclude: boolean;
  /** Error message related to the file, or null if none. */
  error: string | null;
  /** File format (e.g., mp3, m4b). */
  format: string;
  /** Duration of the audio file in seconds. */
  duration: number;
  /** Bit rate in bits per second. */
  bitRate: number;
  /** Language of the audio file, or null if unknown. */
  language: string | null;
  /** Codec used by the audio file. */
  codec: string;
  /** Time base string for the audio file. */
  timeBase: string;
  /** Number of audio channels. */
  channels: number;
  /** Channel layout description. */
  channelLayout: string;
  /** Chapters included in this audio file. */
  chapters: BookChapter[];
  /** Embedded cover art type, or null if none exists. */
  embeddedCoverArt: string | null;
  /** Audio metadata tags, or null if none. */
  metaTags: string[] | null;
  /** MIME type of the audio file. */
  mimeType: string;
}

/**
 * Represents the user's progress with a media item.
 */
export interface MediaProgress {
  /** Unique identifier for the media progress entry. */
  id: string;
  /** Identifier for the related library item. */
  libraryItemId: string;
  /** Episode identifier for podcasts, or null for books. */
  episodeId: string | null;
  /** Total duration of the media, in seconds. Zero if finished without listening. */
  duration: number;
  /** Progress as a percentage (1 if finished). */
  progress: number;
  /** Current time in the media, in seconds. */
  currentTime: number;
  /** True if the media has been finished. */
  isFinished: boolean;
  /** True if hidden from the "Continue Listening" shelf. */
  hideFromContinueListening: boolean;
  /** Last updated timestamp, in milliseconds since POSIX epoch. */
  lastUpdate: number;
  /** Timestamp when progress was started, in milliseconds since POSIX epoch. */
  startedAt: number;
  /** Timestamp when finished, in milliseconds since POSIX epoch, or null if not finished. */
  finishedAt: number | null;
}

/**
 * Parameters for requesting playback of a library item.
 */
export interface PlayLibraryItemParameters {
  /** Information about the requesting device, if provided. */
  deviceInfo?: DeviceInfoParameters;
  /** If true, forces direct play of the library item. */
  forceDirectPlay?: boolean;
  /** If true, forces the server to transcode audio. */
  forceTranscode?: boolean;
  /** Array of MIME types supported by the client. */
  supportedMimeTypes?: string[];
  /** Name of the media player used by the client. */
  mediaPlayer?: string;
}

/**
 * Information about the client device requesting playback.
 */
export interface DeviceInfoParameters {
  /** Unique identifier for the device. */
  deviceId?: string;
  /** Human-readable name of the client device. */
  clientName?: string;
  /** Client application version. */
  clientVersion?: string;
  /** Manufacturer of the device. */
  manufacturer?: string;
  /** Device model name. */
  model?: string;
  /** Android SDK version, for Android clients. */
  sdkVersion?: number;
}

/**
 * Represents a session of media playback.
 */
export interface PlaybackSession {
  /** Unique identifier for the playback session (UUIDv4). */
  id: string;
  /** Identifier for the user. (UUIDv4) */
  userId: string;
  /** Identifier for the library. (UUIDv4) */
  libraryId: string;
  /** Identifier for the library item. (UUIDv4) */
  libraryItemId: string;
  /** Identifier for the podcast episode, or null if not applicable. */
  episodeId: string | null;
  /** Media type being played ("book" or "podcast"). */
  mediaType: string;
  /** Metadata for the media being played. */
  mediaMetadata: BookMetadata;
  /** Chapters included in the media (if a book). */
  chapters: BookChapter[];
  /** Title of the item displayed to the user. */
  displayTitle: string;
  /** Display name for the author. */
  displayAuthor: string;
  /** Cover image path for the media. */
  coverPath: string;
  /** Total duration of the item, in seconds. */
  duration: number;
  /** Method used for playback. */
  playMethod: PlayMethod;
  /** Media player used for playback. */
  mediaPlayer: string;
  /** Device information for the playback session. */
  deviceInfo: DeviceInfoParameters;
  /** Server version when session was started. */
  serverVersion: string;
  /** Date the session was started (YYYY-MM-DD). */
  date: string;
  /** Day of the week the session was started. */
  dayOfWeek: string;
  /** Total listening time in the session, in seconds. */
  timeListening: number;
  /** Start time in the media, in seconds. */
  startTime: number;
  /** Current playback position in the media, in seconds. */
  currentTime: number;
  /** Timestamp when session started, in milliseconds since POSIX epoch. */
  startedAt: number;
  /** Timestamp when session was last updated, in milliseconds since POSIX epoch. */
  updatedAt: number;
}

/**
 * Playback session with expanded details.
 */
export interface PlaybackSessionExpanded extends PlaybackSession {
  /** Audio tracks being played in this session. */
  audioTracks: AudioTrack[];
  // /** Video track being played, or null if none. */
  // videoTrack: VideoTrack | null;
  /** Library item associated with the session, if available. */
  libraryItem?: LibraryItem;
}

/**
 * Enum representing available play methods.
 */
export enum PlayMethod {
  /** Direct play (no server involvement). */
  DirectPlay = 0,
  /** Direct streaming (no transcoding). */
  DirectStream = 1,
  /** Server transcodes the audio for playback. */
  Transcode = 2,
  /** Played locally on the device. */
  Local = 3,
}

/**
 * Represents a track in an audio file.
 */
export interface AudioTrack {
  /** Index of the audio track. */
  index: number;
  /** Start offset in the audio file, in seconds. */
  startOffset: number;
  /** Duration of the audio track, in seconds. */
  duration: number;
  /** Filename of the audio file for this track. */
  title: string;
  /** URL path to the audio file. */
  contentUrl: string;
  /** MIME type of the audio file. */
  mimeType: string;
  /** Metadata for the audio file, or null if not available. */
  metadata: FileMetadata | null;
}

// ==================== User Interfaces ====================
export interface User {
  /** The ID of the user. Only the root user has the root ID. */
  id: string;
  /** The username of the user. */
  username: string;
  /** The type of the user. Will be root, guest, user, or admin. */
  type: "root" | "guest" | "user" | "admin";
  /** The authentication token of the user. */
  token: string;
  /** The user's media progress. */
  mediaProgress: MediaProgress[];
  /** IDs of series to hide from the user's "Continue Series" shelf. */
  seriesHideFromContinueListening: string[];
  /** The user's bookmarks. */
  bookmarks: AudioBookmark[];
  /** Whether the user's account is active. */
  isActive: boolean;
  /** Whether the user is locked. */
  isLocked: boolean;
  /** The time (in ms since POSIX epoch) when the user was last seen by the server. Will be null if the user has never logged in. */
  lastSeen: number | null;
  /** The time (in ms since POSIX epoch) when the user was created. */
  createdAt: number;
  /** The user's permissions. */
  permissions: UserPermissions;
  /** The IDs of libraries accessible to the user. An empty array means all libraries are accessible. */
  librariesAccessible: string[];
  /** The tags accessible to the user. An empty array means all tags are accessible. */
  itemTagsAccessible: string[];
}

export interface AudioBookmark {
  /** The ID of the library item the bookmark is for. */
  libraryItemId: string;
  /** The title of the bookmark. */
  title: string;
  /** The time (in seconds) the bookmark is at in the book. */
  time: number;
  /** The time (in ms since POSIX epoch) when the bookmark was created. */
  createdAt: number;
}

export interface UserPermissions {
  /** Whether the user can download items to the server. */
  download: boolean;
  /** Whether the user can update library items. */
  update: boolean;
  /** Whether the user can delete library items. */
  delete: boolean;
  /** Whether the user can upload items to the server. */
  upload: boolean;
  /** Whether the user can access all libraries. */
  accessAllLibraries: boolean;
  /** Whether the user can access all tags. */
  accessAllTags: boolean;
  /** Whether the user can access explicit content. */
  accessExplicitContent: boolean;
}
