import * as React from "react";
import { Joyride } from "react-joyride";
import GlobalAppContext from "../../utils/GlobalAppContext";
import {
  TourTooltip,
  LBTourStep,
  useTour,
  JOYRIDE_OPTIONS,
} from "./TourManager";

const STATS_TOUR_STEPS: LBTourStep[] = [
  {
    target: ".tertiary-nav",
    title: "Your Stats Dashboard",
    content:
      "Switch between Week, Month, Year, and All Time to explore how your listening changes over time.",
    placement: "bottom",
    disableScrolling: true,
    spotlightPadding: 3,
    mobile: {
      disableScrolling: false,
    },
  },
  {
    target: '[data-testid="listening-activity"]',
    title: "Listening Activity",
    content:
      "This chart shows how many tracks you listened to across the selected time period.",
    placement: "top",
    disableScrolling: true,
    spotlightPadding: { right: 10, left: 10 },
    mobile: {
      disableScrolling: false,
    },
  },
  {
    target: '[data-testid="top-release-group"]',
    title: "Visualize & Share",
    content:
      "Turn your top artists into a shareable graphic, perfect for social media.",
    placement: "bottom",
    disableScrolling: true,
    mobile: {
      disableScrolling: false,
    },
  },
  {
    target: "#top-entity",
    title: "Your Top Artists, Albums & Tracks",
    content:
      "See exactly who and what you listened to most. Rankings update nightly.",
    placement: "top",
    disableScrolling: true,
    spotlightPadding: { right: 10, left: 10, bottom: -15 },
    mobile: {
      disableScrolling: false,
    },
  },
  {
    target: "#daily-activity",
    title: "Daily Activity",
    content:
      "Discover which days and hours you listen the most. Night owl or morning listener?",
    placement: "top",
    disableScrolling: true,
    spotlightPadding: { right: 10, left: 10, bottom: 10 },
    mobile: {
      disableScrolling: false,
    },
  },
  {
    target: "#artist-activity",
    title: "Artist Activity",
    content:
      "See a breakdown of your top artists and which of their albums you listened to the most.",
    placement: "top",
    disableScrolling: true,
    spotlightPadding: { right: 10, left: 10, bottom: 10 },
    mobile: {
      disableScrolling: false,
    },
  },
  {
    target: "#era-activity",
    title: "Music by Decade",
    content:
      "Discover which musical eras you listen to most. Click on any decade bar to zoom in on specific years!",
    placement: "top",
    disableScrolling: true,
    spotlightPadding: { right: 10, left: 10, bottom: 10 },
    mobile: {
      disableScrolling: false,
    },
  },
  {
    target: "#album-activity",
    title: "Artist Evolution",
    content:
      "Track how your top artists rise and fall in popularity over your listening history.",
    placement: "top",
    disableScrolling: true,
    spotlightPadding: { right: 10, left: 10, bottom: 10 },
    mobile: {
      disableScrolling: false,
    },
  },
  {
    target: "#genre-activity",
    title: "Genre Activity",
    content:
      "See your favorite genres charted by time of day, see how your music taste shifts throughout the day.",
    placement: "top",
    disableScrolling: true,
    spotlightPadding: { right: 10, left: 10, bottom: 10 },
    mobile: {
      disableScrolling: false,
    },
  },
  {
    target: "#artist-origin",
    title: "Artist Origin",
    content:
      "See which countries your favourite artists come from, your music has no borders.",
    placement: "top",
    disableScrolling: true,
    spotlightPadding: { right: 10, left: 10, bottom: 10 },
    mobile: {
      disableScrolling: false,
    },
  },
];

export default function StatsTourManager() {
  const { currentUser } = React.useContext(GlobalAppContext);

  const { run, stepIndex, steps, handleTourEvent } = useTour({
    tourId: "stats",
    steps: STATS_TOUR_STEPS,
    tourName: "Stats Tour",
    description:
      "Explore your music trends, visual map of artist origins, and shareable charts based on your plays.",
    getStartRoute: (username, _fromStep, _resolvedSteps) =>
      `/user/${encodeURIComponent(username)}/stats/?range=week`,
    getStartSelector: () => ".tertiary-nav",
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
    />
  );
}
