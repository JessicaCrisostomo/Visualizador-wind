let datosGlobales = [];
let datosIntensidad = [];
let datosDireccion = [];

const mesesNombre = [
    'Enero', 'Febrero', 'Marzo', 'Abril',
    'Mayo', 'Junio', 'Julio', 'Agosto',
    'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const ticksDireccion = [
    0, 22.5, 45, 67.5,
    90, 112.5, 135, 157.5,
    180, 202.5, 225, 247.5,
    270, 292.5, 315, 337.5, 360
];

const labelsDireccion = [
    'N', 'NNE', 'NE', 'ENE',
    'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW',
    'W', 'WNW', 'NW', 'NNW', 'N'
];

const sectoresRosa = [
    'N', 'NNE', 'NE', 'ENE',
    'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW',
    'W', 'WNW', 'NW', 'NNW'
];

const angulosRosa = [
    0, 22.5, 45, 67.5,
    90, 112.5, 135, 157.5,
    180, 202.5, 225, 247.5,
    270, 292.5, 315, 337.5
];

const binsVelocidad = [
    {nombre: '0-3 m/s', min: 0, max: 3},
    {nombre: '3-6 m/s', min: 3, max: 6},
    {nombre: '6-9 m/s', min: 6, max: 9},
    {nombre: '9-12 m/s', min: 9, max: 12},
    {nombre: '12-15 m/s', min: 12, max: 15},
    {nombre: '>=15 m/s', min: 15, max: Infinity}
];

const seriesModelos = [
    {
        nombre: 'Observado',
        ws: 'WS',
        wd: 'WD',
        idMensual: 'rosaMensualObs',
        idHora: 'rosaHoraObs'
    },
    {
        nombre: 'ECMWF',
        ws: 'v_europeo_ifs',
        wd: 'd_europeo_ifs',
        idMensual: 'rosaMensualEcmwf',
        idHora: 'rosaHoraEcmwf'
    },
    {
        nombre: 'GFS',
        ws: 'v_gfs',
        wd: 'd_gfs',
        idMensual: 'rosaMensualGfs',
        idHora: 'rosaHoraGfs'
    },
    {
        nombre: 'Meteoblue',
        ws: 'v_meteoblue',
        wd: 'd_meteoblue',
        idMensual: 'rosaMensualMeteoblue',
        idHora: 'rosaHoraMeteoblue'
    }
];

function mostrarSeccion(id) {
    document.querySelectorAll('.seccion').forEach(seccion => {
        seccion.classList.remove('activa');
    });

    document.getElementById(id).classList.add('activa');

    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
    }, 100);
}

function cargarCSV(ruta) {
    return fetch(ruta)
        .then(response => {
            if (!response.ok) {
                throw new Error('No se pudo cargar: ' + ruta);
            }
            return response.text();
        })
        .then(data => {
            const limpio = data.trim();

            if (limpio.length === 0) {
                return [];
            }

            const filas = limpio.split(/\r?\n/);
            const headers = filas[0].split(',').map(h => h.trim());

            return filas.slice(1).map(fila => {
                const columnas = fila.split(',').map(c => c.trim());
                let obj = {};

                headers.forEach((h, i) => {
                    obj[h] = columnas[i];
                });

                return obj;
            });
        });
}

Promise.all([
    cargarCSV('datos/comparacion_2025.csv'),
    cargarCSV('datos/intensidad.csv'),
    cargarCSV('datos/direccion.csv')
]).then(([comparacion, intensidad, direccion]) => {

    datosGlobales = comparacion.map(d => ({
        ...d,
        fecha: new Date(d.Time),
        hora: new Date(d.Time).getHours(),
        WS: parseFloat(d.WS),
        v_europeo_ifs: parseFloat(d.v_europeo_ifs),
        v_gfs: parseFloat(d.v_gfs),
        v_meteoblue: parseFloat(d.v_meteoblue),
        WD: parseFloat(d.WD),
        d_europeo_ifs: parseFloat(d.d_europeo_ifs),
        d_gfs: parseFloat(d.d_gfs),
        d_meteoblue: parseFloat(d.d_meteoblue)
    })).filter(d => !isNaN(d.fecha));

    datosIntensidad = intensidad;
    datosDireccion = direccion;

    actualizarTodo();

}).catch(error => {
    console.error(error);
    document.body.insertAdjacentHTML(
        'afterbegin',
        '<div class="error">Error cargando archivos CSV. Revisa que existan datos/comparacion_2025.csv, datos/intensidad.csv y datos/direccion.csv.</div>'
    );
});

function actualizarTodo() {
    const mes = parseInt(document.getElementById('selectorMes').value);
    const hora = parseInt(document.getElementById('selectorHora').value);

    const datosMes = datosGlobales.filter(d => d.fecha.getMonth() === mes);
    const datosMesHora = datosMes.filter(d => d.hora === hora);

    graficarVelocidad(datosMes, mes);
    graficarDireccion(datosMes, mes);

    actualizarTablas(mes);

    seriesModelos.forEach(modelo => {
        graficarRosa(datosMes, modelo, modelo.idMensual, `${modelo.nombre} - ${mesesNombre[mes]}`);
        graficarRosa(datosMesHora, modelo, modelo.idHora, `${modelo.nombre} - ${mesesNombre[mes]} ${String(hora).padStart(2, '0')} UTC`);
    });
}

