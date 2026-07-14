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

export default function ListensTourManager() {
  const { currentUser } = React.useContext(GlobalAppContext);

  const listensSteps: LBTourStep[] = React.useMemo(
    () => [
      {
        target: "#brainz-player",
        title: "Meet BrainzPlayer",
        content:
          "This is your music player. It sources tracks from Spotify, YouTube, SoundCloud, and more — automatically.",
        placement: "top",
        hidePlayer: false,
        navigateTo: currentUser?.name
          ? `/user/${encodeURIComponent(currentUser.name)}/`
          : undefined,
      },
      {
        target: "a[href='/settings/brainzplayer/']",
        title: "BrainzPlayer Settings",
        content:
          "Click here to configure which music services BrainzPlayer uses and their priority order.",
        placement: "right",
        hidePlayer: false,
        navigateTo: currentUser?.name
          ? `/user/${encodeURIComponent(currentUser.name)}/`
          : undefined,
        mobile: {
          placement: "top",
        },
      },
      {
        target: "#data-sources",
        title: "Connect a Music Service",
        content:
          "Link Spotify, Apple Music, or YouTube to let BrainzPlayer find and play your listens automatically.",
        placement: "left",
        navigateTo: "/settings/brainzplayer/",
      },
      {
        target: "#source-order",
        title: "Playback Priority",
        content:
          "Drag services into your preferred order. BrainzPlayer tries each one in sequence until it finds a match.",
        placement: "left",
        navigateTo: "/settings/brainzplayer/",
      },
      {
        target: ".listen-card",
        title: "Play Any Listen",
        content:
          "Hover over any listen and click the play button — BrainzPlayer finds the best available source instantly.",
        placement: "right",
        hidePlayer: false,
        navigateTo: currentUser?.name
          ? `/user/${encodeURIComponent(currentUser.name)}/`
          : undefined,
        mobile: {
          placement: "bottom",
        },
      },
      {
        target: "#queue-panel-toggle",
        title: "Build Your Queue",
        content:
          "Add tracks to the queue for a seamless session. Your queue persists while you browse the site.",
        placement: "top",
        hidePlayer: false,
        navigateTo: currentUser?.name
          ? `/user/${encodeURIComponent(currentUser.name)}/`
          : undefined,
      },
    ],
    [currentUser?.name]
  );

  const { run, stepIndex, steps, handleTourEvent } = useTour({
    tourId: "listens",
    steps: listensSteps,
    tourName: "Listens Tour",
    description:
      "Meet the BrainzPlayer. Learn how to listen to tracks inline, customize playback priority, and build a seamless listening queue.",
    getStartRoute: (username, fromStep, resolvedSteps) => {
      const step = resolvedSteps[fromStep];
      return step?.navigateTo ?? `/user/${encodeURIComponent(username)}/`;
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
