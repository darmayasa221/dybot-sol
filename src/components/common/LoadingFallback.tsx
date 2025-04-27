import React, { useState, useEffect } from "react";
import { motion } from "motion/react";

interface LoadingStep {
  id: string;
  label: string;
  status: "pending" | "loading" | "complete" | "error";
  progress?: number;
  error?: string;
}

interface LoadingFallbackProps {
  title?: string;
  subtitle?: string;
  logo?: string;
  onRetry?: () => void;
}

const LoadingFallback: React.FC<LoadingFallbackProps> = ({
  title = "Bot Of Budju",
  subtitle = "Loading services...",
  logo,
  onRetry,
}) => {
  // Simulated loading steps
  const [steps, setSteps] = useState<LoadingStep[]>([
    { id: "core", label: "Core Services", status: "pending" },
    { id: "solana", label: "Solana Connection", status: "pending" },
    { id: "wallet", label: "Wallet Services", status: "pending" },
    { id: "token", label: "Token Services", status: "pending" },
  ]);

  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Simulate loading progress
  useEffect(() => {
    if (currentStep >= steps.length) return;

    // Mark current step as loading
    setSteps((prevSteps) => {
      const newSteps = [...prevSteps];
      if (newSteps[currentStep]) {
        newSteps[currentStep] = {
          ...newSteps[currentStep],
          status: "loading",
          progress: 0,
        };
      }
      return newSteps;
    });

    // Simulate progress for current step
    const progressInterval = setInterval(() => {
      setSteps((prevSteps) => {
        const newSteps = [...prevSteps];
        if (
          newSteps[currentStep] &&
          newSteps[currentStep].status === "loading"
        ) {
          const currentProgress = newSteps[currentStep].progress || 0;
          const newProgress = Math.min(
            currentProgress + Math.random() * 15,
            100
          );
          newSteps[currentStep] = {
            ...newSteps[currentStep],
            progress: newProgress,
          };

          // Update overall progress
          const totalProgress =
            newSteps.reduce((acc, step, index) => {
              if (index < currentStep) {
                return acc + 100; // Completed steps count as 100%
              } else if (index === currentStep) {
                return acc + (step.progress || 0); // Current step's progress
              }
              return acc; // Future steps don't count yet
            }, 0) / steps.length;

          setProgress(totalProgress);

          // If step is complete, move to next step
          if (newProgress >= 100) {
            newSteps[currentStep].status = "complete";

            // Randomly simulate an error (for demonstration purposes)
            if (Math.random() < 0.05 && !error) {
              setError("Simulated connection error. Please try again.");
              newSteps[currentStep].status = "error";
              newSteps[currentStep].error = "Connection failed";
              clearInterval(progressInterval);
              return newSteps;
            }

            // Move to next step after a short delay
            setTimeout(() => {
              setCurrentStep((prevStep) => prevStep + 1);
            }, 300);

            clearInterval(progressInterval);
          }
        }
        return newSteps;
      });
    }, 100);

    return () => clearInterval(progressInterval);
  }, [currentStep, steps.length, error]);

  // Function to retry loading
  const handleRetry = () => {
    setError(null);

    // Reset failed steps
    setSteps((prevSteps) => {
      return prevSteps.map((step) =>
        step.status === "error"
          ? { ...step, status: "pending", error: undefined }
          : step
      );
    });

    // Set current step to the first failed step
    const firstFailedStep = steps.findIndex((step) => step.status === "error");
    setCurrentStep(firstFailedStep >= 0 ? firstFailedStep : 0);

    // Call onRetry handler if provided
    if (onRetry) {
      onRetry();
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-gray-900 text-white z-50">
      <div className="w-full max-w-md p-6">
        {/* Logo and Title */}
        <div className="flex flex-col items-center mb-8">
          {logo ? (
            <img src={logo} alt="App Logo" className="h-16 mb-4" />
          ) : (
            <div className="h-16 w-16 mb-4 rounded-full bg-blue-600 flex items-center justify-center">
              <span className="text-xl font-bold">BOB</span>
            </div>
          )}
          <h1 className="text-2xl font-bold text-center">{title}</h1>
          <p className="text-gray-400 mt-2">{subtitle}</p>
        </div>

        {/* Overall Progress Bar */}
        <div className="w-full bg-gray-700 rounded-full h-2 mb-6 overflow-hidden">
          <motion.div
            className="bg-blue-600 h-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Steps */}
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={step.id} className="space-y-1">
              <div className="flex items-center">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 ${
                    step.status === "complete"
                      ? "bg-green-600"
                      : step.status === "loading"
                      ? "bg-blue-600"
                      : step.status === "error"
                      ? "bg-red-600"
                      : "bg-gray-700"
                  }`}
                >
                  {step.status === "complete" ? (
                    <CheckIcon />
                  ) : step.status === "error" ? (
                    <ErrorIcon />
                  ) : index === currentStep ? (
                    <LoadingDotIcon />
                  ) : (
                    <span className="text-xs">{index + 1}</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <span className="font-medium">{step.label}</span>
                    {step.status === "pending" && (
                      <span className="text-gray-500 text-sm">Waiting</span>
                    )}
                    {step.status === "loading" && (
                      <span className="text-blue-400 text-sm">Loading</span>
                    )}
                    {step.status === "complete" && (
                      <span className="text-green-400 text-sm">Complete</span>
                    )}
                    {step.status === "error" && (
                      <span className="text-red-400 text-sm">Failed</span>
                    )}
                  </div>

                  {/* Step Progress Bar */}
                  {step.status === "loading" && (
                    <div className="w-full bg-gray-700 rounded-full h-1 mt-1">
                      <motion.div
                        className="bg-blue-600 h-full rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${step.progress}%` }}
                        transition={{ duration: 0.2 }}
                      />
                    </div>
                  )}

                  {/* Error Message */}
                  {step.status === "error" && step.error && (
                    <div className="mt-1 text-sm text-red-400">
                      {step.error}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Error Display and Retry Button */}
        {error && (
          <motion.div
            className="mt-6 p-4 bg-red-900 bg-opacity-30 border border-red-700 rounded-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-red-300 mb-3">{error}</p>
            <motion.button
              className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg w-full"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleRetry}
            >
              Try Again
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// SVG Icons
const CheckIcon = () => (
  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
    <path
      fillRule="evenodd"
      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
      clipRule="evenodd"
    />
  </svg>
);

const ErrorIcon = () => (
  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
    <path
      fillRule="evenodd"
      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
      clipRule="evenodd"
    />
  </svg>
);

const LoadingDotIcon = () => (
  <span className="flex h-3 w-3">
    <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-white opacity-75"></span>
    <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
  </span>
);

export default LoadingFallback;
