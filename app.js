let contratos = [];
let contratosFiltrados = [];
let chartSegmento;
let chartEntidad;
let chartTipo;

document.addEventListener("DOMContentLoaded", () => {
  cargarDatos();
  configurarBotonLimpiar();
});

async function cargarDatos() {
  const response = await fetch("contratos.json");
  contratos = await response.json();
  contratosFiltrados = [...contratos];

  inicializarSelects();
  configurarBuscadores();
  aplicarFiltros();
}

/* =============================
   SELECTS
============================= */

function inicializarSelects() {
  const selectContratante = document.getElementById("filtro-contratante");
  const selectEntidad = document.getElementById("filtro-entidad");
  const selectTipo = document.getElementById("filtro-tipo");

  const contratantes = [...new Set(contratos.map(c => c.contratante).filter(Boolean))];
  const entidades = [...new Set(contratos.map(c => c.entidad).filter(Boolean))];
  const tipos = [...new Set(contratos.map(c => c.tipo_negocio).filter(Boolean))];

  contratantes.forEach(v => selectContratante.innerHTML += `<option value="${v}">${v}</option>`);
  entidades.forEach(v => selectEntidad.innerHTML += `<option value="${v}">${v}</option>`);
  tipos.forEach(v => selectTipo.innerHTML += `<option value="${v}">${v}</option>`);

  selectContratante.addEventListener("change", aplicarFiltros);
  selectEntidad.addEventListener("change", aplicarFiltros);
  selectTipo.addEventListener("change", aplicarFiltros);
}

/* =============================
   AUTOCOMPLETE CORREGIDO
============================= */

function configurarBuscadores() {
  configurarAutocomplete("filtroActividadTexto", "sugerencias-actividad", obtenerActividades);
  configurarAutocomplete("filtroClaseTexto", "sugerencias-clase", obtenerClases);
  configurarAutocomplete("buscador", "sugerencias-objeto", obtenerObjetos);
}

function configurarAutocomplete(inputId, boxId, dataFunction) {
  const input = document.getElementById(inputId);
  const box = document.getElementById(boxId);
  if (!input || !box) return;

  input.addEventListener("input", () => {

    const texto = normalizarTexto(input.value);
    box.innerHTML = "";

    // Si vacío
    if (!texto) {
      box.style.display = "none";
      aplicarFiltros();
      return;
    }

    // Actualiza primero filtros para que sugerencias usen contexto real
    aplicarFiltros();

    const valores = dataFunction();

    const coincidencias = valores
      .filter(v => normalizarTexto(v).includes(texto))
      .slice(0, 15);

    if (!coincidencias.length) {
      box.style.display = "none";
      return;
    }

    coincidencias.forEach(v => {
      const item = document.createElement("div");
      item.textContent = v;

      item.addEventListener("click", () => {
        input.value = v;
        box.style.display = "none";
        aplicarFiltros();
      });

      box.appendChild(item);
    });

    box.style.display = "block";
  });

  document.addEventListener("click", e => {
    if (!input.contains(e.target) && !box.contains(e.target)) {
      box.style.display = "none";
    }
  });
}

/* =============================
   SUGERENCIAS DINÁMICAS
============================= */

function obtenerActividades() {
  const set = new Set();
  contratosFiltrados.forEach(c => {
    c.actividades?.forEach(a => {
      if (a?.nombre) set.add(a.nombre);
    });
  });
  return [...set];
}

function obtenerClases() {
  const set = new Set();
  contratosFiltrados.forEach(c => {
    c.clases?.forEach(cl => {
      if (cl?.codigo && cl?.nombre) {
        set.add(`${cl.codigo} - ${cl.nombre}`);
      }
    });
  });
  return [...set];
}

function obtenerObjetos() {
  const set = new Set();
  contratosFiltrados.forEach(c => {
    if (c.objeto) set.add(c.objeto);
    if (c.contratante) set.add(c.contratante);
  });
  return [...set];
}

/* =============================
   FILTROS
============================= */

