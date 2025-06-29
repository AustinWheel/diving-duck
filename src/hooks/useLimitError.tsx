"use client";

import { useState, useCallback } from "react";
import LimitErrorDialog from "@/components/LimitErrorDialog";

interface LimitError {
  error: string;
  message: string;
  suggestion: string;
  details?: any;
}

export function useLimitError() {
  const [limitError, setLimitError] = useState<LimitError | null>(null);

  const handleApiError = useCallback(async (response: Response) => {
    // Check for limit-related status codes: 400 (config limits), 403 (hard limits), 429 (rate limits)
    if (response.status === 400 || response.status === 403 || response.status === 429) {
      try {
        // Clone the response so we can read it without consuming the original
        const clonedResponse = response.clone();
        const errorData = await clonedResponse.json();
        
        // Check if it's a limit error with our structured format
        if (errorData.message && errorData.suggestion) {
          setLimitError(errorData);
          return true;
        }
      } catch (e) {
        // Failed to parse error, ignore
        console.error("Failed to parse limit error:", e);
      }
    }
    return false;
  }, []);

  const clearError = useCallback(() => {
    setLimitError(null);
  }, []);

  const LimitErrorModal = limitError ? (
    <LimitErrorDialog error={limitError} onClose={clearError} />
  ) : null;

  return {
    handleApiError,
    clearError,
    LimitErrorModal,
    hasError: !!limitError,
  };
}