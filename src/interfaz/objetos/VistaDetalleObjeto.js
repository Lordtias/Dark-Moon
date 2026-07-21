let siguienteIdVista = 1;

// Construye una representación visual reutilizable de un objeto.
// La vista no conoce inventarios, equipamiento ni acciones: solamente
// recibe modelos ya preparados y los transforma en elementos del DOM.
export class VistaDetalleObjeto {
  constructor() {
    this.idTitulo = `tituloDetalleObjeto${siguienteIdVista}`;
    siguienteIdVista++;

    this.elemento = crearElemento("article", "detalle-objeto");
    this.construirEstructura();
  }

  // Crea una sola vez el detalle normal y la sección de comparación.
  construirEstructura() {
    const cabecera = crearElemento("header", "detalle-objeto__cabecera");

    this.contenedorImagen = crearElemento(
      "div",
      "detalle-objeto__imagen-contenedor",
    );

    this.imagen = crearElemento("img", "detalle-objeto__imagen");

    this.imagen.alt = "";
    this.imagen.draggable = false;
    this.imagen.decoding = "async";
    this.imagen.hidden = true;

    this.respaldoImagen = crearElemento(
      "span",
      "detalle-objeto__imagen-respaldo",
    );

    this.respaldoImagen.setAttribute("aria-hidden", "true");

    this.contenedorImagen.append(this.imagen, this.respaldoImagen);

    const identidad = crearElemento("div", "detalle-objeto__identidad");

    this.titulo = crearElemento("h2", "detalle-objeto__titulo");

    this.titulo.id = this.idTitulo;

    this.subtitulo = crearElemento("p", "detalle-objeto__subtitulo");

    this.cantidad = crearElemento("span", "detalle-objeto__cantidad");

    identidad.append(this.titulo, this.subtitulo, this.cantidad);

    cabecera.append(this.contenedorImagen, identidad);

    this.listaEstadisticas = crearElemento(
      "dl",
      "detalle-objeto__estadisticas",
    );

    this.mensajeSinEstadisticas = crearElemento(
      "p",
      "detalle-objeto__sin-estadisticas",
      "Este objeto no tiene propiedades especiales.",
    );

    this.descripcion = crearElemento("p", "detalle-objeto__descripcion");

    this.construirSeccionComparacion();

    this.elemento.append(
      cabecera,
      this.listaEstadisticas,
      this.mensajeSinEstadisticas,
      this.descripcion,
      this.seccionComparacion,
    );
  }

  // Prepara el sector que mostrará el objeto equipado, las diferencias
  // numéricas y los cambios de afijos. Empieza oculto hasta recibir datos.
  construirSeccionComparacion() {
    this.seccionComparacion = crearElemento(
      "section",
      "detalle-objeto__comparacion",
    );

    this.seccionComparacion.hidden = true;

    const titulo = crearElemento(
      "h3",
      "detalle-objeto__comparacion-titulo",
      "Comparación con equipado",
    );

    this.mensajeComparacion = crearElemento(
      "p",
      "detalle-objeto__comparacion-mensaje",
    );

    this.resumenEquipado = crearElemento(
      "div",
      "detalle-objeto__equipado-resumen",
    );

    const etiquetaEquipado = crearElemento(
      "span",
      "detalle-objeto__equipado-etiqueta",
      "Actualmente equipado",
    );

    this.nombreEquipado = crearElemento(
      "strong",
      "detalle-objeto__equipado-nombre",
    );

    this.subtituloEquipado = crearElemento(
      "span",
      "detalle-objeto__equipado-subtitulo",
    );

    this.resumenEquipado.append(
      etiquetaEquipado,
      this.nombreEquipado,
      this.subtituloEquipado,
    );

    this.contenedorTabla = crearElemento(
      "div",
      "detalle-objeto__comparacion-tabla-contenedor",
    );

    const tabla = crearElemento("table", "detalle-objeto__comparacion-tabla");

    const cabeceraTabla = document.createElement("thead");

    const filaCabecera = document.createElement("tr");

    for (const texto of ["Propiedad", "Nuevo", "Equipado", "Diferencia"]) {
      const celda = document.createElement("th");

      celda.scope = "col";
      celda.textContent = texto;

      filaCabecera.appendChild(celda);
    }

    cabeceraTabla.appendChild(filaCabecera);

    this.cuerpoTabla = document.createElement("tbody");

    tabla.append(cabeceraTabla, this.cuerpoTabla);

    this.contenedorTabla.appendChild(tabla);

    this.mensajeSinFilas = crearElemento(
      "p",
      "detalle-objeto__comparacion-sin-cambios",
      "No hay estadísticas comparables.",
    );

    this.contenedorAfijos = crearElemento(
      "div",
      "detalle-objeto__comparacion-afijos",
    );

    const tituloAfijos = crearElemento(
      "h4",
      "detalle-objeto__comparacion-afijos-titulo",
      "Cambios de afijos",
    );

    this.listaAfijos = crearElemento(
      "ul",
      "detalle-objeto__comparacion-afijos-lista",
    );

    this.mensajeSinAfijos = crearElemento(
      "p",
      "detalle-objeto__comparacion-sin-cambios",
      "No hay cambios de afijos.",
    );

    this.contenedorAfijos.append(
      tituloAfijos,
      this.listaAfijos,
      this.mensajeSinAfijos,
    );

    this.seccionComparacion.append(
      titulo,
      this.mensajeComparacion,
      this.resumenEquipado,
      this.contenedorTabla,
      this.mensajeSinFilas,
      this.contenedorAfijos,
    );
  }

