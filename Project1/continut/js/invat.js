function main() {
    initializeSidebar();
    initializeSection1();
    initializeSection2();
    initializeSection3();
}

const NUMBER_OF_SECTIONS = 3;

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

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            element.innerHTML += `<br /> Coordonatele tale GPS sunt: ${position.coords.latitude} lat, ${position.coords.longitude} long`;

            if (position.coords.altitude) {
                element.innerHTML += `și te afli la o altitudine de ${position.coords.altitude} metri`
            }
        });
    }

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

function initializeSection3() {
    for (const type of ["col", "row"]) {
        document.getElementById(`section-3-btn-${type}`).onclick = () => section3Insert(type);
    }
    document.getElementById("section-3-pos").value = "0";
}

function section3Insert(mode) {
    let position = parseInt(document.getElementById("section-3-pos").value);
    let color = document.getElementById("section-3-color").value;
    /** @type {HTMLTableElement} */
    let table = document.getElementById("section-3-table");
    switch (mode) {
        case "col": {
            const cell = row.insertCell(position + 2);
            cell.style.backgroundColor = color;
            cell.classList.add("s3-cell");
            break;
        }
        case "row": {
            const row = table.insertRow(position + 1);
            const cell = row.insertCell(0);
            cell.style.backgroundColor = color;
            cell.classList.add("s3-cell");
            break;
        }
        default:
            console.error(`Unknown mode: '${mode}'`);
            break;
    }
}
