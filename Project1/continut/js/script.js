let currentlySelectedItem = null;

const loadedScripts = {};

async function changePage(resource, selectedMenuItem, title, jsFile, jsFunction) {
    const { ajax } = await import('./ajax.js');
    const page = await ajax(`${resource}.html`, {
        method: 'GET'
    });

    let main = document.getElementById('content');
    main.innerHTML = page.target.responseText;

    if (currentlySelectedItem != null) {
        document.getElementById(currentlySelectedItem).classList.remove('selected');
    }

    currentlySelectedItem = selectedMenuItem;
    document.getElementById(currentlySelectedItem).classList.add('selected');

    let titleElement = document.getElementById('page-title');
    titleElement.innerText = `WizardVerse Wiki - ${title}`

    if (jsFile) {
        let scriptElement = loadedScripts[jsFile];
        if (loadedScripts[jsFile] == null) {
            scriptElement = document.createElement('script');
            scriptElement.onload = function () {
                console.log(`Script ${jsFile} loaded`);
                if (jsFunction) {
                    window[jsFunction]();
                }
            }
            scriptElement.src = jsFile;
            loadedScripts[jsFile] = scriptElement;
        }

        main.querySelector('#script-host').append(scriptElement);
    }
}


window.onload = () => changePage('acasa', 'home', 'Acasă');