  // El segundo parámetro es opcional para conservar compatibilidad con
  // cualquier pantalla que todavía muestre únicamente el detalle normal.
  mostrar(presentacion, comparacion = null) {
    validarPresentacion(presentacion);

    this.titulo.textContent = presentacion.nombre;

    this.subtitulo.textContent = presentacion.subtitulo;

    this.descripcion.textContent = presentacion.descripcion;

    this.cantidad.textContent =
      presentacion.cantidad > 1 ? `Cantidad: ${presentacion.cantidad}` : "";

    this.cantidad.hidden = presentacion.cantidad <= 1;

    this.actualizarImagen(presentacion);

    this.actualizarEstadisticas(
      presentacion.estadisticas,
      presentacion.mostrarMensajeSinEstadisticas !== false,
    );

    this.actualizarComparacion(comparacion);
  }

  actualizarImagen(presentacion) {
    const letraRespaldo =
      presentacion.nombre.trim().charAt(0).toUpperCase() || "?";

    this.respaldoImagen.textContent = letraRespaldo;

    // Limpiamos la imagen anterior antes
    // de representar otro objeto.
    this.imagen.onload = null;
    this.imagen.onerror = null;
    this.imagen.removeAttribute("src");

    this.imagen.hidden = true;
    this.respaldoImagen.hidden = false;

    if (!presentacion.recursoVisual) {
      return;
    }

    this.imagen.onload = () => {
      this.imagen.hidden = false;
      this.respaldoImagen.hidden = true;
    };

    this.imagen.onerror = () => {
      this.imagen.hidden = true;
      this.respaldoImagen.hidden = false;
    };

    this.imagen.src = presentacion.recursoVisual;
  }

  actualizarEstadisticas(estadisticas, mostrarMensaje) {
    this.listaEstadisticas.replaceChildren();

    const tieneEstadisticas = estadisticas.length > 0;

    this.listaEstadisticas.hidden = !tieneEstadisticas;

    this.mensajeSinEstadisticas.hidden = tieneEstadisticas || !mostrarMensaje;

    if (!tieneEstadisticas) {
      return;
    }

    const fragmento = document.createDocumentFragment();

    for (const estadistica of estadisticas) {
      const etiqueta = document.createElement("dt");

      etiqueta.textContent = estadistica.etiqueta;

      const valor = document.createElement("dd");

      valor.textContent = estadistica.valor;

      fragmento.append(etiqueta, valor);
    }

    this.listaEstadisticas.appendChild(fragmento);
  }

  actualizarComparacion(comparacion) {
    this.limpiarComparacion();

    if (comparacion === null) {
      this.seccionComparacion.hidden = true;

      return;
    }

    validarComparacion(comparacion);

    this.seccionComparacion.hidden = false;

    if (!comparacion.disponible) {
      this.mensajeComparacion.textContent =
        comparacion.motivo || "No hay una comparación disponible.";

      this.mensajeComparacion.hidden = false;

      this.resumenEquipado.hidden = true;

      this.contenedorTabla.hidden = true;

      this.mensajeSinFilas.hidden = true;

      this.contenedorAfijos.hidden = true;

      return;
    }

    this.actualizarResumenEquipado(comparacion.equipado);

    this.actualizarFilas(comparacion.filasEstadisticas);

    this.actualizarAfijos(comparacion.cambiosAfijos);
  }

  limpiarComparacion() {
    this.mensajeComparacion.textContent = "";

    this.mensajeComparacion.hidden = true;

    this.nombreEquipado.textContent = "";

    this.nombreEquipado.style.removeProperty("color");

    this.subtituloEquipado.textContent = "";

    this.cuerpoTabla.replaceChildren();
    this.listaAfijos.replaceChildren();

    this.resumenEquipado.hidden = false;

    this.contenedorTabla.hidden = false;

    this.mensajeSinFilas.hidden = true;

    this.contenedorAfijos.hidden = false;

    this.listaAfijos.hidden = false;

    this.mensajeSinAfijos.hidden = true;
  }

