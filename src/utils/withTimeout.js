/**
 * @template T
 * @param {Promise<T>} promise
 * @param {number} ms
 * @param {string} [message]
 * @returns {Promise<T>}
 */
export function withTimeout(promise, ms, message = "Request timed out") {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(message));
    }, ms);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}
