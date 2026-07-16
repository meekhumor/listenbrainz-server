import * as React from "react";
import { Helmet } from "react-helmet";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheck,
  faLock,
  faPlay,
  faRedo,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import GlobalAppContext, {
  OnboardingState,
} from "../../utils/GlobalAppContext";

type TourStatus = "completed" | "in_progress" | "active" | "locked";

interface TourItem {
  id: string;
  name: string;
  description: string;
  lockReason?: string;
  status: TourStatus;
}

export default function FeatureGuide() {
  const { currentUser, onboardingState: contextState } = React.useContext(
    GlobalAppContext
  );

  // Always fetch fresh state on mount so the page reflects the latest DB values
  const [freshState, setFreshState] = React.useState<
    OnboardingState | undefined
  >(contextState);
  React.useEffect(() => {
    if (!currentUser?.name || !currentUser?.auth_token) {
      return;
    }
    fetch(
      `${window.location.origin}/1/user/${encodeURIComponent(
        currentUser.name
      )}/onboarding`,
      { headers: { Authorization: `Token ${currentUser.auth_token}` } }
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setFreshState(data);
      })
      .catch(() => {});
  }, [currentUser?.name, currentUser?.auth_token]);

  const onboardingState = freshState ?? contextState;

  function getTourStatus(tourId: string): TourStatus {
    if (tourId === "setup") {
      const tour = onboardingState?.setup;
      if (tour?.status === "completed") return "completed";
      if (tour?.status === "in_progress") return "in_progress";
      return "active"; // not_started or no record
    }
    const tour = onboardingState?.[tourId];
    if (!tour) return "locked";
    if (!tour.unlock_ready) return "locked";
    if (tour.status === "completed") return "completed";
    if (tour.status === "in_progress") return "in_progress";
    return "active";
  }

  const tours: TourItem[] = [
    {
      id: "setup",
      name: "The Setup Tour",
      description:
        "Connect your music services, import your listening history, and add your first listens.",
      status: getTourStatus("setup"),
    },
    {
      id: "social",
      name: "The Social Tour",
      description:
        "Find similar users, follow friends, and pin your favourite tracks to your profile.",
      lockReason: "Follow at least one user to unlock this tour.",
      status: getTourStatus("social"),
    },
    {
      id: "listens",
      name: "The Listens Tour",
      description:
        "Learn the BrainzPlayer, set playback priority, control the queue, and discover music.",
      lockReason: "Import or add listens to unlock this tour.",
      status: getTourStatus("listens"),
    },
    {
      id: "stats",
      name: "The Stats Tour",
      description:
        "Explore your Listening Habits graph, Top Artists and Tracks, Daily Activity heatmap, and more.",
      lockReason: "Import or add listens to unlock this tour.",
      status: getTourStatus("stats"),
    },
  ];

  const dispatchTourEvent = (action: "start" | "restart" | "resume", tourId: string) => {
    window.dispatchEvent(new CustomEvent(`lb:${action}-${tourId}-tour`));
  };

  return (
    <div className="feature-guide">
      <Helmet>
        <title>Feature Guide</title>
      </Helmet>

      <h3 className="page-title">Feature Guide</h3>
      <p className="feature-guide-subtitle">
        Explore ListenBrainz one feature at a time. Tours unlock as you import
        your music and start listening.
      </p>

      <div className="feature-guide-list">
        {tours.map((tour, idx) => (
          <div key={tour.id} className={`feature-guide-item ${tour.status}`}>
            <div className="feature-guide-item-icon" aria-hidden="true">
              {tour.status === "completed" && (
                <div className="feature-guide-icon-circle completed">
                  <FontAwesomeIcon icon={faCheck} />
                </div>
              )}
              {(tour.status === "active" || tour.status === "in_progress") && (
                <div
                  className="feature-guide-icon-circle active"
                  style={{ fontWeight: 600 }}
                >
                  {idx + 1}
                </div>
              )}
              {tour.status === "locked" && (
                <div className="feature-guide-icon-circle locked">
                  <FontAwesomeIcon icon={faLock} />
                </div>
              )}
            </div>

            <div className="feature-guide-item-content">
              <h5 className="feature-guide-item-name">{tour.name}</h5>
              <p className="feature-guide-item-desc">
                {tour.status === "locked" && tour.lockReason
                  ? tour.lockReason
                  : tour.description}
              </p>
            </div>

            <div className="feature-guide-item-action">
              {tour.status === "completed" && (
                <button
                  type="button"
                  className="feature-guide-btn restart"
                  onClick={() => dispatchTourEvent("restart", tour.id)}
                  id={`restart-tour-${tour.id}`}
                  aria-label={`Restart ${tour.name}`}
                >
                  <FontAwesomeIcon icon={faRedo} />
                  <span>Restart</span>
                </button>
              )}
              {tour.status === "in_progress" && (
                <button
                  type="button"
                  className="feature-guide-btn resume"
                  onClick={() => dispatchTourEvent("resume", tour.id)}
                  id={`resume-tour-${tour.id}`}
                  aria-label={`Resume ${tour.name}`}
                >
                  <FontAwesomeIcon icon={faPlay} />
                  <span>Resume</span>
                </button>
              )}
              {tour.status === "active" && (
                <button
                  type="button"
                  className="feature-guide-btn start"
                  onClick={() => dispatchTourEvent("start", tour.id)}
                  id={`start-tour-${tour.id}`}
                  aria-label={`Start ${tour.name}`}
                >
                  <FontAwesomeIcon icon={faPlay} />
                  <span>Start</span>
                </button>
              )}
              {tour.status === "locked" && (
                <div className="feature-guide-chevron" aria-hidden="true">
                  <FontAwesomeIcon icon={faChevronRight} />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