  actualizarResumenEquipado(equipado) {
    this.nombreEquipado.textContent = equipado.nombre;

    const partes = [];

    if (equipado.subtitulo.trim() !== "") {
      partes.push(equipado.subtitulo.trim());
    }

    if (Number.isInteger(equipado.nivelObjeto)) {
      partes.push(`Nivel ${equipado.nivelObjeto}`);
    }

    this.subtituloEquipado.textContent = partes.join(" · ");

    const color = equipado.rareza?.color;

    if (typeof color === "string" && color.trim() !== "") {
      this.nombreEquipado.style.color = color;
    }
  }

  actualizarFilas(filas) {
    const tieneFilas = filas.length > 0;

    this.contenedorTabla.hidden = !tieneFilas;

    this.mensajeSinFilas.hidden = tieneFilas;

    if (!tieneFilas) {
      return;
    }

    const fragmento = document.createDocumentFragment();

    for (const fila of filas) {
      const elementoFila = document.createElement("tr");

      elementoFila.classList.add(
        "detalle-objeto__comparacion-fila",
        `detalle-objeto__comparacion-fila--${fila.tendencia}`,
      );

      elementoFila.dataset.tendencia = fila.tendencia;

      elementoFila.append(
        crearCelda(fila.etiqueta, "propiedad"),

        crearCelda(fila.valorCandidato, "candidato"),

        crearCelda(fila.valorEquipado, "equipado"),

        crearCelda(fila.diferencia, "diferencia"),
      );

      fragmento.appendChild(elementoFila);
    }

    this.cuerpoTabla.appendChild(fragmento);
  }

  actualizarAfijos(cambios) {
    const elementos = [];

    for (const afijo of cambios.agregados) {
      elementos.push(
        crearCambioAfijo("agregado", "Gana", formatearAfijo(afijo)),
      );
    }

    for (const afijo of cambios.perdidos) {
      elementos.push(
        crearCambioAfijo("perdido", "Pierde", formatearAfijo(afijo)),
      );
    }

    for (const cambio of cambios.modificados) {
      elementos.push(
        crearCambioAfijo(
          "modificado",
          "Cambia",

          `${formatearAfijo(cambio.equipado)} → ` +
            `${formatearAfijo(cambio.candidato)}`,
        ),
      );
    }

    const tieneCambios = elementos.length > 0;

    this.listaAfijos.hidden = !tieneCambios;

    this.mensajeSinAfijos.hidden = tieneCambios;

    if (tieneCambios) {
      this.listaAfijos.append(...elementos);
    }
  }
}

function crearElemento(etiqueta, clase, texto = "") {
  const elemento = document.createElement(etiqueta);

  elemento.classList.add(clase);

  if (texto !== "") {
    elemento.textContent = texto;
  }

  return elemento;
}

function crearCelda(texto, tipo) {
  const celda = document.createElement("td");

  celda.classList.add(
    "detalle-objeto__comparacion-celda",
    `detalle-objeto__comparacion-celda--${tipo}`,
  );

  celda.textContent = String(texto ?? "—");

  return celda;
}

function crearCambioAfijo(tipo, etiqueta, texto) {
  const elemento = document.createElement("li");

  elemento.classList.add(
    "detalle-objeto__comparacion-afijo",
    `detalle-objeto__comparacion-afijo--${tipo}`,
  );

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
    ? afijo.efectos
        .map(formatearEfecto)
        .filter((texto) => texto !== "")
        .join(", ")
    : "";

  return (
    `${tipo}${afijo.nombre}${grado}` + (efectos !== "" ? `: ${efectos}` : "")
  );
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

function validarPresentacion(presentacion) {
  if (
    !presentacion ||
    typeof presentacion !== "object" ||
    typeof presentacion.nombre !== "string" ||
    typeof presentacion.subtitulo !== "string" ||
    typeof presentacion.descripcion !== "string" ||
    !Array.isArray(presentacion.estadisticas)
  ) {
    throw new Error("VistaDetalleObjeto necesita una presentación válida.");
  }
}

function validarComparacion(comparacion) {
  if (
    !comparacion ||
    typeof comparacion !== "object" ||
    typeof comparacion.disponible !== "boolean" ||
    typeof comparacion.motivo !== "string" ||
    !Array.isArray(comparacion.filasEstadisticas) ||
    !comparacion.cambiosAfijos ||
    !Array.isArray(comparacion.cambiosAfijos.agregados) ||
    !Array.isArray(comparacion.cambiosAfijos.perdidos) ||
    !Array.isArray(comparacion.cambiosAfijos.modificados)
  ) {
    throw new Error("VistaDetalleObjeto recibió una comparación inválida.");
  }

  if (
    comparacion.disponible &&
    (!comparacion.equipado ||
      typeof comparacion.equipado.nombre !== "string" ||
      typeof comparacion.equipado.subtitulo !== "string")
  ) {
    throw new Error("La comparación necesita un objeto equipado válido.");
  }
}
