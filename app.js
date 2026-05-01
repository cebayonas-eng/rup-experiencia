let contratos = [];
let contratosFiltrados = [];
let clasesSeleccionadas = [];

let chartSegmento = null;
let chartEntidad = null;
let chartTipo = null;
let dashboardActivo = false;
let resizeTimeoutGlobal = null;

/* ================================
   LOGIN SIMPLE (NO ROMPE APP)
================================ */

// 👉 CAMBIA TU CONTRASEÑA AQUÍ
const PASSWORD_APP = "admin123";

// Crear login dinámicamente
function crearLogin() {
  const loginHTML = `
    <div id="login-overlay" style="
      position: fixed;
      inset: 0;
      background: linear-gradient(135deg,#1f3c88,#2563eb);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999999;
    ">
      <div style="
        background: white;
        padding: 40px;
        border-radius: 16px;
        width: 380px;
        text-align: center;
        box-shadow: 0 20px 50px rgba(0,0,0,0.25);
      ">
        <h2 style="margin-bottom:10px;">Experiencia Contractual</h2>
        <p style="color:#64748b;margin-bottom:20px;">
          Ingresa la contraseña para continuar
        </p>

        <input 
          type="password" 
          id="login-password"
          placeholder="Contraseña"
          style="
            width:100%;
            padding:12px;
            border:1px solid #cbd5e1;
            border-radius:10px;
            margin-bottom:15px;
          "
        >

        <button id="login-btn" style="
          width:100%;
          padding:12px;
          background:#2563eb;
          color:white;
          border:none;
          border-radius:10px;
          font-weight:bold;
          cursor:pointer;
        ">
          Iniciar sesión
        </button>

        <p id="login-error" style="
          color:red;
          font-size:13px;
          margin-top:10px;
          display:none;
        ">
          Contraseña incorrecta
        </p>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", loginHTML);
}

// Validar login
function initLogin() {
  const sessionActiva = localStorage.getItem("auth");

  //if (sessionActiva === "ok") return; // ya autenticado

  crearLogin();

  const btn = document.getElementById("login-btn");
  const input = document.getElementById("login-password");
  const error = document.getElementById("login-error");

  btn.addEventListener("click", () => {
    if (input.value === PASSWORD_APP) {
      localStorage.setItem("auth", "ok");
      document.getElementById("login-overlay").remove();
    } else {
      error.style.display = "block";
    }
  });

  // Enter también funciona
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") btn.click();
  });
}

// Ejecutar login ANTES de todo
initLogin();


function obtenerValorRUP(c) {
  return (c?.rup ?? c?.RUP ?? c?.id_rup ?? c?.idRup ?? "").toString().trim();
}

function obtenerValorContrato(c) {
  return (c?.contrato ?? c?.contrato_id ?? c?.Contrato ?? "").toString().trim();
}

function obtenerValorTerminacion(c) {
  const valor = c?.terminacion ?? c?.["terminación"] ?? c?.Terminacion ?? c?.["Terminación"] ?? "";
  if (valor === null || valor === undefined) return "";

  if (typeof valor === "number" && Number.isFinite(valor)) {
    const s = String(Math.trunc(valor));
    const m = s.match(/\b(19|20)\d{2}\b/);
    return m ? m[0] : s;
  }

  const txt = String(valor).trim();
  const m = txt.match(/\b(19|20)\d{2}\b/);
  return m ? m[0] : txt;
}

function obtenerTextoClase(cl) {
  const codigo = (cl?.codigo || "").toString().trim();
  const nombre = (cl?.nombre || "").toString().trim();

  if (codigo && nombre) return `${codigo} - ${nombre}`;
  return codigo || nombre || "";
}

/* =========================================================
   INICIALIZACIÓN GENERAL
========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
  await cargarDatos();
  configurarBotonLimpiar();
  configurarBotonDashboard();
  configurarExportarExcel();
  configurarExportarPDF();
  configurarRedibujadoResponsive();
});

/* =========================================================
   CARGA DE DATOS
========================================================= */

async function cargarDatos() {
  try {
    const response = await fetch("contratos.json");

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    contratos = await response.json();
    contratosFiltrados = [...contratos];

    inicializarSelects();
    configurarBuscadores();
    configurarBusquedaMultipleClases();
    restaurarEstadoFiltros();

    aplicarFiltros();
  } catch (error) {
    console.error("Error cargando contratos.json:", error);
    alert("No fue posible cargar los datos de contratos.");
  }
}

/* =========================================================
   VISUALIZACIÓN DE FILTROS ACTIVOS
========================================================= */

function marcarFiltroActivo(el) {
  if (!el) return;

  const valor = (el.value || "").toString().trim().toLowerCase();

  if (valor !== "" && valor !== "todos") {
    el.classList.add("filtro-activo");
  } else {
    el.classList.remove("filtro-activo");
  }
}

function actualizarBarraFiltros() {
  const barra = document.getElementById("barra-filtros-activos");
  if (!barra) return;

  const filtros = [];

  const contratante = document.getElementById("filtro-contratante")?.value;
  const entidad = document.getElementById("filtro-entidad")?.value;
  const tipo = document.getElementById("filtro-tipo")?.value;
  const rup = document.getElementById("filtro-rup")?.value;
  const contrato = document.getElementById("filtro-contrato")?.value;
  const terminacion = document.getElementById("filtro-terminacion")?.value;
  const clase = document.getElementById("filtroClaseTexto")?.value;
  const actividad = document.getElementById("filtroActividadTexto")?.value;
  const libre = document.getElementById("buscador")?.value;

  if (contratante && contratante !== "todos") filtros.push("Contratante: " + contratante);
  if (entidad && entidad !== "todos") filtros.push("Entidad: " + entidad);
  if (tipo && tipo !== "todos") filtros.push("Tipo: " + tipo);
  if (rup) filtros.push("ID RUP: " + rup);
  if (contrato) filtros.push("Contrato: " + contrato);
  if (terminacion && terminacion !== "todos") filtros.push("Terminación: " + terminacion);
  if (clase) filtros.push("Clase: " + clase);
  if (actividad) filtros.push("Actividad: " + actividad);
  if (libre) filtros.push("Búsqueda: " + libre);

  if (clasesSeleccionadas.length) {
    filtros.push("Clases múltiples: " + clasesSeleccionadas.join(" | "));
  }

  if (!filtros.length) {
    barra.innerHTML = "";
    barra.style.display = "none";
    return;
  }

  barra.style.display = "block";
  barra.innerHTML = "<strong>Filtros activos:</strong> " + filtros.join(" | ");
}

/* =========================================================
   SELECTS
========================================================= */

function inicializarSelects() {
  const selectContratante = document.getElementById("filtro-contratante");
  const selectEntidad = document.getElementById("filtro-entidad");
  const selectTipo = document.getElementById("filtro-tipo");
  const selectTerminacion = document.getElementById("filtro-terminacion");

  if (!selectContratante || !selectEntidad || !selectTipo || !selectTerminacion) return;

  const contratantes = [...new Set(contratos.map(c => c.contratante).filter(Boolean))].sort();
  const entidades = [...new Set(contratos.map(c => c.entidad).filter(Boolean))].sort();
  const tipos = [...new Set(contratos.map(c => c.tipo_negocio).filter(Boolean))].sort();
  const terminaciones = [...new Set(contratos.map(c => obtenerValorTerminacion(c)).filter(Boolean))]
    .sort((a, b) => Number(b) - Number(a) || String(b).localeCompare(String(a)));

  selectContratante.innerHTML = `<option value="todos">Todos los contratantes</option>`;
  selectEntidad.innerHTML = `<option value="todos">Todas las entidades</option>`;
  selectTipo.innerHTML = `<option value="todos">Clasificacion Cluster</option>`;
  selectTerminacion.innerHTML = `<option value="todos">Todos los años de terminación</option>`;

  contratantes.forEach(v => {
    selectContratante.innerHTML += `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`;
  });

  entidades.forEach(v => {
    selectEntidad.innerHTML += `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`;
  });

  tipos.forEach(v => {
    selectTipo.innerHTML += `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`;
  });

  terminaciones.forEach(v => {
    selectTerminacion.innerHTML += `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`;
  });

  selectContratante.addEventListener("change", aplicarFiltros);
  selectEntidad.addEventListener("change", aplicarFiltros);
  selectTipo.addEventListener("change", aplicarFiltros);
  selectTerminacion.addEventListener("change", aplicarFiltros);
  document.getElementById("filtro-rup")?.addEventListener("input", aplicarFiltros);
  document.getElementById("filtro-contrato")?.addEventListener("input", aplicarFiltros);
}

/* =========================================================
   AUTOCOMPLETE
========================================================= */

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

    aplicarFiltros();

    box.innerHTML = "";

    if (!texto) {
      box.style.display = "none";
      return;
    }

    const valores = dataFunction();
    const coincidencias = valores
      .filter(v => normalizarTexto(v).includes(texto))
      .slice(0, 12);

    if (!coincidencias.length) {
      box.style.display = "none";
      return;
    }

    coincidencias.forEach(v => {
      const item = document.createElement("div");
      item.className = "sugerencia-item";
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

  input.addEventListener("focus", () => {
    if (input.value.trim()) {
      input.dispatchEvent(new Event("input"));
    }
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      box.style.display = "none";
    }
  });

  document.addEventListener("click", (e) => {
    if (!input.contains(e.target) && !box.contains(e.target)) {
      box.style.display = "none";
    }
  });
}

/* =========================================================
   BÚSQUEDA MÚLTIPLE POR CLASE
========================================================= */

function configurarBusquedaMultipleClases() {
  const input = document.getElementById("filtroClaseMulti");
  const btnAgregar = document.getElementById("btnAgregarClaseMulti");
  const btnLimpiar = document.getElementById("btnLimpiarClasesMulti");
  const box = document.getElementById("sugerenciasClaseMulti");

  if (!input || !btnAgregar || !btnLimpiar || !box) {
    console.warn("Búsqueda múltiple por clase: faltan elementos HTML.");
    return;
  }

  btnAgregar.addEventListener("click", () => {
    agregarClaseMultiple(input.value);
  });

  btnLimpiar.addEventListener("click", () => {
    limpiarClasesMultiples();
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      agregarClaseMultiple(input.value);
    }

    if (e.key === "Escape") {
      box.style.display = "none";
    }
  });

  input.addEventListener("input", () => {
    const texto = normalizarTexto(input.value);
    box.innerHTML = "";

    if (!texto) {
      box.style.display = "none";
      return;
    }

    const coincidencias = obtenerClasesTodas()
      .filter(v => normalizarTexto(v).includes(texto))
      .filter(v => !clasesSeleccionadas.includes(v))
      .slice(0, 12);

    if (!coincidencias.length) {
      box.style.display = "none";
      return;
    }

    coincidencias.forEach(v => {
      const item = document.createElement("div");
      item.className = "sugerencia-item";
      item.textContent = v;

      item.addEventListener("click", () => {
        agregarClaseMultiple(v);
        box.style.display = "none";
      });

      box.appendChild(item);
    });

    box.style.display = "block";
  });

  input.addEventListener("focus", () => {
    if (input.value.trim()) {
      input.dispatchEvent(new Event("input"));
    }
  });

  document.addEventListener("click", (e) => {
    if (!input.contains(e.target) && !box.contains(e.target)) {
      box.style.display = "none";
    }
  });

  renderChipsClases();
}

function obtenerClasesTodas() {
  const mapa = new Map();

  contratos.forEach(c => {
    if (!Array.isArray(c.clases)) return;

    c.clases.forEach(cl => {
      const codigo = (cl?.codigo || "").toString().trim();
      const nombre = (cl?.nombre || "").toString().trim();
      const texto = obtenerTextoClase(cl);

      if (!texto) return;

      // La clave principal debe ser el código de clase.
      // Si no hay código, usa el texto completo como respaldo.
      const clave = normalizarTexto(codigo || texto);
      if (!clave) return;

      // Solo deja una aparición por código
      if (!mapa.has(clave)) {
        mapa.set(clave, texto);
      }
    });
  });

  return [...mapa.values()].sort((a, b) =>
    a.localeCompare(b, "es", { numeric: true, sensitivity: "base" })
  );
}

function agregarClaseMultiple(valor) {
  const input = document.getElementById("filtroClaseMulti");
  const box = document.getElementById("sugerenciasClaseMulti");

  const limpio = (valor || "").toString().trim();
  if (!limpio) return;

  const todas = obtenerClasesTodas();
  const normalizado = normalizarTexto(limpio);

  let claseFinal = todas.find(v => normalizarTexto(v) === normalizado);

  if (!claseFinal) {
    claseFinal = todas.find(v => normalizarTexto(v).includes(normalizado));
  }

  if (!claseFinal) {
    claseFinal = limpio;
  }

  if (!clasesSeleccionadas.includes(claseFinal)) {
    clasesSeleccionadas.push(claseFinal);
  }

  if (input) input.value = "";
  if (box) {
    box.innerHTML = "";
    box.style.display = "none";
  }

  renderChipsClases();
  aplicarFiltros();
}

function quitarClaseMultiple(index) {
  clasesSeleccionadas.splice(index, 1);
  renderChipsClases();
  aplicarFiltros();
}

function limpiarClasesMultiples() {
  clasesSeleccionadas = [];

  const input = document.getElementById("filtroClaseMulti");
  const box = document.getElementById("sugerenciasClaseMulti");

  if (input) input.value = "";
  if (box) {
    box.innerHTML = "";
    box.style.display = "none";
  }

  renderChipsClases();
  aplicarFiltros();
}

function renderChipsClases() {
  const contenedor = document.getElementById("chipsClasesMulti");
  if (!contenedor) return;

  contenedor.innerHTML = "";

  if (!clasesSeleccionadas.length) return;

  clasesSeleccionadas.forEach((clase, index) => {
    const chip = document.createElement("span");
    chip.className = "chip-clase-multi";
    chip.style.display = "inline-flex";
    chip.style.alignItems = "center";
    chip.style.gap = "8px";
    chip.style.padding = "8px 12px";
    chip.style.margin = "6px 8px 0 0";
    chip.style.borderRadius = "999px";
    chip.style.background = "#e8f0ff";
    chip.style.color = "#1e3a8a";
    chip.style.fontWeight = "600";
    chip.style.fontSize = "13px";

    const texto = document.createElement("span");
    texto.textContent = clase;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "×";
    btn.style.border = "none";
    btn.style.background = "transparent";
    btn.style.cursor = "pointer";
    btn.style.fontSize = "16px";
    btn.style.fontWeight = "700";
    btn.style.color = "#1e3a8a";
    btn.title = "Quitar clase";

    btn.addEventListener("click", () => quitarClaseMultiple(index));

    chip.appendChild(texto);
    chip.appendChild(btn);

    contenedor.appendChild(chip);
  });
}

/* =========================================================
   SUGERENCIAS DINÁMICAS
========================================================= */

function obtenerActividades() {
  const set = new Set();

  contratosFiltrados.forEach(c => {
    if (Array.isArray(c.actividades)) {
      c.actividades.forEach(a => {
        if (typeof a === "string") {
          set.add(a);
        } else if (a?.nombre) {
          set.add(a.nombre);
        } else if (a?.descripcion) {
          set.add(a.descripcion);
        }
      });
    }
  });

  return [...set].sort();
}

function obtenerClases() {
  const set = new Set();

  contratosFiltrados.forEach(c => {
    if (Array.isArray(c.clases)) {
      c.clases.forEach(cl => {
        const txt = obtenerTextoClase(cl);
        if (txt) set.add(txt);
      });
    }
  });

  return [...set].sort();
}

function obtenerObjetos() {
  const set = new Set();

  contratosFiltrados.forEach(c => {
    if (c.objeto) set.add(c.objeto);
    if (c.contratante) set.add(c.contratante);
  });

  return [...set].sort();
}

/* =========================================================
   FILTROS
========================================================= */

function aplicarFiltros() {
  const textoActividad = normalizarTexto(document.getElementById("filtroActividadTexto")?.value);
  const textoClase = normalizarTexto(document.getElementById("filtroClaseTexto")?.value);
  const textoLibre = normalizarTexto(document.getElementById("buscador")?.value);

  const selContratante = document.getElementById("filtro-contratante")?.value || "todos";
  const selEntidad = document.getElementById("filtro-entidad")?.value || "todos";
  const selTipo = document.getElementById("filtro-tipo")?.value || "todos";
  const txtRup = normalizarTexto(document.getElementById("filtro-rup")?.value);
  const txtContrato = normalizarTexto(document.getElementById("filtro-contrato")?.value);
  const selTerminacion = document.getElementById("filtro-terminacion")?.value || "todos";

  const datosBase = contratos.filter(c => {
    if (selContratante !== "todos" && c.contratante !== selContratante) return false;
    if (selEntidad !== "todos" && c.entidad !== selEntidad) return false;
    if (selTipo !== "todos" && c.tipo_negocio !== selTipo) return false;

    if (txtRup) {
      const rup = normalizarTexto(obtenerValorRUP(c));
      if (!rup.includes(txtRup)) return false;
    }

    if (txtContrato) {
      const contrato = normalizarTexto(obtenerValorContrato(c));
      if (!contrato.includes(txtContrato)) return false;
    }

    if (selTerminacion !== "todos") {
      const terminacion = obtenerValorTerminacion(c);
      if (terminacion !== selTerminacion) return false;
    }

    if (textoActividad) {
      const ok = Array.isArray(c.actividades) && c.actividades.some(a => {
        if (typeof a === "string") return normalizarTexto(a).includes(textoActividad);

        return (
          normalizarTexto(a?.nombre).includes(textoActividad) ||
          normalizarTexto(a?.descripcion).includes(textoActividad)
        );
      });

      if (!ok) return false;
    }

    // SOLO aplica clase simple si NO hay clases múltiples
    if (textoClase && !clasesSeleccionadas.length) {
      const ok = Array.isArray(c.clases) && c.clases.some(cl => {
        const codigo = normalizarTexto(cl?.codigo);
        const nombre = normalizarTexto(cl?.nombre);
        const combinado = normalizarTexto(obtenerTextoClase(cl));

        return (
          codigo.includes(textoClase) ||
          nombre.includes(textoClase) ||
          combinado.includes(textoClase)
        );
      });

      if (!ok) return false;
    }

    if (textoLibre) {
      const objeto = normalizarTexto(c.objeto);
      const contratante = normalizarTexto(c.contratante);

      if (!(objeto.includes(textoLibre) || contratante.includes(textoLibre))) {
        return false;
      }
    }

    return true;
  });

  let resultadoFinal = datosBase;

  // FILTRO MÚLTIPLE POR CONTRATO (RUP + CONTRATO)
  if (clasesSeleccionadas.length) {
    const grupos = new Map();

    datosBase.forEach(c => {
      const clave = `${obtenerValorRUP(c)}__${obtenerValorContrato(c)}`;
      if (!grupos.has(clave)) grupos.set(clave, []);
      grupos.get(clave).push(c);
    });

    const contratosValidos = new Set();

    grupos.forEach((filasContrato, clave) => {
      const clasesDelContrato = [];

      filasContrato.forEach(c => {
        if (!Array.isArray(c.clases)) return;

        c.clases.forEach(cl => {
          const codigo = normalizarTexto(cl?.codigo);
          const nombre = normalizarTexto(cl?.nombre);
          const combinado = normalizarTexto(obtenerTextoClase(cl));

          if (codigo) clasesDelContrato.push(codigo);
          if (nombre) clasesDelContrato.push(nombre);
          if (combinado) clasesDelContrato.push(combinado);
        });
      });

      const cumpleTodas = clasesSeleccionadas.every(claseBuscada => {
        const buscada = normalizarTexto(claseBuscada);

        // Si viene como "432315 - Equipos...", tomamos el código antes del guion
        const codigoBuscado = buscada.split(" - ")[0].trim();

        return clasesDelContrato.some(existente => {
          const ex = normalizarTexto(existente);

          // Coincide por código exacto o por texto completo
          return ex === codigoBuscado || ex.includes(buscada) || ex.includes(codigoBuscado);
        });
      });

      if (cumpleTodas) {
        contratosValidos.add(clave);
      }
    });

    resultadoFinal = datosBase.filter(c => {
      const clave = `${obtenerValorRUP(c)}__${obtenerValorContrato(c)}`;
      return contratosValidos.has(clave);
    });
  }

  contratosFiltrados = resultadoFinal;

  renderTabla(contratosFiltrados);
  actualizarKPIs(contratosFiltrados);
  actualizarDashboardBase(contratosFiltrados);

  if (dashboardActivo) {
    renderizarGraficosDashboard(contratosFiltrados);
  } else {
    destruirGraficos();
  }

  marcarFiltroActivo(document.getElementById("filtro-contratante"));
  marcarFiltroActivo(document.getElementById("filtro-entidad"));
  marcarFiltroActivo(document.getElementById("filtro-tipo"));
  marcarFiltroActivo(document.getElementById("filtro-rup"));
  marcarFiltroActivo(document.getElementById("filtro-contrato"));
  marcarFiltroActivo(document.getElementById("filtro-terminacion"));
  marcarFiltroActivo(document.getElementById("filtroClaseTexto"));
  marcarFiltroActivo(document.getElementById("filtroActividadTexto"));
  marcarFiltroActivo(document.getElementById("buscador"));

  actualizarBarraFiltros();
  guardarEstadoFiltros();
}

/* =========================================================
   TABLA
========================================================= */

function renderTabla(lista) {
  const tbody = document.getElementById("tabla-contratos");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!lista.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center; padding:24px; color:#64748b; font-weight:600;">
          No hay contratos para los filtros actuales.
        </td>
      </tr>
    `;
    return;
  }

  lista.forEach((c, index) => {
    const tr = document.createElement("tr");
    tr.classList.add("fila-contrato");
    tr.dataset.index = index;

    tr.innerHTML = `
      <td>${escapeHtml(obtenerValorRUP(c))}</td>
      <td>${escapeHtml(obtenerValorContrato(c))}</td>
      <td>${escapeHtml(c.contratante || "")}</td>
      <td>${escapeHtml(c.entidad || "")}</td>
      <td>${escapeHtml(c.tipo_negocio || "")}</td>
      <td>${escapeHtml(obtenerValorTerminacion(c))}</td>
      <td>$${formatearNumero(Number(c.cuantia) || 0)}</td>
      <td>${formatearNumeroDecimal(Number(c.smmlv) || 0)}</td>
    `;

    tbody.appendChild(tr);

    const detalle = document.createElement("tr");
    detalle.classList.add("fila-detalle");
    detalle.style.display = "none";

    const actividadesHtml = Array.isArray(c.actividades)
      ? c.actividades.map(a => {
          if (typeof a === "string") return `<li>${escapeHtml(a)}</li>`;
          return `<li>${escapeHtml(a?.nombre || a?.descripcion || "")}</li>`;
        }).join("")
      : "";

    const clasesHtml = Array.isArray(c.clases)
      ? c.clases.map(cl => `
          <li><strong>${escapeHtml(cl?.codigo || "")}</strong> - ${escapeHtml(cl?.nombre || "")}</li>
        `).join("")
      : "";

    detalle.innerHTML = `
      <td colspan="8">
        <div class="detalle-contenido">
          <h4>Objeto</h4>
          <p>${escapeHtml(c.objeto || "")}</p>

          <h4>Actividades</h4>
          <ul>${actividadesHtml || "<li>Sin actividades registradas</li>"}</ul>

          <h4>Clases (UNSPSC)</h4>
          <ul>${clasesHtml || "<li>Sin clases registradas</li>"}</ul>
        </div>
      </td>
    `;

    tbody.appendChild(detalle);

    tr.addEventListener("click", () => {
      const visible = detalle.style.display === "table-row";
      detalle.style.display = visible ? "none" : "table-row";
    });
  });
}

