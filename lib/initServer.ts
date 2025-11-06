// Solo ejecutamos el scheduler en el servidor
if (typeof window === "undefined") {
  if (process.env.NODE_ENV === "production") {
    import("./scheduler").then(({ startJobScheduler }) => {
      startJobScheduler();
    });
  } else {
    console.log("⚠️ Scheduler disabled in development mode");
  }
}
