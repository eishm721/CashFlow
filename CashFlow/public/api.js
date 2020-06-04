/* Filename: api.js
 *
 * Wrapper function implementation for simplifying
 * fetch requests
 */

let API_URL = "/api";

/* Make an API request.
   Returns a pair (array with two elements) [status, data]:
   - status is the HTTP status (number)
   - data is the data from the server (assumed to be JSON) */
const apiRequest = async (method, path, body = null) => {
  try {
    let opts = { method };
    if (body !== null) {
      // if a body is provided, specify it in JSON
      opts.headers = {"Content-Type": "application/json" };
      opts.body = JSON.stringify(body);
    }
    // try to fetch and get JSON request - will catch if invald
    let res = await fetch(API_URL + path, opts);
    let data = await res.json();
    return [res.status, data];
  } catch (e) {
    alert(e.message);
    throw e;
  }
};

export default apiRequest;
