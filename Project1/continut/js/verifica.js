async function check() {
    let username = document.getElementById('username').value;
    let password = document.getElementById('password').value;

    const usersRequest = await fetch('resurse/utilizatori.json', {
        method: 'GET'
    });

    const users = JSON.parse(await usersRequest.text());

    for (const user of users) {
        if (user.username == username && user.password == password) {
            document.getElementById('message-host').innerText = 'Credențialele sunt corecte';
            return;
        }
    }

    document.getElementById('message-host').innerText = 'Credențialele sunt greșite';
}