/* =========================================================
   KPIs
========================================================= */

function actualizarKPIs(lista) {
  const totalCuantia = lista.reduce((acc, c) => acc + (Number(c.cuantia) || 0), 0);
  const totalSMMLV = lista.reduce((acc, c) => acc + (Number(c.smmlv) || 0), 0);

  const elCuantia = document.getElementById("total-cuantia");
  const elSmmlv = document.getElementById("total-smmlv");
  const elContratos = document.getElementById("total-contratos");
  const elContratantes = document.getElementById("total-contratantes");

  if (elCuantia) elCuantia.innerText = "$" + formatearNumero(totalCuantia);
  if (elSmmlv) elSmmlv.innerText = formatearNumeroDecimal(totalSMMLV);
  if (elContratos) elContratos.innerText = lista.length;
  if (elContratantes) {
    elContratantes.innerText = new Set(lista.map(c => c.contratante).filter(Boolean)).size;
  }
}

/* =========================================================
   BOTÓN LIMPIAR
========================================================= */

function configurarBotonLimpiar() {
  const btn = document.getElementById("btn-limpiar");
  if (!btn) return;

  btn.addEventListener("click", () => {
    ["filtroActividadTexto", "filtroClaseTexto", "buscador", "filtro-rup", "filtro-contrato", "filtroClaseMulti"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });

    ["filtro-contratante", "filtro-entidad", "filtro-tipo", "filtro-terminacion"].forEach(id => {
      const sel = document.getElementById(id);
      if (sel) sel.value = "todos";
    });

    clasesSeleccionadas = [];
    renderChipsClases();

    const boxMulti = document.getElementById("sugerenciasClaseMulti");
    if (boxMulti) {
      boxMulti.innerHTML = "";
      boxMulti.style.display = "none";
    }

    document.querySelectorAll(".sugerencias-box").forEach(box => {
      box.innerHTML = "";
      box.style.display = "none";
    });

    document.querySelectorAll(".filtro-activo").forEach(el => {
      el.classList.remove("filtro-activo");
    });

    localStorage.removeItem("estadoFiltros");

    aplicarFiltros();
    actualizarBarraFiltros();
  });
}