function aplicarFiltros() {

  const textoActividad = normalizarTexto(document.getElementById("filtroActividadTexto").value);
  const textoClase = normalizarTexto(document.getElementById("filtroClaseTexto").value);
  const textoLibre = normalizarTexto(document.getElementById("buscador").value);

  const selContratante = document.getElementById("filtro-contratante").value;
  const selEntidad = document.getElementById("filtro-entidad").value;
  const selTipo = document.getElementById("filtro-tipo").value;

  contratosFiltrados = contratos.filter(c => {

    if (selContratante !== "todos" && c.contratante !== selContratante) return false;
    if (selEntidad !== "todos" && c.entidad !== selEntidad) return false;
    if (selTipo !== "todos" && c.tipo_negocio !== selTipo) return false;

    if (textoActividad) {
      const ok = c.actividades?.some(a =>
        normalizarTexto(a?.nombre).includes(textoActividad)
      );
      if (!ok) return false;
    }

    if (textoClase) {
      const ok = c.clases?.some(cl => {
        const codigo = normalizarTexto(cl?.codigo);
        const nombre = normalizarTexto(cl?.nombre);
        const combinado = `${codigo} - ${nombre}`;

        return codigo.includes(textoClase) ||
               nombre.includes(textoClase) ||
               combinado.includes(textoClase);
      });
      if (!ok) return false;
    }

    if (textoLibre) {
      const objeto = normalizarTexto(c.objeto);
      const contratante = normalizarTexto(c.contratante);

      if (!(objeto.includes(textoLibre) || contratante.includes(textoLibre)))
        return false;
    }

    return true;
  });

  renderTabla(contratosFiltrados);
  actualizarKPIs(contratosFiltrados);

 }

/* =============================
   TABLA
============================= */

function renderTabla(contratos) {
  const tbody = document.getElementById("tabla-contratos");
  tbody.innerHTML = "";

  contratos.forEach((c, index) => {

    const tr = document.createElement("tr");
    tr.classList.add("fila-contrato");
    tr.dataset.index = index;

    tr.innerHTML = `
      <td>${c.contrato_id}</td>
      <td>${c.contratante}</td>
      <td>${c.entidad}</td>
      <td>${c.tipo_negocio}</td>
      <td>$${c.cuantia.toLocaleString()}</td>
      <td>${c.smmlv.toLocaleString()}</td>
    `;

    tbody.appendChild(tr);

    // Fila detalle oculta
    const detalle = document.createElement("tr");
    detalle.classList.add("fila-detalle");
    detalle.style.display = "none";

    detalle.innerHTML = `
      <td colspan="6">
        <div class="detalle-contenido">
          <h4>Objeto</h4>
          <p>${c.objeto}</p>

          <h4>Actividades</h4>
          <ul>
            ${c.actividades.map(a => `<li>${a.nombre}</li>`).join("")}
          </ul>

          <h4>Clases (UNSPSC)</h4>
          <ul>
            ${c.clases.map(cl => `
              <li><strong>${cl.codigo}</strong> - ${cl.nombre}</li>
            `).join("")}
          </ul>
        </div>
      </td>
    `;

    tbody.appendChild(detalle);

    // Toggle
    tr.addEventListener("click", () => {
      const visible = detalle.style.display === "table-row";
      detalle.style.display = visible ? "none" : "table-row";
    });

  });
}

/* =============================
   KPIs
============================= */

function actualizarKPIs(lista) {
  const totalCuantia = lista.reduce((acc, c) => acc + (Number(c.cuantia) || 0), 0);
  const totalSMMLV = lista.reduce((acc, c) => acc + (Number(c.smmlv) || 0), 0);

  document.getElementById("total-cuantia").innerText =
    "$" + formatearNumero(totalCuantia);

  document.getElementById("total-smmlv").innerText =
    formatearNumeroDecimal(totalSMMLV);

  document.getElementById("total-contratos").innerText =
    lista.length;

  document.getElementById("total-contratantes").innerText =
    new Set(lista.map(c => c.contratante)).size;
}

/* =============================
   UTILIDADES
============================= */

function formatearNumero(num) {
  return new Intl.NumberFormat("es-CO").format(num);
}

