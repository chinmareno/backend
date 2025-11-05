const delay = (ms: number, value: number) =>
  new Promise<number>((resolve) => {
    console.log(`promise${value} already running waiting for ${ms}ms`);
    setTimeout(() => resolve(value), ms);
  });

export const test = () => {
  async function sequentialTest() {
    console.log("Starting sequential test...");
    const result1 = await delay(5000, 1);
    console.log("Result 1:", result1);
    const result2 = await delay(5000, 2);
    console.log("Result 2:", result2);
    const result3 = await delay(5000, 3);
    console.log("Result 3:", result3);
    console.log("Sequential test done");
  }

  async function parallelTest() {
    console.log("Starting parallel test...");
    const promises = [delay(8000, 1), delay(5000, 2), delay(7000, 3)];
    const results = await Promise.all(promises);
    results.forEach((r, i) => console.log(`Result ${i + 1}:`, r));
    console.log("Parallel test done");
  }

  // Run sequential first, then parallel
  (async () => {
    await sequentialTest();
    await parallelTest();
  })();
};
