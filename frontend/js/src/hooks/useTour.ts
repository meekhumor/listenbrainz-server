import * as React from "react";
import {
  Step,
  EventData,
  STATUS,
  EVENTS,
  ACTIONS,
  ButtonType,
} from "react-joyride";
import { useNavigate } from "react-router";
import NiceModal from "@ebay/nice-modal-react";
import GlobalAppContext, {
  OnboardingTourState,
} from "../utils/GlobalAppContext";
import useViewportBreakpoints, {
  isHamburger,
  isMobile,
} from "./useViewportBreakpoints";
import { waitForElement } from "../utils/waitForElement";
import TourModal from "../components/tours/TourModal";

export type LBTourStep = Step & {
  hidePlayer?: boolean; // Hide brainzplayer during this step.
  disableScrolling?: boolean; // Disable page scrolling while this step is active.
  navigateTo?: string; // Route to navigate to before this step is shown.
  waitForSelector?: string | false; // Selector to wait for after navigating. Defaults to step.target
  onBeforeShow?: () => Promise<void>; // Runs before this step is shown (e.g. to open a dropdown).
  mobile?: Partial<Omit<LBTourStep, "mobile" | "hamburger">>; // Overrides to apply on mobile viewports.
  hamburger?: Partial<Omit<LBTourStep, "mobile" | "hamburger">>; // Changes to apply in steps on hamburger viewport.
};

export interface TourHookConfig {
  tourId: string;
  steps: LBTourStep[]; // Tour steps
  tourName: string;
  description: string;
  getStartRoute?: (
    // Route to navigate to before starting or resuming the tour.
    username: string,
    fromStep: number,
    resolvedSteps: LBTourStep[]
  ) => string | null;
  getStartSelector?: (
    // Selector to wait for before starting or resuming the tour.
    fromStep: number,
    resolvedSteps: LBTourStep[]
  ) => string | undefined;
  onTourEnd?: () => void; // Called when tour ends (finished, skipped or closed)
  skipMountEffect?: boolean; // Disable automatic start/resume on hook mount.
}

export interface TourHookReturn {
  run: boolean; // Whether the tour is currently running.
  setRun: React.Dispatch<React.SetStateAction<boolean>>; // Control whether the tour is running.
  stepIndex: number; // The current step index.
  setStepIndex: React.Dispatch<React.SetStateAction<number>>; // Update the current step index.
  steps: LBTourStep[];
  hasDeclinedResumeRef: React.MutableRefObject<boolean>; // Ref tracking whether user declined to resume the tour.
  persistProgress: (status: string, step: number) => Promise<void>; // Save tour status to localStorage/API.

  startTour: (fromStep?: number) => Promise<void>;
  handleTourEvent: (data: EventData) => Promise<void>; // Handler for react-joyride tour events.
  handleTourTerminal: (data: EventData) => Promise<boolean>; // Handler for terminal events (finished/skipped).
}

export const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

export const SETTLE_DELAY_MS = 200; // Extra delay after 'waitforElement' so joyride measures tooltip positions correctly.

export const JOYRIDE_OPTIONS = {
  overlayColor: "rgba(0, 0, 0, 0.72)",
  primaryColor: "#eb743b",
  zIndex: 1002,
  spotlightPadding: 6,
  spotlightRadius: 6,
  skipBeacon: true,
  skipScroll: false,
  disableFocusTrap: false,
  buttons: ["skip", "back", "primary"] as ButtonType[],
};

export const FLOATING_OPTIONS = {
  flipOptions: {
    fallbackPlacements: ["top", "bottom", "right", "left"] as any,
  },
};

export function resolveStepsForViewport(
  steps: LBTourStep[],
  isMobileViewport = isMobile(),
  isHamburgerViewport = isHamburger()
): LBTourStep[] {
  return steps.reduce<LBTourStep[]>((acc, step) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { hamburger, mobile, ...baseFields } = step;

    if (isHamburgerViewport && hamburger) {
      // Insert the hamburger step (spotlight the menu toggle button)
      acc.push({ ...baseFields, ...hamburger } as LBTourStep);
      acc.push({
        ...baseFields,
        navigateTo: undefined,
        waitForSelector: undefined,
      } as LBTourStep);
      return acc;
    }

    let resolvedStep: LBTourStep = { ...baseFields };
    if (isMobileViewport && mobile) {
      resolvedStep = { ...resolvedStep, ...mobile } as LBTourStep;
    }
    acc.push(resolvedStep);
    return acc;
  }, []);
}

// Saves the user's tour resume decline preference (clicking "Maybe later") to localstorage so the resume modal is not shown again and again.
export const markTourResumeDeclined = (key: string, defaultStep = 0) => {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      localStorage.setItem(
        key,
        JSON.stringify({
          status: "in_progress",
          current_step: parsed.current_step ?? defaultStep,
          timestamp: parsed.timestamp ?? Date.now(),
          declined: true,
        })
      );
    }
  } catch (_e) {
    // ignore
  }
};

