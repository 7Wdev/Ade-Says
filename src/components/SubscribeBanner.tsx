import { memo, useCallback, useEffect, useState } from "react";
import { M3eSnackbar } from '@m3e/web/snackbar';

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
    if (!("Notification" in window)) {
      M3eSnackbar.open(
        lang === "ar" ? "\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a \u063a\u064a\u0631 \u0645\u062f\u0639\u0648\u0645\u0629 \u0641\u064a \u0647\u0630\u0627 \u0627\u0644\u0645\u062a\u0635\u0641\u062d" : "Notifications are not supported in this browser",
        true,
        { duration: 4200 },
      );
      return;
    }
    if (status === "denied" || Notification.permission === "denied") {
      setStatus("denied");
      M3eSnackbar.open(
        lang === "ar" ? "\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a \u0645\u062d\u0638\u0648\u0631\u0629 \u0641\u064a \u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u0645\u062a\u0635\u0641\u062d" : "Notifications are blocked in your browser settings",
        true,
        { duration: 4200 },
      );
      return;
    }

    setStatus("requesting");

    const performAction = async (OneSignal: typeof window.OneSignal) => {
      try {
        const actionPromise = status === "granted" 
          ? OneSignal.User.PushSubscription.optOut() 
          : OneSignal.User.PushSubscription.optIn();
          
        // Timeout after 15 seconds to prevent hanging UI
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("OneSignal timeout")), 15000)
        );

        await Promise.race([actionPromise, timeoutPromise]);

        if (status === "granted") {
          setStatus("idle");
          M3eSnackbar.open(
            lang === "ar" ? "\u062a\u0645 \u0625\u064a\u0642\u0627\u0641 \u0625\u0634\u0639\u0627\u0631\u0627\u062a \u0627\u0644\u0645\u062f\u0648\u0646\u0629" : "Blog notifications turned off",
            { duration: 2600 },
          );
        } else {
          if (Notification.permission === "granted") {
            setStatus("granted");
            M3eSnackbar.open(
              lang === "ar" ? "\u062a\u0645 \u062a\u0641\u0639\u064a\u0644 \u0625\u0634\u0639\u0627\u0631\u0627\u062a \u0627\u0644\u0645\u062f\u0648\u0646\u0629" : "Blog notifications turned on",
              { duration: 2600 },
            );
          }
        }
      } catch (error) {
        console.error('OneSignal SDK Error:', error);
        setStatus("denied");
        M3eSnackbar.open(
          lang === "ar" ? "\u062a\u0639\u0630\u0651\u0631 \u062a\u062d\u062f\u064a\u062b \u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a" : "Could not update notification settings",
          true,
          { duration: 4200 },
        );
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
      }, 15000);
    }
  }, [lang, status]);

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
        disabled={!isActionable}
        onClick={isActionable ? handleSubscribe : undefined}
        tabIndex={tabIndex}
      >
        <m3e-icon
          aria-hidden="true"
          filled
          name={status === "granted"
            ? "notifications_active"
            : status === "denied"
              ? "notifications_off"
              : "notifications"}
          slot="icon"
          variant="rounded"
        />
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
    <m3e-button
      className={`subscribe-btn${status === "denied" ? " is-denied" : ""}${status === "granted" ? " is-subscribed" : ""}`}
      disabled={status === "requesting"}
      onClick={handleSubscribe}
      shape="rounded"
      size="small"
      type="button"
      variant="tonal"
    >
      <m3e-icon
        aria-hidden="true"
        filled
        name={status === "granted"
          ? "notifications_active"
          : status === "denied"
            ? "notifications_off"
            : "notifications"}
        slot="icon"
        variant="rounded"
      />
      {status === "granted"
        ? labels.subscribed
        : status === "requesting"
          ? labels.requesting
          : status === "denied"
            ? labels.blocked
            : labels.subscribe}
    </m3e-button>
  );
}

export default memo(SubscribeButton);