function graficarVelocidad(datos, mes) {
    const fechas = datos.map(d => d.Time);

    const trazas = [
        crearTrazaLinea(fechas, datos.map(d => d.WS), 'Observado', 'm/s', 2),
        crearTrazaLinea(fechas, datos.map(d => d.v_europeo_ifs), 'ECMWF', 'm/s', 2),
        crearTrazaLinea(fechas, datos.map(d => d.v_gfs), 'GFS', 'm/s', 2),
        crearTrazaLinea(fechas, datos.map(d => d.v_meteoblue), 'Meteoblue', 'm/s', 2)
    ];

    const layout = {
        title: `Intensidad del viento - ${mesesNombre[mes]}`,
        xaxis: {title: 'Fecha'},
        yaxis: {title: 'Velocidad (m/s)'},
        hovermode: 'x unified',
        margin: {l: 70, r: 30, t: 60, b: 60}
    };

    Plotly.newPlot('graficoVelocidad', trazas, layout, {responsive: true});
}

function graficarDireccion(datos, mes) {
    const fechas = datos.map(d => d.Time);

    const trazas = [
        crearTrazaLinea(fechas, datos.map(d => d.WD), 'Observado', '°', 1),
        crearTrazaLinea(fechas, datos.map(d => d.d_europeo_ifs), 'ECMWF', '°', 1),
        crearTrazaLinea(fechas, datos.map(d => d.d_gfs), 'GFS', '°', 1),
        crearTrazaLinea(fechas, datos.map(d => d.d_meteoblue), 'Meteoblue', '°', 1)
    ];

    const layout = {
        title: `Dirección del viento - ${mesesNombre[mes]}`,
        xaxis: {title: 'Fecha'},
        yaxis: {
            title: 'Dirección',
            range: [0, 360],
            tickvals: ticksDireccion,
            ticktext: labelsDireccion
        },
        hovermode: 'x unified',
        margin: {l: 70, r: 30, t: 60, b: 60}
    };

    Plotly.newPlot('graficoDireccion', trazas, layout, {responsive: true});
}

function crearTrazaLinea(x, y, nombre, unidad, decimales) {
    return {
        x: x,
        y: y,
        mode: 'lines',
        name: nombre,
        hovertemplate: `%{x}<br>${nombre}: %{y:.${decimales}f} ${unidad}<extra></extra>`
    };
}

function actualizarTablas(mes) {
    const nombreMes = mesesNombre[mes];

    const intensidadMes = datosIntensidad.filter(d => d.Mes === nombreMes);
    const direccionMes = datosDireccion.filter(d => d.Mes === nombreMes);

    crearTabla(intensidadMes, 'tablaIntensidad');
    crearTabla(direccionMes, 'tablaDireccion');
}

function crearTabla(datos, contenedor) {
    const div = document.getElementById(contenedor);

    if (!datos || datos.length === 0) {
        div.innerHTML = '<p>Sin datos disponibles para este mes.</p>';
        return;
    }

    const headers = Object.keys(datos[0]);
    let html = '<table><tr>';

    headers.forEach(h => {
        html += `<th>${h}</th>`;
    });

    html += '</tr>';

    datos.forEach(fila => {
        html += '<tr>';

        headers.forEach(h => {
            html += `<td>${fila[h]}</td>`;
        });

        html += '</tr>';
    });

    html += '</table>';

    div.innerHTML = html;
}

function graficarRosa(datos, modelo, contenedor, titulo) {
    const tabla = calcularRosa(datos, modelo.ws, modelo.wd);

    const trazas = binsVelocidad.map(bin => ({
        type: 'barpolar',
        r: tabla[bin.nombre],
        theta: angulosRosa,
        name: bin.nombre,
        width: 22.5,
        hovertemplate: '%{theta}°<br>%{r:.1f}%<extra>' + bin.nombre + '</extra>'
    }));

    const layout = {
        title: titulo,
        polar: {
            angularaxis: {
                direction: 'clockwise',
                rotation: 90,
                tickmode: 'array',
                tickvals: angulosRosa,
                ticktext: sectoresRosa
            },
            radialaxis: {
                ticksuffix: '%'
            }
        },
        legend: {
            orientation: 'h',
            y: -0.15
        },
        margin: {l: 40, r: 40, t: 60, b: 70}
    };

    Plotly.newPlot(contenedor, trazas, layout, {responsive: true});
}

function calcularRosa(datos, colVel, colDir) {
    let conteo = {};

    binsVelocidad.forEach(bin => {
        conteo[bin.nombre] = new Array(16).fill(0);
    });

    let total = 0;

    datos.forEach(d => {
        const velocidad = d[colVel];
        const direccion = d[colDir];

        if (isNaN(velocidad) || isNaN(direccion)) {
            return;
        }

        const sector = Math.floor(((direccion % 360) + 11.25) / 22.5) % 16;

        const bin = binsVelocidad.find(b => velocidad >= b.min && velocidad < b.max);

        if (bin) {
            conteo[bin.nombre][sector] += 1;
            total += 1;
        }
    });

    if (total > 0) {
        binsVelocidad.forEach(bin => {
            conteo[bin.nombre] = conteo[bin.nombre].map(valor => 100 * valor / total);
        });
    }

    return conteo;
}