/* =========================================================
   DASHBOARD - CONTROL DE VISTA
========================================================= */

function configurarBotonDashboard() {
  const btnToggle = document.getElementById("btn-dashboard-toggle");
  if (!btnToggle) return;

  actualizarTextoBotonDashboard();

  btnToggle.addEventListener("click", () => {
    dashboardActivo = !dashboardActivo;
    document.body.classList.toggle("modo-estrategico", dashboardActivo);

    actualizarTextoBotonDashboard();

    if (dashboardActivo) {
      setTimeout(() => {
        actualizarDashboardCompleto(contratosFiltrados);
        redimensionarGraficos();
        scrollArriba();
      }, 220);
    } else {
      destruirGraficos();
      scrollArriba();
    }
  });
}

function actualizarTextoBotonDashboard() {
  const btnToggle = document.getElementById("btn-dashboard-toggle");
  if (!btnToggle) return;

  btnToggle.textContent = dashboardActivo
    ? "Volver a la Tabla"
    : "Ver Dashboard Estratégico";

  btnToggle.setAttribute("aria-pressed", dashboardActivo ? "true" : "false");
  btnToggle.title = dashboardActivo
    ? "Regresar a la vista tabular"
    : "Abrir la vista estratégica";
}

/* =========================================================
   DASHBOARD - AGRUPACIONES
========================================================= */

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
    if (!Array.isArray(c.clases)) return;

    c.clases.forEach(cl => {
      if (!cl?.codigo) return;

      const segmento = obtenerSegmento(cl.codigo);
      if (!segmento) return;

      map[segmento] = (map[segmento] || 0) + 1;
    });
  });

  return map;
}

