export const useGetSignTokenAndUserId = () => {
  // TODO: Implement
  const signToken = {
    userId: "9ef6eeed-b33f-4d1a-978c-f0062070bee8",
    token: "token",
  };

  return { signToken, jwt: signToken.token, userId: signToken?.userId };
};
