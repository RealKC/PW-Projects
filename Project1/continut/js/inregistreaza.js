async function registerUser() {
    const inputElements = document.querySelectorAll('input');

    const requestObject = {}

    for (const elem of inputElements) {
        if (elem.value.length == 0) {
            const labelElements = document.querySelectorAll('label');
            for (const label of labelElements) {
                if (label.htmlFor == elem.id) {
                    document.getElementById('message-host').textContent = `Câmpul '${label.textContent}' nu poate fi gol`;
                    return;
                }
            }
        }
        requestObject[elem.id] = elem.value;
    }

    requestObject['foods'] = document.getElementById('favouriteDish').value;

    await fetch('/api/register-user', {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(requestObject)
    })
}
