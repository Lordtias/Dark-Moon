let siguienteIdComparacion = 1;

// Vista independiente para seleccionar un objeto equipado
// y mostrar una comparación detallada.
//
// No modifica inventario ni equipamiento.
export class VistaComparacionObjetos {
  constructor() {
    this.idTitulo = `tituloComparacionObjetos${siguienteIdComparacion}`;

    siguienteIdComparacion++;

    this.alSeleccionar = null;

    this.manejarClickOpciones = this.manejarClickOpciones.bind(this);

    this.elemento = crearElemento("article", "comparacion-objetos");

    this.construirEstructura();
    this.registrarEventos();
  }

  construirEstructura() {
    this.titulo = crearElemento("h2", "comparacion-objetos__titulo");

    this.titulo.id = this.idTitulo;

    this.subtitulo = crearElemento("p", "comparacion-objetos__subtitulo");

    this.seccionSelector = crearElemento(
      "section",
      "comparacion-objetos__selector",
    );

    this.listaOpciones = crearElemento("div", "comparacion-objetos__opciones");

    this.mensajeSinOpciones = crearElemento(
      "p",
      "comparacion-objetos__mensaje",
      "No hay otros objetos equipados para comparar.",
    );

    this.seccionSelector.append(this.listaOpciones, this.mensajeSinOpciones);

    this.seccionResultado = crearElemento(
      "section",
      "comparacion-objetos__resultado",
    );

    this.seccionResultado.hidden = true;

    this.construirResumenComparacion();
    this.construirTablaComparacion();
    this.construirCambiosAfijos();

    this.seccionResultado.append(
      this.resumenComparacion,
      this.contenedorTabla,
      this.contenedorAfijos,
    );

    this.elemento.append(
      this.titulo,
      this.subtitulo,
      this.seccionSelector,
      this.seccionResultado,
    );
  }

  construirResumenComparacion() {
    this.resumenComparacion = crearElemento(
      "div",
      "comparacion-objetos__resumen",
    );

    this.resumenInspeccionado = crearTarjetaResumen("Objeto inspeccionado");

    this.resumenElegido = crearTarjetaResumen("Objeto elegido");

    this.resumenComparacion.append(
      this.resumenInspeccionado.elemento,

      this.resumenElegido.elemento,
    );
  }

  construirTablaComparacion() {
    this.contenedorTabla = crearElemento(
      "div",
      "comparacion-objetos__tabla-contenedor",
    );

    this.tabla = crearElemento("table", "comparacion-objetos__tabla");

    const cabecera = document.createElement("thead");

    const fila = document.createElement("tr");

    for (const texto of [
      "Propiedad",
      "Inspeccionado",
      "Elegido",
      "Diferencia",
    ]) {
      const celda = document.createElement("th");

      celda.scope = "col";

      celda.textContent = texto;

      fila.appendChild(celda);
    }

    cabecera.appendChild(fila);

    this.cuerpoTabla = document.createElement("tbody");

    this.tabla.append(cabecera, this.cuerpoTabla);

    this.contenedorTabla.appendChild(this.tabla);
  }

  construirCambiosAfijos() {
    this.contenedorAfijos = crearElemento(
      "section",
      "comparacion-objetos__afijos",
    );

    const titulo = crearElemento(
      "h3",
      "comparacion-objetos__afijos-titulo",
      "Diferencias de afijos",
    );

    this.listaAfijos = crearElemento("ul", "comparacion-objetos__afijos-lista");

    this.mensajeSinAfijos = crearElemento(
      "p",
      "comparacion-objetos__mensaje",
      "Los objetos no presentan diferencias de afijos.",
    );

    this.contenedorAfijos.append(
      titulo,
      this.listaAfijos,
      this.mensajeSinAfijos,
    );
  }

  registrarEventos() {
    this.listaOpciones.addEventListener("click", this.manejarClickOpciones);
  }

  configurarSeleccionador(alSeleccionar) {
    if (alSeleccionar !== null && typeof alSeleccionar !== "function") {
      throw new Error(
        "El seleccionador de comparación debe ser una función o null.",
      );
    }

    this.alSeleccionar = alSeleccionar;
  }

