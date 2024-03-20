window.addEventListener("load", () => {
    initializeSidebar();
    initializeSection1();
    initializeSection2();
});

const NUMBER_OF_SECTIONS = 2;

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

function initializeSection2() {
    const canvas = document.getElementById("jspaint");
    /** @type {CanvasRenderingContext2D} */
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#000000";
    ctx.lineWidth = 2;

    for (const pickerType of ["fill", "stroke"]) {
        let colorPicker = document.getElementById(`section-2-${pickerType}`);
        colorPicker.addEventListener("change", (event) => {
            ctx[`${pickerType}Style`] = event.target.value;
        });
        ctx[`${pickerType}Style`] = colorPicker.defaultValue;
    }

    let firstCoordX = null;
    let firstCoordY = null;

    canvas.addEventListener("pointerdown", (event) => {
        const rect = canvas.getBoundingClientRect();
        const x = (event.x - rect.left) * canvas.width / rect.width;
        const y = (event.y - rect.top) * canvas.height / rect.height;
        if (firstCoordX) {
            ctx.fillRect(firstCoordX, firstCoordY, x - firstCoordX, y - firstCoordY);
            ctx.strokeRect(firstCoordX, firstCoordY, x - firstCoordX, y - firstCoordY);
            firstCoordX = null;
            firstCoordY = null;
        } else {
            firstCoordX = x;
            firstCoordY = y;
        }
    });
}
