import { useEffect } from "react";
import { useToast } from "../context/ToastContext";

/** Fixed-position toasts when feedback strings update. */
export function useAnnounceFeedback({ error, info, success } = {}) {
  const { showToast } = useToast();

  useEffect(() => {
    if (error) showToast("error", error);
  }, [error, showToast]);

  useEffect(() => {
    if (info) showToast("info", info);
  }, [info, showToast]);

  useEffect(() => {
    if (success) showToast("success", success);
  }, [success, showToast]);
}
