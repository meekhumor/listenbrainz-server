import { createContext } from "react";
import APIService from "./APIService";
import RecordingFeedbackManager from "./RecordingFeedbackManager";
import { FlairEnum, FlairName, Flair } from "./constants";

export type OnboardingTourState = {
  status: "not_started" | "in_progress" | "skipped" | "completed";
  current_step: number;
  unlock_ready: boolean;
};

export type OnboardingState = {
  [key: string]: OnboardingTourState;
};

export type GlobalAppContextT = {
  APIService: APIService;
  websocketsUrl: string;
  registrationUrl?: string;
  currentUser: ListenBrainzUser;
  spotifyAuth?: SpotifyUser;
  youtubeAuth?: YoutubeUser;
  soundcloudAuth?: SoundCloudUser;
  funkwhaleAuth?: FunkwhaleUser;
  navidromeAuth?: NavidromeUser;
  critiquebrainzAuth?: MetaBrainzProjectUser;
  appleAuth?: AppleMusicUser;
  musicbrainzAuth?: MetaBrainzProjectUser & {
    refreshMBToken: () => Promise<string | undefined>;
  };
  userPreferences?: UserPreferences;
  musicbrainzGenres?: string[];
  recordingFeedbackManager: RecordingFeedbackManager;
  flair?: Flair;
  onboardingState?: OnboardingState;
};
const apiService = new APIService(`${window.location.origin}/1`);

export const defaultGlobalContext: GlobalAppContextT = {
  APIService: apiService,
  websocketsUrl: "",
  registrationUrl: "",
  currentUser: {} as ListenBrainzUser,
  spotifyAuth: {},
  youtubeAuth: {},
  soundcloudAuth: {},
  funkwhaleAuth: undefined,
  navidromeAuth: undefined,
  appleAuth: {},
  critiquebrainzAuth: {},
  musicbrainzAuth: {
    refreshMBToken: async () => {
      return undefined;
    },
  },
  userPreferences: {},
  musicbrainzGenres: [],
  recordingFeedbackManager: new RecordingFeedbackManager(apiService),
  flair: FlairEnum.None,
  onboardingState: undefined,
};

const GlobalAppContext = createContext<GlobalAppContextT>(defaultGlobalContext);

export default GlobalAppContext;