function formatearNumeroDecimal(num) {
  return new Intl.NumberFormat("es-CO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
}

function normalizarTexto(texto) {
  return (texto || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/* =============================
   BOTÓN LIMPIAR
============================= */

function configurarBotonLimpiar() {
  const btn = document.getElementById("btn-limpiar");
  if (!btn) return;

  btn.addEventListener("click", () => {

    ["filtroActividadTexto", "filtroClaseTexto", "buscador"]
      .forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
      });

    ["filtro-contratante", "filtro-entidad", "filtro-tipo"]
      .forEach(id => {
        const sel = document.getElementById(id);
        if (sel) sel.value = "todos";
      });

    document.querySelectorAll(".sugerencias-box")
      .forEach(box => box.style.display = "none");

    aplicarFiltros();
  });
}
/* =========================================================
   DASHBOARD PROFESIONAL (NO INTERFIERE CON NADA EXISTENTE)
========================================================= */

/* 🔹 EXTENDEMOS aplicarFiltros SIN MODIFICAR SU LÓGICA */

const aplicarFiltrosOriginal = aplicarFiltros;

aplicarFiltros = function () {
  aplicarFiltrosOriginal();
  actualizarDashboard(contratosFiltrados);
};

/* =============================
   AGRUPACIONES
============================= */

function agruparSimple(lista, campo) {
  const map = {};
  lista.forEach(c => {
    const key = c[campo];
    if (!key) return;
    map[key] = (map[key] || 0) + 1;
  });
  return map;
}

function agruparPorSegmento(lista) {
  const map = {};

  lista.forEach(c => {
    c.clases?.forEach(cl => {

      if (!cl.codigo) return;

      const segmento = obtenerSegmento(cl.codigo);

      if (!segmento) return;

      map[segmento] = (map[segmento] || 0) + 1;

    });
  });

  return map;
}

function obtenerSegmento(codigo) {
  if (!codigo) return null;
  const seg = parseInt(codigo.toString().substring(0,2));
  if (seg >= 10 && seg <= 15) return "Materias primas";
  if (seg >= 20 && seg <= 27) return "Equipo industrial";
  if (seg >= 30 && seg <= 41) return "Componentes y suministros";
  if (seg >= 42 && seg <= 60) return "Productos uso final";
  if (seg >= 70 && seg <= 94) return "Servicios";
  if (seg === 95) return "Terrenos y estructuras";
  return null;
}

/* =============================
   ACTUALIZAR DASHBOARD
============================= */

function actualizarDashboard(lista) {

  renderChartSegmento(agruparPorSegmento(lista));

  renderChartBarras(
    "chart-entidad",
    agruparSimple(lista, "entidad"),
    "Participación por Entidad"
  );

  renderChartBarras(
    "chart-tipo",
    agruparSimple(lista, "tipo_negocio"),
    "Todos los Tipos de Negocio"
  );

  generarNarrativa(lista);

  actualizarTablaClases(lista);   // ← ESTA LÍNEA FALTABA

}

function actualizarTablaClases(contratos){

const mapa = {};

contratos.forEach(c=>{

if(!Array.isArray(c.clases)) return;

c.clases.forEach(cl=>{

const nombre = cl.nombre || "";
const codigo = cl.codigo || "";

const key = codigo + "|" + nombre;

if(!mapa[key]) mapa[key]=0;

mapa[key]++;

});

});

const total = Object.values(mapa).reduce((a,b)=>a+b,0);

const ranking = Object.entries(mapa)
.map(([k,v])=>{

const [codigo,nombre]=k.split("|");

return{
codigo,
nombre,
valor:v,
porcentaje:((v/total)*100).toFixed(1)
};

})
.sort((a,b)=>b.valor-a.valor)
.slice(0,10);


/* =============================
   RENDER VISUAL
============================= */

const contenedor = document.getElementById("ranking-clases");

if(!contenedor) return;

contenedor.innerHTML="";

ranking.forEach(r=>{

const fila=document.createElement("div");

fila.className="clase-item";

fila.innerHTML=`

<div class="clase-nombre">
<strong>${r.codigo}</strong> – ${r.nombre}
</div>

<div class="clase-barra-contenedor">
<div class="clase-barra-fill" style="width:${r.porcentaje}%"></div>
</div>

<div class="clase-porcentaje">
${r.porcentaje}%
</div>

`;

contenedor.appendChild(fila);

});

}

/* =============================
   GRÁFICO CIRCULAR PROFESIONAL
============================= */

function renderChartSegmento(data) {

  const ctx = document.getElementById("chart-segmento");
  if (!ctx) return;

  if (chartSegmento) chartSegmento.destroy();

  // 🔹 Orden automático mayor a menor
  const sortedEntries = Object.entries(data)
    .sort((a, b) => b[1] - a[1]);

  const labels = sortedEntries.map(e => e[0]);
  const values = sortedEntries.map(e => e[1]);

  // 🔹 Resaltar segmento dominante
  const maxValue = Math.max(...values);

  const backgroundColors = values.map((v, index) => {
    if (v === maxValue) return "#F59E0B"; // Dominante resaltado
    const palette = [
      "#1E3A8A",
      "#2563EB",
      "#9333EA",
      "#0F766E",
      "#C2410C",
      "#475569"
    ];
    return palette[index % palette.length];
  });

  chartSegmento = new Chart(ctx, {
    type: "pie",
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: backgroundColors,
        borderColor: "#ffffff",
        borderWidth: 4,
        hoverOffset: 25
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 1,
      animation: {
        duration: 700,
        easing: "easeOutBack"
      },
      plugins: {
        title: {
          display: true,
          text: "Experiencia de Acuerdo al Nivel de Clasificación",
          font: { size: 20, weight: "700" }
        },
        legend: {
          position: "left",
          labels: {
            boxWidth: 13,
            padding: 13,
            font: { size: 16 }
          }
        },
        datalabels: {
          formatter: (value, ctx) => {
            const total = ctx.chart.data.datasets[0].data
              .reduce((a, b) => a + b, 0);
            const porcentaje = total ? (value / total) * 100 : 0;
            return Math.round(porcentaje) + "%";
          },
          color: "#ffffff",
          font: { weight: "bold", size: 15 }
        }
      }
    },
    plugins: [ChartDataLabels]
  });
}
/* =============================
   BARRAS MODERNAS
============================= */

