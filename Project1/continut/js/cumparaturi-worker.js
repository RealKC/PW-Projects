onmessage = (event) => {
    console.log(`Received product ${event.data.name}`);
    postMessage(event.data);
}
