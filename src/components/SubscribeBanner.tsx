import { memo, useCallback, useEffect, useState } from "react";

type SubscribeButtonProps = {
  tabIndex?: number;
  variant?: "button" | "fab-item";
  lang?: "en" | "ar";
};

function SubscribeButton({
  tabIndex,
  variant = "button",
  lang = "en",
}: SubscribeButtonProps) {
  const [status, setStatus] = useState<
    "idle" | "requesting" | "granted" | "denied"
  >(() => {
    if (typeof window === "undefined" || !("Notification" in window))
      return "idle";
    if (Notification.permission === "denied") return "denied";
    if (Notification.permission === "granted") return "granted";
    return "idle";
  });

  // Connect to OneSignal SDK for true state
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    window.OneSignalDeferred.push((OneSignal) => {
      // Check initial opt-in status
      if (OneSignal.User?.PushSubscription?.optedIn) {
        setStatus("granted");
      }

      // Listen for subscription changes
      OneSignal.User?.PushSubscription?.addEventListener(
        "change",
        (event: { current: { optedIn: boolean } }) => {
          if (event.current.optedIn) {
            setStatus("granted");
          } else {
            setStatus("idle"); // They unsubscribed
          }
        },
      );
    });
  }, []);

  const handleSubscribe = useCallback(async () => {
    if (!("Notification" in window)) return;
    if (status === "denied" || Notification.permission === "denied") {
      setStatus("denied");
      return;
    }

    setStatus("requesting");

    const performAction = async (OneSignal: typeof window.OneSignal) => {
      try {
        const actionPromise = status === "granted" 
          ? OneSignal.User.PushSubscription.optOut() 
          : OneSignal.User.PushSubscription.optIn();
          
        // Timeout after 5 seconds to prevent hanging UI
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("OneSignal timeout")), 5000)
        );

        await Promise.race([actionPromise, timeoutPromise]);

        if (status === "granted") {
          setStatus("idle");
        } else {
          if (Notification.permission === "granted") {
            setStatus("granted");
          }
        }
      } catch (error) {
        console.error('OneSignal SDK Error:', error);
        setStatus("denied");
      }
    };

    if (window.OneSignal && window.OneSignal.User) {
      // If OneSignal is already initialized, call it immediately to prevent hanging
      performAction(window.OneSignal);
    } else {
      window.OneSignalDeferred.push(performAction);
      
      // Also add a fallback timeout in case the SDK is blocked by an adblocker
      // and never processes the deferred array.
      setTimeout(() => {
        setStatus((current) => current === "requesting" ? "denied" : current);
      }, 5000);
    }
  }, [status]);

  const isAr = lang === "ar";
  
  const labels = {
    subscribe: isAr ? "اشتراك" : "Subscribe",
    subscribed: isAr ? "مشترك" : "Subscribed",
    unsubscribe: isAr ? "إلغاء الاشتراك" : "Unsubscribe",
    requesting: isAr ? "جاري الطلب..." : "Requesting…",
    blocked: isAr ? "محظور" : "Blocked",
  };

  if (variant === "fab-item") {
    const isActionable = status === "idle" || status === "granted";

    return (
      <m3e-fab-menu-item
        aria-disabled={!isActionable ? "true" : "false"}
        className={`article-share-menu-item is-subscribe${!isActionable ? " is-disabled" : ""}`}
        onClick={isActionable ? handleSubscribe : undefined}
        tabIndex={tabIndex}
      >
        <span
          className="material-symbols-rounded"
          aria-hidden="true"
          slot="icon"
        >
          {status === "granted"
            ? "notifications_active"
            : status === "denied"
              ? "notifications_off"
              : "notifications"}
        </span>
        {status === "granted"
          ? labels.unsubscribe
          : status === "requesting"
            ? labels.requesting
            : status === "denied"
              ? labels.blocked
              : labels.subscribe}
      </m3e-fab-menu-item>
    );
  }

  return (
    <button
      className={`subscribe-btn${status === "denied" ? " is-denied" : ""}${status === "granted" ? " is-subscribed" : ""}`}
      disabled={status === "requesting"}
      onClick={handleSubscribe}
      type="button"
    >
      <span className="material-symbols-rounded" aria-hidden="true">
        {status === "granted"
          ? "notifications_active"
          : status === "denied"
            ? "notifications_off"
            : "notifications"}
      </span>
      {status === "granted"
        ? labels.subscribed
        : status === "requesting"
          ? labels.requesting
          : status === "denied"
            ? labels.blocked
            : labels.subscribe}
    </button>
  );
}

export default memo(SubscribeButton);
