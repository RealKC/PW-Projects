window.addEventListener("load", () => {
    initializeSidebar();
    initializeSection1();
});

const NUMBER_OF_SECTIONS = 1;

function initializeSidebar() {
    for (let i = 0; i < NUMBER_OF_SECTIONS; ++i) {
        const element = document.getElementById(`section-${i + 1}-button`);
        element.textContent = document.getElementById(`section-${i + 1}`).textContent;
    }
}

function initializeSection1() {
    const element = document.getElementById("section-1-js");
    const now = new Date();
    const dateFormat = new Intl.DateTimeFormat("ro-RO", {
        dateStyle: "full",
        timeStyle: "medium",
    });
    element.innerHTML = `
Ai accesat pagina la data de: ${dateFormat.format(now)}, folosind ${navigator.userAgent}. Calculatorul dumneavoastră are ${navigator.hardwareConcurrency} nuclee.
<br />
Vă aflați pe pagina: ${location.pathname}.
<br />
Timpul curent este: <div id="section-1-time">${dateFormat.format(now)}</div>
    `;

    setInterval(() => {
        document.getElementById("section-1-time").textContent = dateFormat.format(new Date());
    }, 1000)
}