function renderChartBarras(id, data, titulo) {

  const ctx = document.getElementById(id);
  if (!ctx) return;

  let chartRef;

  if (id === "chart-entidad") {
    if (chartEntidad) chartEntidad.destroy();
  }

  if (id === "chart-tipo") {
    if (chartTipo) chartTipo.destroy();
  }

  // 🔹 Convertimos objeto a array y ordenamos de mayor a menor
  const sortedEntries = Object.entries(data)
    .sort((a, b) => b[1] - a[1]);

  const labels = sortedEntries.map(e => e[0]);
  const values = sortedEntries.map(e => e[1]);

  chartRef = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: [
          "#0A3D62",
          "#1E6091",
          "#3A86FF",
          "#8338EC",
          "#FF006E",
          "#FB5607",
          "#FFBE0B"
        ],
        borderColor: "#ffffff",
        borderWidth: 3,
        hoverOffset: 25
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 1,
      cutout: "60%",
      animation: {
        duration: 700,
        easing: "easeOutQuart"
      },
      plugins: {
        title: {
          display: true,
          text: titulo,
          font: { size: 18, weight: "600" }
        },
        legend: {
          position: "right",
	  labels: {
            boxWidth: 13,
            padding: 13,
            font: { size: 16 }
          }
        },
        datalabels: {
          formatter: (value, ctx) => {
            const total = ctx.chart.data.datasets[0].data
              .reduce((a, b) => a + b, 0);
            const porcentaje = total ? (value / total) * 100 : 0;
            return Math.round(porcentaje) + "%";   // 🔹 SIN DECIMAL
          },
          color: "#ffffff",
          font: {
            weight: "bold",
            size: 18
          }
        }
      }
    },
    plugins: [ChartDataLabels]
  });

  if (id === "chart-entidad") chartEntidad = chartRef;
  if (id === "chart-tipo") chartTipo = chartRef;
}


/* =============================
   NARRATIVA ESTRATÉGICA
============================= */

function generarNarrativa(lista) {

  const contenedor = document.getElementById("dashboard-narrativa");
  if (!contenedor) return;

  if (!lista || !lista.length) {
    contenedor.innerHTML = "";
    return;
  }

  const totalContratos = lista.length;
  const totalCuantia = lista.reduce((a,c)=>a+(Number(c.cuantia)||0),0);
  const totalEntidades = new Set(lista.map(c=>c.entidad)).size;

  const segmentos = agruparPorSegmento(lista);
  const ordenados = Object.entries(segmentos)
    .sort((a,b)=>b[1]-a[1]);

  let bloqueSegmento = "";

  if (ordenados.length) {

    const totalSegmentos = ordenados
      .reduce((acc, [,v]) => acc + v, 0);

    const [dominante, cantidad] = ordenados[0];

    const porcentaje = totalSegmentos
      ? Math.round((cantidad / totalSegmentos) * 100)
      : 0;

    bloqueSegmento = `
      La experiencia contractual se concentra principalmente en 
      <strong>${dominante}</strong>, 
      representando el <strong>${porcentaje}%</strong> del total clasificado.
    `;
  }

  contenedor.innerHTML = `
    <div class="narrativa-card">
      <h3>Análisis Estratégico</h3>
      <p>
        Se identifican <strong>${totalContratos}</strong> contratos,
        con una cuantía acumulada de 
        <strong>$${formatearNumero(totalCuantia)}</strong>,
        distribuidos en <strong>${totalEntidades}</strong> entidades.
      </p>
      <p style="margin-top:12px;">
        ${bloqueSegmento}
      </p>
    </div>
  `;
}
/* =============================
   CONTROL MODO ESTRATÉGICO
============================= */

