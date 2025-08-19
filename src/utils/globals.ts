import { PlaybackSessionExpanded } from "../abs/ABSInterfaces";

export interface PlaybackAttributes {
  userPlaySession: PlaybackSessionExpanded | undefined;
  nextStreamEnqueued: boolean | undefined;
}

export const BACKGROUND_URL =
  "https://images.steelcase.com/image/upload/c_fill,q_auto,f_auto,h_900,w_1600/v1567243086/6130_1000.jpg";

export const ABS_API_KEY = process.env.ABS_API_KEY;
export const SERVER_URL = process.env.SERVER_URL;
export const USER_AGENT = process.env.USER_AGENT;
