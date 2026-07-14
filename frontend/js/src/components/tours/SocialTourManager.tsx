import * as React from "react";
import { Joyride } from "react-joyride";
import GlobalAppContext from "../../utils/GlobalAppContext";
import {
  TourTooltip,
  LBTourStep,
  useTour,
  JOYRIDE_OPTIONS,
  FLOATING_OPTIONS,
} from "./TourManager";

const SOCIAL_TOUR_STEPS: LBTourStep[] = [
  {
    target: ".listen-header",
    title: "Latest Activity Feed",
    content:
      "Explore the latest activity on ListenBrainz,see recommendations, playlists, and listens from the community in real time.",
    placement: "top",
    navigateTo: "/feed/",
  },
  {
    target: ".listen-header",
    title: "Network Feed",
    content:
      "See what the people you follow have been listening to. The more you follow, the richer this feed becomes.",
    placement: "top",
    navigateTo: "/feed/follows/",
  },
  {
    target: "#follower-following-section",
    title: "Followers & Following",
    content:
      "Grow your network here — see who follows you and discover who you follow. Click any username to explore their taste.",
    placement: "left",
  },
  {
    target: "#similar-users",
    title: "Similar Users",
    content:
      "ListenBrainz calculates music-taste similarity across all users. Follow anyone here and their listens will appear in your feed.",
    placement: "left",
  },
];

export default function SocialTourManager() {
  const { currentUser } = React.useContext(GlobalAppContext);

  const { run, stepIndex, steps, handleTourEvent } = useTour({
    tourId: "social",
    steps: SOCIAL_TOUR_STEPS,
    tourName: "Social Tour",
    description:
      "Discover mutual music tastes, manage followers, pin your top tracks, and find musical soulmates on ListenBrainz.",
    getStartRoute: (_username, fromStep, resolvedSteps) => {
      const step = resolvedSteps[fromStep];
      return step?.navigateTo ?? "/feed/";
    },
  });

  if (!currentUser?.name) return null;

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      continuous
      tooltipComponent={TourTooltip}
      onEvent={handleTourEvent}
      options={JOYRIDE_OPTIONS}
      floatingOptions={FLOATING_OPTIONS}
    />
  );
}