document.addEventListener("DOMContentLoaded", () => {
  const btnToggle = document.getElementById("btn-dashboard-toggle");
  if (!btnToggle) return;

  btnToggle.addEventListener("click", function() {

    const body = document.body;
    body.classList.toggle("modo-estrategico");

    const activo = body.classList.contains("modo-estrategico");

    this.innerText = activo
      ? "Ocultar Dashboard Estratégico"
      : "Ver Dashboard Estratégico";

    if (activo) {
      setTimeout(() => {
        if (chartSegmento) chartSegmento.resize();
        if (chartEntidad) chartEntidad.resize();
        if (chartTipo) chartTipo.resize();

        generarNarrativa(contratosFiltrados);
      }, 300);
    }
  });
});
/* =========================================================
   GUARDAR / RESTAURAR ESTADO FILTROS
========================================================= */

function guardarEstadoFiltros() {
  const estado = {
    contratante: document.getElementById("filtro-contratante").value,
    entidad: document.getElementById("filtro-entidad").value,
    tipo: document.getElementById("filtro-tipo").value,
    clase: document.getElementById("filtroClaseTexto").value,
    actividad: document.getElementById("filtroActividadTexto").value,
    buscador: document.getElementById("buscador").value
  };
  localStorage.setItem("estadoFiltros", JSON.stringify(estado));
}

function restaurarEstadoFiltros() {
  const estado = JSON.parse(localStorage.getItem("estadoFiltros"));
  if (!estado) return;

  document.getElementById("filtro-contratante").value = estado.contratante || "todos";
  document.getElementById("filtro-entidad").value = estado.entidad || "todos";
  document.getElementById("filtro-tipo").value = estado.tipo || "todos";
  document.getElementById("filtroClaseTexto").value = estado.clase || "";
  document.getElementById("filtroActividadTexto").value = estado.actividad || "";
  document.getElementById("buscador").value = estado.buscador || "";

  aplicarFiltros();
}

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(restaurarEstadoFiltros, 300);
});

const aplicarFiltrosOriginalExport = aplicarFiltros;

aplicarFiltros = function () {
  aplicarFiltrosOriginalExport();
  guardarEstadoFiltros();
};

/* =========================================================
   EXPORTAR EXCEL PROFESIONAL
========================================================= */

document
  .getElementById("btn-exportar-excel")
  ?.addEventListener("click", function () {

    if (!contratosFiltrados || !contratosFiltrados.length) {
      alert("No hay datos para exportar.");
      return;
    }

    const headers = [
      "Contrato",
      "Contratante",
      "Entidad",
      "Tipo Negocio",
      "Cuantía",
      "SMMLV",
      "Objeto",
      "Actividades",
      "Clases UNSPSC"
    ];

    const rows = contratosFiltrados.map(c => {

      let actividades = "";

      if (Array.isArray(c.actividades)) {
        actividades = c.actividades
          .map(a => {

            if (typeof a === "string") return a;

            if (typeof a === "object" && a !== null) {
              return (
                a.descripcion ||
                a.nombre ||
                a.actividad ||
                Object.values(a).join(" ")
              );
            }

            return "";
          })
          .join("\n");
      }
      else if (typeof c.actividades === "string") {
        actividades = c.actividades;
      }

      const clases = Array.isArray(c.clases)
        ? c.clases
            .map(cl => {
              if (typeof cl === "object" && cl !== null) {
                return `${cl.codigo || ""} - ${cl.nombre || ""}`;
              }
              return cl;
            })
            .join("\n")
        : "";

      return [
        c.contrato_id || "",
        c.contratante || "",
        c.entidad || "",
        c.tipo_negocio || "",
        c.cuantia || 0,
        c.smmlv || 0,
        c.objeto || "",
        actividades,
        clases
      ];
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    /* ===== ANCHOS DE COLUMNA ===== */

    ws["!cols"] = [
      { wch: 15 },
      { wch: 30 },
      { wch: 15 },
      { wch: 22 },
      { wch: 16 },
      { wch: 10 },
      { wch: 45 },
      { wch: 40 },
      { wch: 40 }
    ];

    /* ===== ALTURA DE FILAS ===== */

    ws["!rows"] = [{ hpt: 28 }];

    rows.forEach(r => {

      const lineas = Math.max(
        (r[6] || "").split("\n").length,
        (r[7] || "").split("\n").length,
        (r[8] || "").split("\n").length
      );

      ws["!rows"].push({
        hpt: Math.max(28, lineas * 16)
      });

    });

    /* ===== ESTILOS ===== */

    const range = XLSX.utils.decode_range(ws["!ref"]);

    for (let R = range.s.r; R <= range.e.r; ++R) {

      for (let C = range.s.c; C <= range.e.c; ++C) {

        const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];

        if (!cell) continue;

        cell.s = {
          alignment: {
            vertical: "center",
            horizontal: "left",
            wrapText: true
          },
          font: {
            name: "Calibri",
            sz: 11
          }
        };

        /* encabezado */

        if (R === 0) {

          cell.s = {
            font: {
              bold: true,
              sz: 12
            },
            alignment: {
              horizontal: "center",
              vertical: "center"
            }
          };

        }

      }

    }

    /* ===== FORMATO MONEDA ===== */

    for (let i = 0; i < rows.length; i++) {

      const cell = ws["E" + (i + 2)];

      if (cell) {
        cell.t = "n";
        cell.z = '"$"#,##0';
      }

    }

    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "Contratos");

    XLSX.writeFile(wb, "reporte_contratos_detallado.xlsx");

  });

