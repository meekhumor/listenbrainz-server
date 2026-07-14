import * as React from "react";
import { Joyride } from "react-joyride";
import { useLocation } from "react-router";
import NiceModal from "@ebay/nice-modal-react";
// eslint-disable-next-line import/no-extraneous-dependencies
import { offset } from "@floating-ui/react-dom";
import GlobalAppContext from "../../utils/GlobalAppContext";
import {
  TourTooltip,
  LBTourStep,
  markTourResumeDeclined,
  useTour,
  JOYRIDE_OPTIONS,
  FLOATING_OPTIONS,
  sleep,
} from "./TourManager";
import TourModal from "./TourModal";

const SETUP_TOUR_LS_KEY = "lb_setup_tour_state";

export default function SetupTourManager() {
  const { currentUser } = React.useContext(GlobalAppContext);
  const location = useLocation();

  const tourActiveRef = React.useRef(false); // It prevents the on mount effect from firing multiple times
  const manuallyDepartedRef = React.useRef(false); // Set to true when the route guard detects the user manually navigated away mid tour.
  const tourSteps: LBTourStep[] = React.useMemo(
    () => [
      {
        target: "a[href='/settings/']",
        title: "Head to Settings",
        content:
          "Click Settings in the sidebar to connect your music services and personalise your experience.",
        placement: "right",
        spotlightPadding: { top: 2, right: 5, left: 5, bottom: 2 },
        navigateTo: "/settings/",
        waitForSelector: "a[href='/settings/music-services/details/']",
        onBeforeShow: async () => {
          const toggler = document.querySelector<HTMLElement>(
            "button.navbar-toggler"
          );
          const sideNav = document.getElementById("side-nav");
          if (
            toggler &&
            getComputedStyle(toggler).display !== "none" &&
            sideNav &&
            !sideNav.classList.contains("show")
          ) {
            toggler.click();
            await sleep(350);
          }
        },
        hamburger: {
          target: "button.navbar-toggler",
          title: "Open the Menu",
          content:
            "Tap the menu icon to open the navigation, then tap Settings to connect your music services.",
          placement: "bottom",
          navigateTo: undefined,
          waitForSelector: false as const,
          onBeforeShow: undefined,
        },
      },
      {
        target: "a[href='/settings/music-services/details/']",
        title: "Connect Your Music",
        content:
          "Here you can link Spotify, Last.fm, Apple Music, and more, choose whichever services you use.",
        placement: "right",
        disableScrolling: true,
        navigateTo: "/settings/music-services/details/",
        waitForSelector: "#user-profile",
        onBeforeShow: async () => {
          const sideNav = document.getElementById("side-nav");
          if (sideNav?.classList.contains("show")) {
            const toggler = document.querySelector<HTMLElement>(
              "button.navbar-toggler"
            );
            if (toggler) {
              toggler.click();
              await sleep(350);
            }
          }
        },
      },
      {
        target: "#user-profile",
        title: "Connect a Service",
        content:
          "Pick a music service below and click Connect, and your listens will start flowing in automatically.",
        placement: "left-start",
        spotlightPadding: { right: 8, left: 8 },
        floatingOptions: {
          middleware: [offset({ crossAxis: 200 })],
        },
        mobile: {
          placement: "bottom",
          floatingOptions: undefined,
        },
      } as any,
      {
        target: "a[href='/add-data/']",
        title: "Submit Your Listens",
        content:
          "Click to start submitting listens automatically from your music player.",
        placement: "right",
        disableScrolling: true,
        onBeforeShow: async () => {
          const el = document.querySelector<HTMLElement>(
            "a[href='/add-data/']"
          );
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            await sleep(350);
          }
        },
      },
      {
        target: "#add-data-content",
        title: "Music Players & Tools",
        content:
          "Browse the full list of supported music players and tools to start submitting your listens automatically.",
        placement: "left-start",
        navigateTo: "/add-data/",
        floatingOptions: {
          middleware: [offset({ crossAxis: 200 })],
        },
        mobile: {
          placement: "bottom",
          floatingOptions: undefined,
        },
      },
      {
        target: ".add-listen-btn",
        title: "Add a Listen Manually",
        content:
          "While your import runs in the background, you can add a listen manually to start exploring ListenBrainz straight away.",
        placement: "bottom",
        spotlightPadding: 5,
        navigateTo: currentUser?.name
          ? `/user/${encodeURIComponent(currentUser.name)}/`
          : undefined,
      },
    ],
    [currentUser?.name]
  );

  const {
    run,
    setRun,
    stepIndex,
    steps,
    hasDeclinedResumeRef,
    persistProgress,
    startTour,
    handleTourEvent,
  } = useTour({
    tourId: "setup",
    steps: tourSteps,
    skipMountEffect: true,
    tourName: "Setup Tour",
    description:
      "Let's get you set up. We'll show you how to connect a music service, submit your listens, and explore your dashboard.",
    getStartRoute: (username, fromStep, resolvedSteps) => {
      // Scan backwards to find the nearest step that declares a route.
      for (let i = fromStep; i >= 0; i -= 1) {
        if (resolvedSteps[i]?.navigateTo) {
          return resolvedSteps[i].navigateTo!;
        }
      }
      return `/user/${encodeURIComponent(username)}/`;
    },
    onTourEnd: () => {
      tourActiveRef.current = false;
    },
  });

  // Pause the tour and reset tourActiveRef when the user manually navigates away mid tour
  // so the resume modal can re appear on the next page visit.
  React.useEffect(() => {
    if (!run) return;

    // Find the expected path for the current step by scanning backwards.
    let expectedPath: string | undefined;
    for (let i = stepIndex; i >= 0; i -= 1) {
      const nav = steps[i]?.navigateTo;
      if (nav) {
        expectedPath = nav;
        break;
      }
    }
    if (!expectedPath && currentUser?.name) {
      expectedPath = `/user/${encodeURIComponent(currentUser.name)}/`;
    }

    if (expectedPath && window.location.pathname !== expectedPath) {
      setRun(false);
      manuallyDepartedRef.current = true;
      tourActiveRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // On mount, decide whether to auto start, resume, or do nothing.
  React.useEffect(() => {
    if (!currentUser?.name) return;
    if (tourActiveRef.current) return;
    if (hasDeclinedResumeRef.current) return;

    const fetchAndDecide = async () => {
      // fetch localstorage state
      let localStatus: string | null = null;
      let localStep = 0;
      let localTimestamp = 0;
      let localDeclined = false;

      try {
        const raw = localStorage.getItem(SETUP_TOUR_LS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          localStatus = parsed.status ?? null;
          localStep = parsed.current_step ?? 0;
          localTimestamp = parsed.timestamp ?? 0;
          localDeclined = parsed.declined ?? false;
        }
      } catch (_e) {
        // ignore
      }

      // User dismissed the resume prompt, don't show it again.
      if (localDeclined) return;

      // fetch
      let serverStatus: string | null = null;
      let serverStep = 0;
      let serverTimestamp = 0;
      try {
        const res = await fetch(
          `${window.location.origin}/1/user/${encodeURIComponent(
            currentUser.name
          )}/onboarding`,
          {
            headers: {
              Authorization: `Token ${currentUser.auth_token}`,
            },
          }
        );
        if (res.ok) {
          const data = await res.json();
          const setupState = data?.setup;
          if (setupState) {
            serverStatus = setupState.status ?? null;
            serverStep = setupState.current_step ?? 0;
            serverTimestamp = setupState.timestamp ?? 0;
          }
        }
      } catch (_e) {
        // ignore
      }

      // Pick the more recently updated source
      let status: string | null;
      let step: number;
      if (serverTimestamp >= localTimestamp) {
        status = serverStatus;
        step = serverStep;
      } else {
        status = localStatus;
        step = localStep;
      }

      if (status === "completed" || status === "skipped") return;

      const isDashboard =
        currentUser.name &&
        (location.pathname ===
          `/user/${encodeURIComponent(currentUser.name)}/` ||
          location.pathname === `/user/${currentUser.name}/`);

      if (status === "in_progress" && step > 0) {
        // Auto resume without a modal only when the user is still on the correct page
        const timePassed = Date.now() - localTimestamp;

        if (timePassed < 60000 && !manuallyDepartedRef.current) {
          tourActiveRef.current = true;
          startTour(step);
          return;
        }
        manuallyDepartedRef.current = false;

        // Show resume modal
        tourActiveRef.current = true;
        NiceModal.show(TourModal, {
          mode: "resume",
          tourName: "Setup Tour",
          description:
            "You were part way through the setup tour. Would you like to continue where you left off?",
          onStartTour: () => {
            startTour(step);
          },
          onCancel: () => {
            tourActiveRef.current = false;
            hasDeclinedResumeRef.current = true;
            markTourResumeDeclined(SETUP_TOUR_LS_KEY);
          },
        });
        return;
      }

      if (!isDashboard) return;

      // Short delay so the page layout settles before the modal appears.
      await sleep(300);
      if (tourActiveRef.current) return;
      tourActiveRef.current = true;

      NiceModal.show(TourModal, {
        mode: "start",
        tourName: "Setup Tour",
        description:
          "Let's get you set up. We'll show you how to connect a music service, submit your listens, and explore your dashboard.",
        onStartTour: () => {
          startTour(0);
        },
        onCancel: () => {
          tourActiveRef.current = false;
          markTourResumeDeclined(SETUP_TOUR_LS_KEY);
          persistProgress("skipped", 0);
        },
      });
    };

    fetchAndDecide();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.name, location.pathname]);

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