  // No se filtra por tipo ni ranura:
  // el jugador puede elegir cualquier pieza.
  mostrarSelector({ presentacionBase, opciones } = {}) {
    validarPresentacionResumen(presentacionBase, "base");

    if (!Array.isArray(opciones)) {
      throw new Error("Las opciones de comparación deben ser una lista.");
    }

    this.titulo.textContent = "Elegí un objeto equipado";

    this.subtitulo.textContent = `Objeto inspeccionado: ${presentacionBase.nombre}`;

    this.seccionSelector.hidden = false;

    this.seccionResultado.hidden = true;

    this.listaOpciones.replaceChildren();

    const tieneOpciones = opciones.length > 0;

    this.listaOpciones.hidden = !tieneOpciones;

    this.mensajeSinOpciones.hidden = tieneOpciones;

    if (!tieneOpciones) {
      return;
    }

    const fragmento = document.createDocumentFragment();

    opciones.forEach((opcion, indice) => {
      validarOpcion(opcion, indice);

      fragmento.appendChild(
        crearBotonOpcion({
          opcion,
          indice,
        }),
      );
    });

    this.listaOpciones.appendChild(fragmento);
  }

  mostrarComparacion(comparacion) {
    validarComparacion(comparacion);

    this.titulo.textContent = "Comparación de objetos";

    this.subtitulo.textContent =
      "La comparación es informativa y no modifica el equipamiento.";

    this.seccionSelector.hidden = true;

    this.seccionResultado.hidden = false;

    actualizarTarjetaResumen(
      this.resumenInspeccionado,
      comparacion.inspeccionado,
    );

    actualizarTarjetaResumen(this.resumenElegido, comparacion.elegido);

    this.actualizarTabla(comparacion.filasEstadisticas);

    this.actualizarAfijos(comparacion.cambiosAfijos);
  }

  actualizarTabla(filas) {
    this.cuerpoTabla.replaceChildren();

    const fragmento = document.createDocumentFragment();

    for (const fila of filas) {
      const elementoFila = document.createElement("tr");

      elementoFila.classList.add(
        "comparacion-objetos__fila",
        `comparacion-objetos__fila--${fila.tendencia}`,
      );

      elementoFila.append(
        crearCelda(fila.etiqueta, "propiedad"),

        crearCelda(fila.valorInspeccionado, "inspeccionado"),

        crearCelda(fila.valorElegido, "elegido"),

        crearCelda(fila.diferencia, "diferencia"),
      );

      fragmento.appendChild(elementoFila);
    }

    this.cuerpoTabla.appendChild(fragmento);
  }

  actualizarAfijos(cambios) {
    this.listaAfijos.replaceChildren();

    const elementos = [];

    for (const afijo of cambios.agregados) {
      elementos.push(
        crearCambioAfijo({
          tipo: "agregado",

          etiqueta: "Solo en inspeccionado",

          texto: formatearAfijo(afijo),
        }),
      );
    }

    for (const afijo of cambios.perdidos) {
      elementos.push(
        crearCambioAfijo({
          tipo: "perdido",

          etiqueta: "Solo en elegido",

          texto: formatearAfijo(afijo),
        }),
      );
    }

    for (const cambio of cambios.modificados) {
      elementos.push(
        crearCambioAfijo({
          tipo: "modificado",

          etiqueta: "Cambia",

          texto:
            `${formatearAfijo(cambio.elegido)} → ` +
            `${formatearAfijo(cambio.inspeccionado)}`,
        }),
      );
    }

    const tieneCambios = elementos.length > 0;

    this.listaAfijos.hidden = !tieneCambios;

    this.mensajeSinAfijos.hidden = tieneCambios;

    if (tieneCambios) {
      this.listaAfijos.append(...elementos);
    }
  }

  manejarClickOpciones(event) {
    const boton = event.target.closest("[data-indice-comparacion]");

    if (!boton || !this.listaOpciones.contains(boton)) {
      return;
    }

    const indice = Number(boton.dataset.indiceComparacion);

    if (Number.isInteger(indice) && indice >= 0) {
      this.alSeleccionar?.(indice);
    }
  }

  destruir() {
    this.listaOpciones.removeEventListener("click", this.manejarClickOpciones);

    this.alSeleccionar = null;
  }
}

function crearTarjetaResumen(etiqueta) {
  const elemento = crearElemento("div", "comparacion-objetos__resumen-tarjeta");

  const etiquetaElemento = crearElemento(
    "span",
    "comparacion-objetos__resumen-etiqueta",
    etiqueta,
  );

  const nombre = crearElemento("strong", "comparacion-objetos__resumen-nombre");

  const subtitulo = crearElemento(
    "span",
    "comparacion-objetos__resumen-subtitulo",
  );

  elemento.append(etiquetaElemento, nombre, subtitulo);

  return {
    elemento,
    nombre,
    subtitulo,
  };
}

