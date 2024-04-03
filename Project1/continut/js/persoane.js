async function loadPeople() {
    const peopleRequest = await fetch('/resurse/persoane.xml', {
        method: 'GET'
    });
    const peopleText = await peopleRequest.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(peopleText, 'application/xml');
    const people = xml.querySelectorAll('persoana');

    const table = document.createElement('table')

    const headerRow = table.insertRow(0);
    const headerCells = ['Nume', 'Prenume', 'Vârstă', 'Data nașterii', 'Adresă'];
    for (let i = 0; i < headerCells.length; ++i) {
        headerRow.insertCell(i).innerText = headerCells[i];
    }

    const dateFormat = new Intl.DateTimeFormat(navigator.language, {
        dateStyle: 'medium'
    });

    for (const person of people) {
        const id = person.getAttribute('id');

        const birthDateElem = person.getElementsByTagName('data-nasterii')[0];
        const birthYear = Number.parseInt(birthDateElem.getElementsByTagName('an')[0].textContent);
        const birthMonth = Number.parseInt(birthDateElem.getElementsByTagName('luna')[0].textContent);
        const birthDay = Number.parseInt(birthDateElem.getElementsByTagName('ziua')[0].textContent);
        const birthDate = new Date(birthYear, birthMonth - 1, birthDay);

        const address = person.getElementsByTagName('adresa')[0];
        const street = address.getElementsByTagName('strada')[0].textContent;
        const streetNumber = address.getElementsByTagName('numar')[0].textContent;
        const locality = address.getElementsByTagName('localitatea')[0].textContent;
        const county = address.getElementsByTagName('judet')[0].textContent;
        const country = address.getElementsByTagName('tara')[0].textContent;

        const cells = [
            person.getElementsByTagName('nume')[0].textContent,
            person.getElementsByTagName('prenume')[0].textContent,
            person.getElementsByTagName('varsta')[0].textContent,
            dateFormat.format(birthDate),
            `${street}, nr. ${streetNumber}, ${locality}, jud. ${county}, ${country}`
        ];

        const row = table.insertRow(Number.parseInt(id));
        for (let i = 0; i < cells.length; ++i) {
            row.insertCell(i).innerText = cells[i];
        }
    }

    document.getElementById('table-host').append(table);
    document.getElementById('loading-text').remove();
}
