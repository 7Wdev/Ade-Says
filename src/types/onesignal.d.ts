export {};

declare global {
  interface Window {
    OneSignalDeferred: Array<(OneSignal: any) => void | Promise<void>>;
    OneSignal: any;
  }
}