function obtenerSegmento(codigo) {
  if (!codigo) return null;

  const seg = parseInt(codigo.toString().substring(0, 2), 10);

  if (seg >= 10 && seg <= 15) return "Materias primas";
  if (seg >= 20 && seg <= 27) return "Equipo industrial";
  if (seg >= 30 && seg <= 41) return "Componentes y suministros";
  if (seg >= 42 && seg <= 60) return "Productos uso final";
  if (seg >= 70 && seg <= 94) return "Servicios";
  if (seg === 95) return "Terrenos y estructuras";

  return null;
}

/* =========================================================
   DASHBOARD - ACTUALIZAR
========================================================= */

function actualizarDashboardBase(lista) {
  generarNarrativa(lista);
  actualizarTablaClases(lista);
}

function renderizarGraficosDashboard(lista) {
  renderChartSegmento(agruparPorSegmento(lista));

  renderChartDoughnut(
    "chart-entidad",
    agruparSimple(lista, "entidad"),
    "Participación por Entidad"
  );

  renderChartDoughnut(
    "chart-tipo",
    agruparSimple(lista, "tipo_negocio"),
    "Participación por Tipo de Negocio"
  );
}

function actualizarDashboardCompleto(lista) {
  actualizarDashboardBase(lista);
  renderizarGraficosDashboard(lista);
}

