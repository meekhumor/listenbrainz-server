import * as React from "react";
import NiceModal, { useModal } from "@ebay/nice-modal-react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons";

type TourModalProps = {
  tourName: string;
  description?: string;
  mode?: "start" | "resume";
  onStartTour: () => void;
  onCancel?: () => void;
};

const TourModal = NiceModal.create(
  ({
    tourName,
    description,
    mode = "start",
    onStartTour,
    onCancel,
  }: TourModalProps) => {
    const modal = useModal();
    const isResume = mode === "resume";

    const handleSkip = () => {
      modal.remove();
      if (onCancel) onCancel();
    };

    const handleAction = () => {
      modal.remove();
      setTimeout(onStartTour, 200);
    };

    return (
      <div
        className="tour-modal-backdrop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-modal-title"
      >
        <div className="tour-modal-card">
          <button
            type="button"
            className="tour-modal-close"
            onClick={handleSkip}
            aria-label="Close"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>

          <h2 id="tour-modal-title" className="tour-modal-title">
            {isResume
              ? `Resume ${tourName}${
                  tourName.toLowerCase().endsWith("tour") ? "" : " Tour"
                }`
              : tourName}
          </h2>
          <p className="tour-modal-subtitle">
            {isResume
              ? `It looks like you were in the middle of the ${tourName} tour. Would you like to pick up where you left off?`
              : description}
          </p>

          <div className="tour-modal-actions">
            <button
              type="button"
              id="tour-skip-btn"
              className="tour-modal-btn outline"
              onClick={handleSkip}
            >
              {isResume ? "Maybe later" : "Skip tour"}
            </button>
            <button
              type="button"
              id="tour-start-btn"
              className="tour-modal-btn primary"
              onClick={handleAction}
            >
              {isResume ? "Continue tour" : "Show me around"}
            </button>
          </div>
        </div>
      </div>
    );
  }
);

export default TourModal;