export function useTour(config: TourHookConfig): TourHookReturn {
  const {
    tourId,
    steps: rawSteps,
    tourName,
    description,
    getStartRoute,
    getStartSelector,
    skipMountEffect = false,
  } = config;

  const lsKey = `lb_${tourId}_tour_state`; // localstorage key

  const { currentUser, onboardingState } = React.useContext(GlobalAppContext);
  const navigate = useNavigate();

  const [run, setRun] = React.useState(false);
  const [stepIndex, setStepIndex] = React.useState(0);
  const hasDeclinedResumeRef = React.useRef(false);

  const {
    isMobile: isMobileVP,
    isHamburger: isHamburgerVP,
  } = useViewportBreakpoints();

  // Tour steps resolve when viewport changes.
  const steps = React.useMemo(
    () => resolveStepsForViewport(rawSteps, isMobileVP, isHamburgerVP),
    [isMobileVP, isHamburgerVP]
  );

  // Hide the brainzplayer on all steps by default when tour is active, unless explicitly disabled.
  React.useEffect(() => {
    const shouldHidePlayer = run && steps[stepIndex]?.hidePlayer !== false;
    if (shouldHidePlayer) {
      document.body.classList.add("tour-active-hide-player");
    } else {
      document.body.classList.remove("tour-active-hide-player");
    }
    return () => {
      document.body.classList.remove("tour-active-hide-player");
    };
  }, [run, stepIndex, steps]);

  // Disable page scroll on steps that set disableScrolling: true.
  React.useEffect(() => {
    if (run && steps[stepIndex]?.disableScrolling) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [run, stepIndex, steps]);

  // Persists tour progress to localStorage and the /onboarding API.
  const persistProgress = React.useCallback(
    async (status: string, step: number) => {
      try {
        localStorage.setItem(
          lsKey,
          JSON.stringify({ status, current_step: step, timestamp: Date.now() })
        );
      } catch (_e) {
        // ignore
      }
      if (!currentUser?.name || !currentUser?.auth_token) return;
      try {
        await fetch(
          `${window.location.origin}/1/user/${encodeURIComponent(
            currentUser.name
          )}/onboarding`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Token ${currentUser.auth_token}`,
            },
            body: JSON.stringify({
              tour_id: tourId,
              status,
              current_step: step,
            }),
          }
        );
      } catch (_err) {
        // ignore
      }
    },
    [currentUser, lsKey, tourId]
  );

  const startTour = React.useCallback(
    async (fromStep = 0) => {
      if (!currentUser?.name) return;

      persistProgress("in_progress", fromStep);
      const resolvedSteps = resolveStepsForViewport(
        rawSteps,
        isMobileVP,
        isHamburgerVP
      );
      let targetRoute: string | null = null;
      if (getStartRoute) {
        targetRoute = getStartRoute(currentUser.name, fromStep, resolvedSteps);
      } else {
        // Search backwards from the step to find the nearest navigateTo route
        for (let i = fromStep; i >= 0; i -= 1) {
          if (resolvedSteps[i]?.navigateTo) {
            targetRoute = resolvedSteps[i].navigateTo ?? null;
            break;
          }
        }
      }

      const needsNavigation =
        targetRoute && window.location.pathname !== targetRoute;

      if (needsNavigation) {
        setRun(false);
        navigate(targetRoute!);
        await sleep(300);
      }

      const selector =
        getStartSelector?.(fromStep, resolvedSteps) ??
        (resolvedSteps[fromStep]?.target as string | undefined);

      if (selector && selector !== "body") {
        try {
          await waitForElement(selector, 5000);
        } catch (_e) {
          // continue
        }
      }

      const startingStep = resolvedSteps[fromStep];
      if (startingStep?.onBeforeShow) {
        await startingStep.onBeforeShow();
      }

      await sleep(SETTLE_DELAY_MS);
      setStepIndex(fromStep);
      setRun(true);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      currentUser?.name,
      navigate,
      persistProgress,
      getStartRoute,
      getStartSelector,
      isMobileVP,
      isHamburgerVP,
      rawSteps,
    ]
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    if (skipMountEffect || !currentUser?.name || hasDeclinedResumeRef.current)
      return;

    let handled = false;

    try {
      const raw = localStorage.getItem(lsKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.declined === true) {
          handled = true;
        } else if (parsed.status === "in_progress") {
          // Auto resume without a modal if the session is less than 60s.
          const timePassed = Date.now() - (parsed.timestamp ?? 0);
          if (timePassed < 60000) {
            startTour(parsed.current_step ?? 0);
          } else {
            NiceModal.show(TourModal, {
              mode: "resume",
              tourName,
              onCancel: () => {
                hasDeclinedResumeRef.current = true;
                markTourResumeDeclined(lsKey, parsed.current_step ?? 0);
              },
              onStartTour: () => startTour(parsed.current_step ?? 0),
            });
          }
          handled = true;
        } else if (
          parsed.status === "completed" ||
          parsed.status === "skipped"
        ) {
          handled = true;
        }
      }
    } catch (_e) {
      // continue
    }

    // Fall back to server side state from context.
    if (!handled) {
      const state = onboardingState?.[tourId];
      if (state?.status === "in_progress") {
        NiceModal.show(TourModal, {
          mode: "resume",
          tourName,
          onCancel: () => {
            hasDeclinedResumeRef.current = true;
            markTourResumeDeclined(lsKey, state.current_step ?? 0);
          },
          onStartTour: () => startTour(state.current_step ?? 0),
        });
      }
    }
  }, [currentUser?.name]);

  // Feature Guide event listeners
  React.useEffect(() => {
    const handleStart = () => {
      hasDeclinedResumeRef.current = false;
      NiceModal.show(TourModal, {
        tourName,
        description,
        mode: "start",
        onStartTour: () => startTour(0),
      });
    };
    const handleRestart = () => {
      hasDeclinedResumeRef.current = false;
      startTour(0);
    };
    const handleResume = () => {
      hasDeclinedResumeRef.current = false;
      let resumeStep = 0;
      try {
        const raw = localStorage.getItem(lsKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          resumeStep = parsed.current_step ?? 0;
        }
      } catch (_e) {
        // ignore
      }
      startTour(resumeStep);
    };

    window.addEventListener(`lb:start-${tourId}-tour`, handleStart);
    window.addEventListener(`lb:restart-${tourId}-tour`, handleRestart);
    window.addEventListener(`lb:resume-${tourId}-tour`, handleResume);
    return () => {
      window.removeEventListener(`lb:start-${tourId}-tour`, handleStart);
      window.removeEventListener(`lb:restart-${tourId}-tour`, handleRestart);
      window.removeEventListener(`lb:resume-${tourId}-tour`, handleResume);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startTour, tourId]);

  // per tour progression
  const handleTourTerminal = React.useCallback(
    async (data: EventData): Promise<boolean> => {
      const { action, type, status } = data;
      if (
        status === STATUS.FINISHED ||
        status === STATUS.SKIPPED ||
        type === EVENTS.TOUR_END ||
        action === ACTIONS.CLOSE
      ) {
        const finalStatus =
          status === STATUS.SKIPPED || action === ACTIONS.SKIP
            ? "skipped"
            : "completed";

        await persistProgress(finalStatus, rawSteps.length);
        setRun(false);
        config.onTourEnd?.();
        return true;
      }
      return false;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [persistProgress, rawSteps.length]
  );

  // per step progression.
  const handleTourEvent = React.useCallback(
    async (data: EventData) => {
      if (await handleTourTerminal(data)) return;

      const { action, index, type } = data;
      if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
        if (action === ACTIONS.NEXT) {
          const nextIndex = index + 1;
          persistProgress("in_progress", nextIndex);

          if (nextIndex < steps.length) {
            const nextStep = steps[nextIndex];
            const needsNav = !!(
              nextStep.navigateTo &&
              window.location.pathname !== nextStep.navigateTo
            );
            const needsEffect = !!nextStep.onBeforeShow;

            if (needsNav || needsEffect) setRun(false);
            if (needsNav) navigate(nextStep.navigateTo!);

            const selectorToWait = nextStep.waitForSelector;
            if (selectorToWait !== false) {
              const selector =
                selectorToWait ?? (nextStep.target as string | undefined);
              if (selector && selector !== "body") {
                try {
                  await waitForElement(selector, 5000);
                } catch (_e) {
                  // continue
                }
              }
            }

            if (needsEffect) await nextStep.onBeforeShow!();

            await sleep(SETTLE_DELAY_MS);
            setStepIndex(nextIndex);
            setRun(true);
          }
        } else if (action === ACTIONS.PREV) {
          const prevIndex = index - 1;
          if (prevIndex >= 0) {
            const prevStep = steps[prevIndex];
            const needsNav = !!(
              prevStep.navigateTo &&
              window.location.pathname !== prevStep.navigateTo
            );
            if (needsNav) {
              setRun(false);
              navigate(prevStep.navigateTo!);
              await sleep(300);
              const selectorToWait = prevStep.waitForSelector;
              if (selectorToWait !== false) {
                const selector =
                  selectorToWait ?? (prevStep.target as string | undefined);
                if (selector && selector !== "body") {
                  try {
                    await waitForElement(selector, 5000);
                  } catch (_e) {
                    // continue
                  }
                }
              }
              await sleep(SETTLE_DELAY_MS);
              setStepIndex(prevIndex);
              setRun(true);
            } else {
              setStepIndex(prevIndex);
            }
          }
        }
      }
    },
    [handleTourTerminal, persistProgress, navigate, setRun, setStepIndex, steps]
  );

  return {
    run,
    setRun,
    stepIndex,
    setStepIndex,
    steps,
    hasDeclinedResumeRef,
    persistProgress,
    startTour,
    handleTourEvent,
    handleTourTerminal,
  };
}