/* =========================================================
   DASHBOARD - RANKING CLASES
========================================================= */

function actualizarTablaClases(lista) {
  const mapa = {};

  lista.forEach(c => {
    if (!Array.isArray(c.clases)) return;

    c.clases.forEach(cl => {
      const nombre = cl?.nombre || "";
      const codigo = cl?.codigo || "";
      const key = codigo + "|" + nombre;

      if (!mapa[key]) mapa[key] = 0;
      mapa[key]++;
    });
  });

  const contenedor = document.getElementById("ranking-clases");
  if (!contenedor) return;

  contenedor.innerHTML = "";

  const total = Object.values(mapa).reduce((a, b) => a + b, 0);

  if (total === 0) {
    contenedor.innerHTML = `
      <div class="sin-datos" style="padding:16px; color:#64748b; font-weight:600;">
        No hay clases para mostrar con los filtros actuales.
      </div>
    `;
    return;
  }

  const ranking = Object.entries(mapa)
    .map(([k, v]) => {
      const [codigo, nombre] = k.split("|");
      return {
        codigo,
        nombre,
        valor: v,
        porcentajeReal: total ? (v / total) * 100 : 0
      };
    })
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 10);

  const maxValor = Math.max(...ranking.map(r => r.valor));

  ranking.forEach((r, index) => {
    const anchoBarra = maxValor ? (r.valor / maxValor) * 100 : 0;

    const fila = document.createElement("div");
    fila.className = "clase-item";

    fila.innerHTML = `
      <div class="clase-nombre">
        <strong>#${index + 1}</strong> &nbsp;
        <strong>${escapeHtml(r.codigo)}</strong> – ${escapeHtml(r.nombre)}
      </div>
      <div class="clase-barra-contenedor">
        <div class="clase-barra-fill" style="width:${anchoBarra}%"></div>
      </div>
      <div class="clase-porcentaje">
        ${r.porcentajeReal.toFixed(1)}%
      </div>
    `;

    contenedor.appendChild(fila);
  });
}

