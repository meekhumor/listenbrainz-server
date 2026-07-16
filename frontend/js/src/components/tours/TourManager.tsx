import * as React from "react";
import { TooltipRenderProps } from "react-joyride";
import SetupTourManager from "./SetupTourManager";
import ListensTourManager from "./ListensTourManager";
import SocialTourManager from "./SocialTourManager";
import StatsTourManager from "./StatsTourManager";

export {
  LBTourStep,
  TourHookConfig,
  TourHookReturn,
  sleep,
  SETTLE_DELAY_MS,
  JOYRIDE_OPTIONS,
  FLOATING_OPTIONS,
  resolveStepsForViewport,
  markTourResumeDeclined,
  useTour,
} from "../../hooks/useTour";

export {
  HAMBURGER_BREAKPOINT,
  MOBILE_BREAKPOINT,
  isHamburger,
  isMobile,
  default as useViewportBreakpoints,
} from "../../hooks/useViewportBreakpoints";

export function TourTooltip({
  backProps,
  closeProps,
  index,
  isLastStep,
  primaryProps,
  skipProps,
  step,
  tooltipProps,
  size,
}: TooltipRenderProps & { size: number }) {
  return (
    <div className="lb-tour-card" {...tooltipProps}>
      <div className="lb-tour-card-meta">
        <span className="lb-tour-card-step">
          Step {index + 1} of {size}
        </span>
        <button
          type="button"
          className="lb-tour-card-skip"
          {...skipProps}
          id={`tour-skip-step-${index}`}
        >
          Skip tour
        </button>
      </div>

      <div className="lb-tour-card-body">
        {step.title && (
          <h4 className="lb-tour-card-title">
            {step.title as React.ReactNode}
          </h4>
        )}
        <div className="lb-tour-card-content">{step.content}</div>
      </div>

      <div className="lb-tour-card-footer">
        {index > 0 && (
          <button
            type="button"
            className="lb-tour-card-back"
            {...backProps}
            id={`tour-back-step-${index}`}
          >
            Back
          </button>
        )}
        <button
          type="button"
          className="lb-tour-card-next"
          {...(isLastStep ? closeProps : primaryProps)}
          id={`tour-next-step-${index}`}
        >
          {isLastStep ? "Done" : "Next"}
        </button>
      </div>
    </div>
  );
}

export default function TourManager() {
  return (
    <>
      <SetupTourManager />
      <ListensTourManager />
      <SocialTourManager />
      <StatsTourManager />
    </>
  );
}