function actualizarTarjetaResumen(tarjeta, resumen) {
  tarjeta.nombre.textContent = resumen.nombre;

  tarjeta.nombre.style.removeProperty("color");

  const partes = [];

  if (
    typeof resumen.subtitulo === "string" &&
    resumen.subtitulo.trim() !== ""
  ) {
    partes.push(resumen.subtitulo.trim());
  }

  if (Number.isInteger(resumen.nivelObjeto)) {
    partes.push(`Nivel ${resumen.nivelObjeto}`);
  }

  tarjeta.subtitulo.textContent = partes.join(" · ");

  const color = resumen.rareza?.color;

  if (typeof color === "string" && color.trim() !== "") {
    tarjeta.nombre.style.color = color.trim();
  }
}

function crearBotonOpcion({ opcion, indice }) {
  const boton = crearElemento("button", "comparacion-objetos__opcion");

  boton.type = "button";

  boton.dataset.indiceComparacion = String(indice);

  const ranura = crearElemento(
    "span",
    "comparacion-objetos__opcion-ranura",
    opcion.etiquetaRanura,
  );

  const identidad = crearElemento(
    "span",
    "comparacion-objetos__opcion-identidad",
  );

  const nombre = crearElemento(
    "strong",
    "comparacion-objetos__opcion-nombre",
    opcion.presentacion.nombre,
  );

  const subtitulo = crearElemento(
    "span",
    "comparacion-objetos__opcion-subtitulo",
    opcion.presentacion.subtitulo,
  );

  identidad.append(nombre, subtitulo);

  boton.append(ranura, identidad);

  const color = opcion.presentacion.rareza?.color;

  if (typeof color === "string" && color.trim() !== "") {
    nombre.style.color = color.trim();
  }

  return boton;
}

function crearCelda(texto, tipo) {
  const celda = document.createElement("td");

  celda.classList.add(
    "comparacion-objetos__celda",
    `comparacion-objetos__celda--${tipo}`,
  );

  celda.textContent = String(texto ?? "—");

  return celda;
}

function crearCambioAfijo({ tipo, etiqueta, texto }) {
  const elemento = crearElemento("li", "comparacion-objetos__afijo");

  elemento.classList.add(`comparacion-objetos__afijo--${tipo}`);

  const titulo = document.createElement("strong");

  titulo.textContent = `${etiqueta}: `;

  const contenido = document.createElement("span");

  contenido.textContent = texto;

  elemento.append(titulo, contenido);

  return elemento;
}

function formatearAfijo(afijo) {
  const tipo =
    typeof afijo.tipoEtiqueta === "string" && afijo.tipoEtiqueta.trim() !== ""
      ? `${afijo.tipoEtiqueta.trim()} `
      : "";

  const grado = Number.isInteger(afijo.grado) ? ` (grado ${afijo.grado})` : "";

  const efectos = Array.isArray(afijo.efectos)
    ? afijo.efectos.map(formatearEfecto).filter(Boolean).join(", ")
    : "";

  return `${tipo}${afijo.nombre}${grado}` + (efectos ? `: ${efectos}` : "");
}

function formatearEfecto(efecto) {
  if (typeof efecto === "string") {
    return efecto.trim();
  }

  if (!efecto || typeof efecto !== "object") {
    return "";
  }

  if (typeof efecto.texto === "string") {
    return efecto.texto.trim();
  }

  if (typeof efecto.etiqueta === "string") {
    const valor = efecto.valor ?? efecto.cantidad ?? "";

    return `${efecto.etiqueta} ${valor}`.trim();
  }

  return "";
}

function crearElemento(etiqueta, clase, texto = "") {
  const elemento = document.createElement(etiqueta);

  elemento.classList.add(clase);

  if (texto !== "") {
    elemento.textContent = texto;
  }

  return elemento;
}

function validarPresentacionResumen(presentacion, nombre) {
  if (
    !presentacion ||
    typeof presentacion !== "object" ||
    typeof presentacion.nombre !== "string"
  ) {
    throw new Error(`La presentación ${nombre} no es válida.`);
  }
}

function validarOpcion(opcion, indice) {
  if (
    !opcion ||
    typeof opcion !== "object" ||
    typeof opcion.etiquetaRanura !== "string" ||
    !opcion.presentacion ||
    typeof opcion.presentacion.nombre !== "string"
  ) {
    throw new Error(`La opción de comparación ${indice} no es válida.`);
  }
}

function validarComparacion(comparacion) {
  if (
    !comparacion ||
    typeof comparacion !== "object" ||
    !comparacion.inspeccionado ||
    !comparacion.elegido ||
    !Array.isArray(comparacion.filasEstadisticas) ||
    !comparacion.cambiosAfijos ||
    !Array.isArray(comparacion.cambiosAfijos.agregados) ||
    !Array.isArray(comparacion.cambiosAfijos.perdidos) ||
    !Array.isArray(comparacion.cambiosAfijos.modificados)
  ) {
    throw new Error(
      "VistaComparacionObjetos recibió una comparación inválida.",
    );
  }
}