/* =========================================================
   DASHBOARD - LIMPIAR GRÁFICOS
========================================================= */

function destruirGraficos() {
  if (chartSegmento) {
    chartSegmento.destroy();
    chartSegmento = null;
  }

  if (chartEntidad) {
    chartEntidad.destroy();
    chartEntidad = null;
  }

  if (chartTipo) {
    chartTipo.destroy();
    chartTipo = null;
  }

  limpiarCanvas(document.getElementById("chart-segmento"));
  limpiarCanvas(document.getElementById("chart-entidad"));
  limpiarCanvas(document.getElementById("chart-tipo"));
}

/* =========================================================
   DASHBOARD - PLACEHOLDER SIN DATOS
========================================================= */

function mostrarMensajeCanvas(canvas, mensaje) {
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const parent = canvas.parentElement;
  const width = parent ? parent.clientWidth : 340;
  const height = parent ? parent.clientHeight : 340;

  canvas.width = width;
  canvas.height = height;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "600 16px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(mensaje, canvas.width / 2, canvas.height / 2);
}

/* =========================================================
   DASHBOARD - GRÁFICO PIE
========================================================= */

function renderChartSegmento(data) {
  const canvas = document.getElementById("chart-segmento");
  if (!canvas) return;

  if (chartSegmento) {
    chartSegmento.destroy();
    chartSegmento = null;
  }

  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);

  if (!entries.length) {
    mostrarMensajeCanvas(canvas, "Sin datos por segmento");
    return;
  }

  const labels = entries.map(e => e[0]);
  const values = entries.map(e => e[1]);

  const maxValue = Math.max(...values);

  const backgroundColors = values.map((v, index) => {
    if (v === maxValue) return "#F59E0B";

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

  chartSegmento = new Chart(canvas, {
    type: "pie",
    data: {
      labels,
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
          text: "Experiencia por Segmento de Clasificación",
          font: { size: 18, weight: "700" }
        },
        legend: {
          position: "left",
          labels: {
            boxWidth: 13,
            padding: 13,
            font: { size: 14 }
          }
        },
        datalabels: {
          formatter: (value, ctx) => {
            const total = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
            const porcentaje = total ? (value / total) * 100 : 0;
            return Math.round(porcentaje) + "%";
          },
          color: "#ffffff",
          font: { weight: "bold", size: 14 }
        }
      }
    },
    plugins: [ChartDataLabels]
  });
}

