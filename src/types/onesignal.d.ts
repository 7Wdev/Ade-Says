export {};

type OneSignalSubscriptionChangeEvent = {
  current: {
    optedIn: boolean;
  };
};

type OneSignalPushSubscription = {
  optedIn: boolean;
  addEventListener: (
    eventName: "change",
    listener: (event: OneSignalSubscriptionChangeEvent) => void,
  ) => void;
  optIn: () => Promise<void>;
  optOut: () => Promise<void>;
};

type OneSignalSdk = {
  init: (options: {
    appId: string;
    notifyButton: {
      enable: boolean;
    };
    safari_web_id: string;
  }) => Promise<void>;
  User: {
    PushSubscription: OneSignalPushSubscription;
  };
};

declare global {
  interface Window {
    OneSignalDeferred: Array<(OneSignal: OneSignalSdk) => void | Promise<void>>;
    OneSignal: OneSignalSdk;
  }
}
