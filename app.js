let contratos = [];
let contratosFiltrados = [];

document.addEventListener("DOMContentLoaded", () => {
  cargarDatos();

  const btn = document.getElementById("btn-limpiar");

  if (btn) {
    btn.addEventListener("click", function() {

      ["filtroActividadTexto",
       "filtroClaseTexto",
       "filtroNombreClaseTexto",
       "buscador"]
      .forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
      });

      ["filtro-contratante",
       "filtro-entidad",
       "filtro-tipo"]
      .forEach(id => {
        const sel = document.getElementById(id);
        if (sel) sel.value = "todos";
      });

      document.querySelectorAll(".sugerencias-box")
        .forEach(box => box.style.display = "none");

      aplicarFiltros();
    });
  }
});

async function cargarDatos() {
  const response = await fetch("contratos.json");
  contratos = await response.json();
  contratosFiltrados = [...contratos];

  inicializarSelects();
  configurarBuscadores();
  configurarBotonLimpiar();
  aplicarFiltros();
  
}

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

function configurarBuscadores() {

  configurarAutocomplete("filtroActividadTexto", "sugerencias-actividad", obtenerActividades);
  configurarAutocomplete("filtroClaseTexto", "sugerencias-clase", obtenerClasesCodigoNombre);
  configurarAutocomplete("filtroNombreClaseTexto", "sugerencias-nombre-clase", obtenerNombresClase);
  configurarAutocomplete("buscador", "sugerencias-objeto", obtenerObjetos);
}

function configurarAutocomplete(inputId, boxId, dataFunction) {

  const input = document.getElementById(inputId);
  const box = document.getElementById(boxId);

  if (!input) return;

  input.addEventListener("input", () => {

    const texto = input.value.toLowerCase().trim();
    box.innerHTML = "";

    if (!texto) {
      box.style.display = "none";
      aplicarFiltros();
      return;
    }

    const valores = dataFunction();

    valores
      .filter(v => v.toLowerCase().includes(texto))
      .slice(0, 15)
      .forEach(v => {

        const div = document.createElement("div");
        div.textContent = v;

        div.onclick = () => {
          input.value = v;
          box.style.display = "none";
          aplicarFiltros();
        };

        box.appendChild(div);
      });

    box.style.display = box.children.length ? "block" : "none";
  });

  document.addEventListener("click", (e) => {
    if (!input.contains(e.target) && !box.contains(e.target)) {
      box.style.display = "none";
    }
  });
}

function obtenerActividades() {
  const set = new Set();
  contratos.forEach(c => {
    c.actividades?.forEach(a => {
      if (a?.nombre) set.add(a.nombre);
    });
  });
  return [...set];
}

function obtenerClasesCodigoNombre() {
  const set = new Set();
  contratos.forEach(c => {
    c.clases?.forEach(cl => {
      if (cl?.codigo && cl?.nombre) {
        set.add(cl.codigo + " - " + cl.nombre);
      }
    });
  });
  return [...set];
}

function obtenerNombresClase() {
  const set = new Set();

  contratos.forEach(c => {
    c.clases?.forEach(cl => {
      if (cl?.codigo && cl?.nombre) {
        set.add(cl.codigo + " - " + cl.nombre);
      }
    });
  });

  return [...set];
}

function obtenerObjetos() {
  const set = new Set();
  contratos.forEach(c => {
    if (c.objeto) set.add(c.objeto);
    if (c.contratante) set.add(c.contratante);
  });
  return [...set];
}

function aplicarFiltros() {

  const textoActividad = document.getElementById("filtroActividadTexto").value.toLowerCase().trim();
  const textoClase = document.getElementById("filtroClaseTexto").value.toLowerCase().trim();
  const textoNombreClase = document.getElementById("filtroNombreClaseTexto")?.value.toLowerCase().trim() || "";
  const textoLibre = document.getElementById("buscador").value.toLowerCase().trim();

  const selContratante = document.getElementById("filtro-contratante").value;
  const selEntidad = document.getElementById("filtro-entidad").value;
  const selTipo = document.getElementById("filtro-tipo").value;

  contratosFiltrados = contratos.filter(c => {

    if (selContratante !== "todos" && c.contratante !== selContratante) return false;
    if (selEntidad !== "todos" && c.entidad !== selEntidad) return false;
    if (selTipo !== "todos" && c.tipo_negocio !== selTipo) return false;

    if (textoActividad &&
        !c.actividades?.some(a =>
          a?.nombre?.toLowerCase().includes(textoActividad)))
      return false;

    if (textoClase &&
        !c.clases?.some(cl =>
          (cl?.codigo + " - " + cl?.nombre)?.toLowerCase().includes(textoClase)))
      return false;

    if (textoNombreClase &&
        !c.clases?.some(cl =>
          (cl?.codigo + " - " + cl?.nombre)
          ?.toLowerCase()
          .includes(textoNombreClase)))
      return false;

    if (textoLibre &&
        !(
          c.objeto?.toLowerCase().includes(textoLibre) ||
          c.contratante?.toLowerCase().includes(textoLibre)
        ))
      return false;

    return true;
  });

  renderTabla(contratosFiltrados);
  actualizarKPIs(contratosFiltrados);
}

function renderTabla(lista) {

  const tbody = document.getElementById("tabla-contratos");
  tbody.innerHTML = "";

  lista.forEach(c => {

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${c.contrato_id}</td>
      <td>${c.contratante}</td>
      <td>${c.entidad}</td>
      <td>${c.tipo_negocio}</td>
      <td>$${formatearNumero(c.cuantia || 0)}</td>
    `;

    tbody.appendChild(tr);
  });
}

function actualizarKPIs(lista) {

  const totalCuantia = lista.reduce((acc, c) => acc + (c.cuantia || 0), 0);
  const totalContratos = lista.length;
  const totalContratantes = new Set(lista.map(c => c.contratante)).size;

  document.getElementById("total-cuantia").innerText =
    "$" + formatearNumero(totalCuantia);

  document.getElementById("total-contratos").innerText =
    totalContratos;

  document.getElementById("total-contratantes").innerText =
    totalContratantes;
}

function formatearNumero(num) {
  return new Intl.NumberFormat("es-CO").format(num);
}

function configurarBotonLimpiar() {

  const btn = document.getElementById("btn-limpiar");

  if (!btn) {
    console.log("No se encontró btn-limpiar");
    return;
  }

  btn.addEventListener("click", function() {

    // Inputs texto
    const idsInputs = [
      "filtroActividadTexto",
      "filtroClaseTexto",
      "filtroNombreClaseTexto",
      "buscador"
    ];

    idsInputs.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });

    // Selects
    const idsSelects = [
      "filtro-contratante",
      "filtro-entidad",
      "filtro-tipo"
    ];

    idsSelects.forEach(id => {
      const sel = document.getElementById(id);
      if (sel) sel.value = "todos";
    });

    // Cerrar sugerencias
    document.querySelectorAll(".sugerencias-box")
      .forEach(box => box.style.display = "none");

    aplicarFiltros();
  });
}
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js")
      .then(() => console.log("Service Worker registrado"))
      .catch(err => console.log("Error SW:", err));
  });
}