/* =========================================================
   DASHBOARD - GRÁFICOS DOUGHNUT
========================================================= */

function renderChartDoughnut(id, data, titulo) {
  const canvas = document.getElementById(id);
  if (!canvas) return;

  if (id === "chart-entidad" && chartEntidad) {
    chartEntidad.destroy();
    chartEntidad = null;
  }

  if (id === "chart-tipo" && chartTipo) {
    chartTipo.destroy();
    chartTipo = null;
  }

  const entries = Object.entries(data)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  if (!entries.length) {
    mostrarMensajeCanvas(canvas, "Sin datos disponibles");
    return;
  }

  const labels = entries.map(e => e[0]);
  const values = entries.map(e => e[1]);

  const chartRef = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: [
          "#0A3D62",
          "#1E6091",
          "#3A86FF",
          "#8338EC",
          "#FF006E",
          "#FB5607",
          "#FFBE0B",
          "#10B981",
          "#64748B",
          "#8B5CF6"
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
          font: { size: 17, weight: "600" }
        },
        legend: {
          position: "right",
          labels: {
            boxWidth: 13,
            padding: 13,
            font: { size: 13 }
          }
        },
        datalabels: {
          formatter: (value, ctx) => {
            const total = ctx.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
            const porcentaje = total ? (value / total) * 100 : 0;
            return Math.round(porcentaje) + "%";
          },
          color: "#ffffff",
          font: {
            weight: "bold",
            size: 14
          }
        }
      }
    },
    plugins: [ChartDataLabels]
  });

  if (id === "chart-entidad") chartEntidad = chartRef;
  if (id === "chart-tipo") chartTipo = chartRef;
}

/* =========================================================
   DASHBOARD - NARRATIVA
========================================================= */

function generarNarrativa(lista) {
  const contenedor = document.getElementById("dashboard-narrativa");
  if (!contenedor) return;

  if (!lista || !lista.length) {
    contenedor.innerHTML = `
      <div class="narrativa-card">
        <h3>Análisis Estratégico</h3>
        <p>No hay resultados para los filtros actuales.</p>
      </div>
    `;
    return;
  }

  const totalContratos = lista.length;
  const totalCuantia = lista.reduce((a, c) => a + (Number(c.cuantia) || 0), 0);
  const totalEntidades = new Set(lista.map(c => c.entidad).filter(Boolean)).size;
  const totalContratantes = new Set(lista.map(c => c.contratante).filter(Boolean)).size;

  const segmentos = agruparPorSegmento(lista);
  const ordenados = Object.entries(segmentos).sort((a, b) => b[1] - a[1]);

  let bloqueSegmento = "";

  if (ordenados.length) {
    const totalSegmentos = ordenados.reduce((acc, [, v]) => acc + v, 0);
    const [dominante, cantidad] = ordenados[0];
    const porcentaje = totalSegmentos ? Math.round((cantidad / totalSegmentos) * 100) : 0;

    bloqueSegmento = `
      La experiencia contractual se concentra principalmente en
      <strong>${escapeHtml(dominante)}</strong>,
      representando el <strong>${porcentaje}%</strong> del total clasificado.
    `;
  } else {
    bloqueSegmento = `
      No se identificó clasificación suficiente por segmentos para los filtros actuales.
    `;
  }

  contenedor.innerHTML = `
    <div class="narrativa-card">
      <h3>Análisis Estratégico</h3>
      <p>
        Se identifican <strong>${totalContratos}</strong> contratos,
        con una cuantía acumulada de
        <strong>$${formatearNumero(totalCuantia)}</strong>,
        distribuidos entre <strong>${totalEntidades}</strong> entidades
        y <strong>${totalContratantes}</strong> contratantes.
      </p>
      <p style="margin-top:12px;">
        ${bloqueSegmento}
      </p>
    </div>
  `;
}

/* =========================================================
   GUARDAR / RESTAURAR FILTROS
========================================================= */

function guardarEstadoFiltros() {
  const estado = {
    contratante: document.getElementById("filtro-contratante")?.value || "todos",
    entidad: document.getElementById("filtro-entidad")?.value || "todos",
    tipo: document.getElementById("filtro-tipo")?.value || "todos",
    rup: document.getElementById("filtro-rup")?.value || "",
    contrato: document.getElementById("filtro-contrato")?.value || "",
    terminacion: document.getElementById("filtro-terminacion")?.value || "todos",
    clase: document.getElementById("filtroClaseTexto")?.value || "",
    actividad: document.getElementById("filtroActividadTexto")?.value || "",
    buscador: document.getElementById("buscador")?.value || "",
    clasesMultiples: clasesSeleccionadas || []
  };

  localStorage.setItem("estadoFiltros", JSON.stringify(estado));
}

function restaurarEstadoFiltros() {
  const estado = JSON.parse(localStorage.getItem("estadoFiltros") || "null");
  if (!estado) return;

  const elContratante = document.getElementById("filtro-contratante");
  const elEntidad = document.getElementById("filtro-entidad");
  const elTipo = document.getElementById("filtro-tipo");
  const elRup = document.getElementById("filtro-rup");
  const elContrato = document.getElementById("filtro-contrato");
  const elTerminacion = document.getElementById("filtro-terminacion");
  const elClase = document.getElementById("filtroClaseTexto");
  const elActividad = document.getElementById("filtroActividadTexto");
  const elBuscador = document.getElementById("buscador");

  if (elContratante) elContratante.value = estado.contratante || "todos";
  if (elEntidad) elEntidad.value = estado.entidad || "todos";
  if (elTipo) elTipo.value = estado.tipo || "todos";
  if (elRup) elRup.value = estado.rup || "";
  if (elContrato) elContrato.value = estado.contrato || "";
  if (elTerminacion) elTerminacion.value = estado.terminacion || "todos";
  if (elClase) elClase.value = estado.clase || "";
  if (elActividad) elActividad.value = estado.actividad || "";
  if (elBuscador) elBuscador.value = estado.buscador || "";

  clasesSeleccionadas = Array.isArray(estado.clasesMultiples) ? estado.clasesMultiples : [];
  renderChipsClases();
}

