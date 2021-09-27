// Shim Promise.any() which is not yet available in react native
import any from 'promise.any';
import { NODE_CHOOSER_TIMEOUT_MS } from '@/utils/constants';

any.shim();

/**
 * Returns a promise that
 *  -> Resolves with the baseUrl that is providing the fastest response
 *  -> Rejects if no url is providing a valid answer in time
 * @param nodeUrls String array of baseUrls
 */
const chooseNode = async (nodeUrls: Array<string>) => {
  const promises: Array<Promise<string>> = [];

  // add timeout promise to limit waiting time
  promises.push(
    new Promise((resolve) => {
      setTimeout(resolve, NODE_CHOOSER_TIMEOUT_MS, 'TIMEOUT');
    }),
  );

  // create validation promise for each candidate
  for (const baseUrl of nodeUrls) {
    promises.push(validateNode(baseUrl));
  }

  // Wait for the first promise to resolve with Promise.any()
  // @ts-ignore: Property 'any' does not exist on type 'PromiseConstructor'
  const winner: string = await Promise.any(promises);

  return new Promise<string>((resolve, reject) => {
    if (winner === 'TIMEOUT') {
      // no node responded within my time limit
      return reject(new Error('No node responded in time'));
    } else {
      console.log(`Nodechooser: Fastest node is ${winner}.`);
      return resolve(winner);
    }
  });
};

/*
 */
const validateNode = async (baseUrl: string) => {
  const start = Date.now();
  await validateAPI(baseUrl);
  await validateProfileService(baseUrl);
  const elapsed = Date.now() - start;
  console.log(
    `Nodechooser: Node ${baseUrl} passed all tests after ${elapsed}ms`,
  );
  return baseUrl;
};

/**
 *   Check if the provided Url points to a working BrightID profile service.
 *   Get the response from /brightid/profile/list endpoint and check
 *   if the reply makes sense.
 * @param baseUrl
 */
const validateProfileService = (baseUrl: string) =>
  new Promise<string>((resolve, reject) => {
    // fetch a random channel. Response should be an empty array
    fetch(`${baseUrl}/profile/list/abc123`)
      .then((response) => {
        // network request was okay, now check server response on http level
        if (!response.ok) {
          console.log(
            `Nodechooser profile service: Invalid http response from ${baseUrl}: ${response.status} ${response.statusText}`,
          );
          reject(new Error('Profile Response not ok'));
        } else {
          // Response is fine on http level. Now see if the content is also fine.
          return response.json(); // will throw if response body is not JSON
        }
      })
      .then((json) => {
        // Body contains JSON. Now check if JSON content is acceptable.
        if (validateProfileJsonResponse(json)) {
          resolve(baseUrl);
        } else {
          console.log(
            `Nodechooser: Node ${baseUrl} provided unexpected JSON data`,
          );
          reject(new Error('JSON response not valid'));
        }
      })
      .catch((error) => {
        console.log(`Nodechooser: Node ${baseUrl} failed with ${error}`);
        reject(error);
      });
  });

/**
 *   Check if the provided Url points to a working BrightID node.
 *   Get the response from /brightid/v5/state endpoint and check
 *   if the reply makes sense.
 * @param baseUrl
 */
const validateAPI = (baseUrl: string) =>
  new Promise<string>((resolve, reject) => {
    fetch(`${baseUrl}/brightid/v5/state`)
      .then((response) => {
        // network request was okay, now check server response on http level
        if (!response.ok) {
          console.log(
            `Nodechooser: Invalid http response from ${baseUrl}: ${response.status} ${response.statusText}`,
          );
          throw new Error('Response not ok');
        } else {
          // Response is fine on http level. Now see if the content is also fine.
          return response.json(); // will throw if response body is not JSON
        }
      })
      .then((json) => {
        // Body contains JSON. Now check if JSON content is acceptable.
        if (validateAPIJsonResponse(json)) {
          resolve(baseUrl);
        } else {
          console.log(
            `Nodechooser: Node ${baseUrl} provided unexpected JSON data`,
          );
          throw new Error('JSON response not valid');
        }
      })
      .catch((error) => {
        console.log(`Nodechooser: Node ${baseUrl} failed with ${error}`);
        reject(error);
      });
  });

/**
 * Check if json API response contains expected content.
 *
 * Expected schema:
 * {
 *   "data": {
 *     "lastProcessedBlock": number,
 *     "verificationsBlock": number,
 *     "initOp": number,
 *     "sentOp": number,
 *     "verificationsHashes": object
 *   }
 * }
 *
 * @param json
 */
const expectedAPIRootKey = 'data';
const expectedAPIBodyKeys = [
  'lastProcessedBlock',
  'verificationsBlock',
  'initOp',
  'sentOp',
  'verificationsHashes',
];

const validateAPIJsonResponse = (json) => {
  const body = json[expectedAPIRootKey];
  if (!body) {
    throw new Error(`Missing rootkey ${expectedAPIRootKey}`);
  }
  const keys = Object.keys(body);
  for (const key of expectedAPIBodyKeys) {
    if (keys.indexOf(key) === -1) {
      throw new Error(`Missing bodykey ${key}`);
    }
  }
  return true;
};

/**
 * Check if json profile server response contains expected content.
 *
 * Expected schema:
 * {
 *   "profileIds": []
 * }
 *
 * @param json
 */

const expectedProfileKey = 'profileIds';
const validateProfileJsonResponse = (json) => {
  const keys = Object.keys(json);
  if (keys.indexOf(expectedProfileKey) === -1) {
    throw new Error(`Missing profile key ${expectedProfileKey}`);
  }
  const data = json[expectedProfileKey];
  if (JSON.stringify(data) !== '[]') {
    throw new Error(
      `Unexpected profile response ${data} - Expected empty array`,
    );
  }
  return true;
};

export default chooseNode;
