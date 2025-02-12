export const logger = {
  info: (msg: string) => {
    console.log(`[INFO] ${msg}`);
  },
  error: (msg: string) => {
    console.error(`[ERROR] ${msg}`);
  },
  debug: (msg: string) => {
    if (process.env.NODE_ENV === "development") {
      console.debug(`[DEBUG] ${msg}`);
    }
  }
};