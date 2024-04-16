/** A simple wrapper around XMLHttpRequest that provides a Promise interface
 *
 * @param {string} url
 * @param {{method: 'GET' | 'POST', headers: ?Map<string, string>, body: ?string}} options
 * @returns {Promise<ProgressEvent>}
 */
export function ajax(url, options) {
    const xhttp = new XMLHttpRequest();

    return new Promise((resolve, reject) => {
        xhttp.addEventListener("load", resolve);

        xhttp.addEventListener("error", reject);

        xhttp.open(options.method, url, true);

        if (options.method === 'POST') {
            for (const [key, value] of Object.entries(options.headers)) {
                xhttp.setRequestHeader(key, value);
            }

            xhttp.send(options.body);
        } else {
            xhttp.send();
        }
    });
}
