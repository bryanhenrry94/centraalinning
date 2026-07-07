export const getEmailByEnv = async (to: string) => {
  const isDev = process.env.NODE_ENV === "development";
  const devRedirect = process.env.DEV_EMAIL_REDIRECT;

  if (isDev && devRedirect) {
    console.log(`🔸 [DEV MODE] Redirecting email to: ${devRedirect}`);

    if (process.env.OWNER_EMAIL_ADDRESS) {
      console.log(
        `🔸 [DEV MODE] Also sending email to owner: ${process.env.OWNER_EMAIL_ADDRESS}`,
      );
      return [devRedirect, process.env.OWNER_EMAIL_ADDRESS];
    }

    return [devRedirect];
  }

  return [to];
};