/* =========================================================
   EXPORTAR DASHBOARD PDF (VERSIÓN FINAL AJUSTADA)
========================================================= */

document
  .getElementById("btn-exportar-pdf-dashboard")
  ?.addEventListener("click", async function () {

    if (!document.body.classList.contains("modo-estrategico")) {
      alert("Activa el Dashboard Estratégico para exportar.");
      return;
    }

    if (!chartSegmento || !chartEntidad || !chartTipo) {
      alert("Los gráficos aún no están cargados.");
      return;
    }

    const pdf = new window.jspdf.jsPDF({
      orientation: "landscape",
      unit: "px",
      format: "a4"
    });

    const pageWidth = pdf.internal.pageSize.getWidth();

    /* ===== TITULO ===== */

    pdf.setFontSize(18);
    pdf.text("Dashboard Estratégico - Experiencia Contractual", 40, 40);

    /* ===== NARRATIVA ===== */

    const narrativa =
      document.querySelector("#dashboard-narrativa")?.innerText || "";

    pdf.setFontSize(11);
    pdf.text(narrativa, 40, 70, { maxWidth: pageWidth - 80 });

    /* ===== GRAFICAS ===== */

    const img1 = chartSegmento.toBase64Image();
    const img2 = chartEntidad.toBase64Image();
    const img3 = chartTipo.toBase64Image();

    const margin = 40;
    const spacing = 20;
    const availableWidth = pageWidth - (margin * 2);
    const graphWidth = (availableWidth - (spacing * 2)) / 3;
    const graphHeight = graphWidth;

    const yGraficas = 140;

    pdf.addImage(img1, "PNG", margin, yGraficas, graphWidth, graphHeight);

    pdf.addImage(
      img2,
      "PNG",
      margin + graphWidth + spacing,
      yGraficas,
      graphWidth,
      graphHeight
    );

    pdf.addImage(
      img3,
      "PNG",
      margin + (graphWidth + spacing) * 2,
      yGraficas,
      graphWidth,
      graphHeight
    );

/* ===== CAPTURAR BLOQUE DE CLASES ===== */

const ranking = document.getElementById("bloque-ranking-clases");

ranking.style.paddingRight = "60px";
ranking.style.paddingBottom = "20px";

const canvas = await html2canvas(ranking, {
  scale: 2,
  useCORS: true,
  backgroundColor: "#ffffff"
});

const imgRanking = canvas.toDataURL("image/png");

const imgWidth = pageWidth - (margin * 2);
const imgHeight = canvas.height * imgWidth / canvas.width;

const pageHeight = pdf.internal.pageSize.getHeight();

const yRanking = yGraficas + graphHeight + 25;

/* ===== DETECTAR SI CABE EN LA PAGINA ===== */

if (yRanking + imgHeight > pageHeight) {

  pdf.addPage();

  pdf.addImage(
    imgRanking,
    "PNG",
    margin,
    60,
    imgWidth,
    imgHeight
  );

} else {

  pdf.addImage(
    imgRanking,
    "PNG",
    margin,
    yRanking,
    imgWidth,
    imgHeight
  );

}

    pdf.save("dashboard_estrategico.pdf");

  });