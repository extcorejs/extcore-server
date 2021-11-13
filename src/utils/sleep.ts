export const sleep = async (delay = 1000): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, delay);
  });
};