/* =========================================================
   EXPORTAR EXCEL
========================================================= */

function configurarExportarExcel() {
  document
    .getElementById("btn-exportar-excel")
    ?.addEventListener("click", function () {

      if (!contratosFiltrados || !contratosFiltrados.length) {
        alert("No hay datos para exportar.");
        return;
      }

      const headers = [
        "ID RUP",
        "Contrato",
        "Contratante",
        "Entidad",
        "Tipo Negocio",
        "Terminación",
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
        } else if (typeof c.actividades === "string") {
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
          obtenerValorRUP(c),
          obtenerValorContrato(c),
          c.contratante || "",
          c.entidad || "",
          c.tipo_negocio || "",
          obtenerValorTerminacion(c),
          Number(c.cuantia) || 0,
          Number(c.smmlv) || 0,
          c.objeto || "",
          actividades,
          clases
        ];
      });

      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

      ws["!cols"] = [
        { wch: 16 },
        { wch: 18 },
        { wch: 30 },
        { wch: 20 },
        { wch: 22 },
        { wch: 14 },
        { wch: 16 },
        { wch: 12 },
        { wch: 45 },
        { wch: 40 },
        { wch: 40 }
      ];

      ws["!rows"] = [{ hpt: 28 }];

      rows.forEach(r => {
        const lineas = Math.max(
          String(r[8] || "").split("\n").length,
          String(r[9] || "").split("\n").length,
          String(r[10] || "").split("\n").length
        );

        ws["!rows"].push({
          hpt: Math.max(28, lineas * 16)
        });
      });

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

      for (let i = 0; i < rows.length; i++) {
        const cell = ws["G" + (i + 2)];
        if (cell) {
          cell.t = "n";
          cell.z = '"$"#,##0';
        }
      }

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Contratos");
      XLSX.writeFile(wb, "reporte_contratos_detallado.xlsx");
    });
}

/* =========================================================
   EXPORTAR DASHBOARD PDF
========================================================= */

function configurarExportarPDF() {
  document
    .getElementById("btn-exportar-pdf-dashboard")
    ?.addEventListener("click", async function () {

      if (!dashboardActivo) {
        alert("Activa el Dashboard Estratégico para exportar.");
        return;
      }

      if (!chartSegmento || !chartEntidad || !chartTipo) {
        alert("Los gráficos aún no están cargados.");
        return;
      }

      const ranking = document.getElementById("bloque-ranking-clases");
      if (!ranking) {
        alert("No se encontró el bloque de ranking.");
        return;
      }

      const pdf = new window.jspdf.jsPDF({
        orientation: "landscape",
        unit: "px",
        format: "a4"
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      pdf.setFontSize(18);
      pdf.text("Dashboard Estratégico - Experiencia Contractual", 40, 40);

      const narrativa = document.querySelector("#dashboard-narrativa")?.innerText || "";
      pdf.setFontSize(11);
      pdf.text(narrativa, 40, 70, { maxWidth: pageWidth - 80 });

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
      pdf.addImage(img2, "PNG", margin + graphWidth + spacing, yGraficas, graphWidth, graphHeight);
      pdf.addImage(img3, "PNG", margin + (graphWidth + spacing) * 2, yGraficas, graphWidth, graphHeight);

      const originalPaddingRight = ranking.style.paddingRight;
      const originalPaddingBottom = ranking.style.paddingBottom;

      ranking.style.paddingRight = "60px";
      ranking.style.paddingBottom = "20px";

      const canvas = await html2canvas(ranking, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff"
      });

      ranking.style.paddingRight = originalPaddingRight;
      ranking.style.paddingBottom = originalPaddingBottom;

      const imgRanking = canvas.toDataURL("image/png");
      const imgWidth = pageWidth - (margin * 2);
      const imgHeight = canvas.height * imgWidth / canvas.width;
      const yRanking = yGraficas + graphHeight + 25;

      if (yRanking + imgHeight > pageHeight) {
        pdf.addPage();
        pdf.addImage(imgRanking, "PNG", margin, 60, imgWidth, imgHeight);
      } else {
        pdf.addImage(imgRanking, "PNG", margin, yRanking, imgWidth, imgHeight);
      }

      pdf.save("dashboard_estrategico.pdf");
    });
}

/* =========================================================
   RESPONSIVE / REDIBUJADO
========================================================= */

function configurarRedibujadoResponsive() {
  window.addEventListener("resize", () => {
    if (!dashboardActivo) return;

    clearTimeout(resizeTimeoutGlobal);

    resizeTimeoutGlobal = setTimeout(() => {
      actualizarDashboardCompleto(contratosFiltrados);
      redimensionarGraficos();
    }, 180);
  });
}

function redimensionarGraficos() {
  if (chartSegmento) chartSegmento.resize();
  if (chartEntidad) chartEntidad.resize();
  if (chartTipo) chartTipo.resize();
}

function scrollArriba() {
  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

/* =========================================================
   UTILIDADES
========================================================= */

function limpiarCanvas(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

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

function escapeHtml(texto) {
  return String(texto || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

document.addEventListener("DOMContentLoaded", () => {
  const btnLogout = document.getElementById("btn-logout");

  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      localStorage.removeItem("auth");
      location.reload();
    });
  }
});