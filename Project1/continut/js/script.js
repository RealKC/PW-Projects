let currentlySelectedItem = null;

async function changePage(resource, selectedMenuItem, title) {
    const page = await fetch(`${resource}.html`, {
        method: "GET"
    });

    let main = document.getElementById('content');
    main.innerHTML = await page.text();

    if (currentlySelectedItem != null) {
        document.getElementById(currentlySelectedItem).classList.remove('selected');
    }

    currentlySelectedItem = selectedMenuItem;
    document.getElementById(currentlySelectedItem).classList.add('selected');

    let titleElement = document.getElementById('page-title');
    titleElement.innerText = `WizardVerse Wiki - ${title}`
}


window.onload = () => changePage('acasa', 'home', 'Acasă');
