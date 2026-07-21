let siguienteIdVista = 1;

// Construye una representación visual reutilizable de un objeto.
//
// La vista no conoce inventarios ni reglas de equipamiento.
// Solamente recibe una presentación y, cuando corresponde,
// un modelo compacto de diferencias.
export class VistaDetalleObjeto {
  constructor() {
    this.idTitulo = `tituloDetalleObjeto${siguienteIdVista}`;

    siguienteIdVista++;

    this.elemento = crearElemento("article", "detalle-objeto");

    this.construirEstructura();
  }

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

    // El bloque normal de estadísticas también muestra
    // la única columna adicional necesaria: Diferencia.
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

    // Los cambios de afijos se muestran de forma compacta
    // y solamente cuando realmente existe alguno.
    this.listaCambiosAfijos = crearElemento(
      "ul",
      "detalle-objeto__cambios-afijos",
    );

    this.listaCambiosAfijos.hidden = true;

    this.elemento.append(
      cabecera,
      this.listaEstadisticas,
      this.mensajeSinEstadisticas,
      this.descripcion,
      this.listaCambiosAfijos,
    );
  }

  // El parámetro comparación es opcional para que la misma vista
  // siga funcionando con consumibles, materiales y objetos equipados.
  mostrar(presentacion, comparacion = null) {
    validarPresentacion(presentacion);

    if (comparacion !== null) {
      validarComparacion(comparacion);
    }

    this.titulo.textContent = presentacion.nombre;

    this.subtitulo.textContent = presentacion.subtitulo;

    this.descripcion.textContent = presentacion.descripcion;

    this.cantidad.textContent =
      presentacion.cantidad > 1 ? `Cantidad: ${presentacion.cantidad}` : "";

    this.cantidad.hidden = presentacion.cantidad <= 1;

    this.actualizarImagen(presentacion);

    this.actualizarEstadisticas({
      estadisticas: presentacion.estadisticas,

      mostrarMensaje: presentacion.mostrarMensajeSinEstadisticas !== false,

      comparacion,
    });

    this.actualizarCambiosAfijos(comparacion?.cambiosAfijos ?? null);
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

  actualizarEstadisticas({ estadisticas, mostrarMensaje, comparacion }) {
    this.listaEstadisticas.replaceChildren();

    const diferenciasPorEtiqueta = new Map(
      (comparacion?.diferenciasEstadisticas ?? []).map((diferencia) => [
        normalizarEtiqueta(diferencia.etiqueta),

        diferencia,
      ]),
    );

    const filasAdicionales = comparacion?.filasAdicionales ?? [];

    const tieneFilas = estadisticas.length > 0 || filasAdicionales.length > 0;

    this.listaEstadisticas.hidden = !tieneFilas;

    this.mensajeSinEstadisticas.hidden = tieneFilas || !mostrarMensaje;

    if (!tieneFilas) {
      return;
    }

    const fragmento = document.createDocumentFragment();

    for (const estadistica of estadisticas) {
      const diferencia =
        diferenciasPorEtiqueta.get(normalizarEtiqueta(estadistica.etiqueta)) ??
        null;

      fragmento.appendChild(
        crearFilaEstadistica({
          etiqueta: estadistica.etiqueta,

          valor: estadistica.valor,

          diferencia,
        }),
      );
    }

    // Estas filas representan propiedades que se perderían,
    // como Armadura o Bloqueo de un escudo al equipar un mandoble.
    for (const fila of filasAdicionales) {
      fragmento.appendChild(
        crearFilaEstadistica({
          etiqueta: fila.etiqueta,

          valor: fila.valor,

          diferencia: fila,

          esPerdidaCompleta: true,
        }),
      );
    }

    this.listaEstadisticas.appendChild(fragmento);
  }

  actualizarCambiosAfijos(cambios) {
    this.listaCambiosAfijos.replaceChildren();

    if (!cambios) {
      this.listaCambiosAfijos.hidden = true;

      return;
    }

    const elementos = [];

    for (const afijo of cambios.agregados) {
      elementos.push(
        crearCambioAfijo({
          tipo: "agregado",

          simbolo: "+",

          texto: formatearAfijo(afijo),
        }),
      );
    }

    for (const afijo of cambios.perdidos) {
      elementos.push(
        crearCambioAfijo({
          tipo: "perdido",

          simbolo: "−",

          texto: formatearAfijo(afijo),
        }),
      );
    }

    for (const cambio of cambios.modificados) {
      elementos.push(
        crearCambioAfijo({
          tipo: "modificado",

          simbolo: "↔",

          texto:
            `${formatearAfijo(cambio.equipado)} → ` +
            `${formatearAfijo(cambio.candidato)}`,
        }),
      );
    }

    this.listaCambiosAfijos.hidden = elementos.length === 0;

    if (elementos.length > 0) {
      this.listaCambiosAfijos.append(...elementos);
    }
  }
}

function crearFilaEstadistica({
  etiqueta,
  valor,
  diferencia = null,
  esPerdidaCompleta = false,
}) {
  const fila = crearElemento("div", "detalle-objeto__estadistica");

  if (esPerdidaCompleta) {
    fila.classList.add("detalle-objeto__estadistica--perdida");
  }

  const termino = document.createElement("dt");

  termino.textContent = etiqueta;

  const descripcion = document.createElement("dd");

  descripcion.textContent = valor;

  const diferenciaElemento = crearElemento(
    "dd",
    "detalle-objeto__estadistica-diferencia",
  );

  if (diferencia === null) {
    diferenciaElemento.hidden = true;
  } else {
    diferenciaElemento.textContent = diferencia.diferencia;

    diferenciaElemento.classList.add(
      `detalle-objeto__estadistica-diferencia--${diferencia.tendencia}`,
    );
  }

  fila.append(termino, descripcion, diferenciaElemento);

  return fila;
}

function crearCambioAfijo({ tipo, simbolo, texto }) {
  const elemento = crearElemento("li", "detalle-objeto__cambio-afijo");

  elemento.classList.add(`detalle-objeto__cambio-afijo--${tipo}`);

  const indicador = crearElemento(
    "strong",
    "detalle-objeto__cambio-afijo-indicador",
    simbolo,
  );

  const contenido = document.createElement("span");

  contenido.textContent = texto;

  elemento.append(indicador, contenido);

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

function crearElemento(etiqueta, clase, texto = "") {
  const elemento = document.createElement(etiqueta);

  elemento.classList.add(clase);

  if (texto !== "") {
    elemento.textContent = texto;
  }

  return elemento;
}

function normalizarEtiqueta(etiqueta) {
  return String(etiqueta)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
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
    !Array.isArray(comparacion.diferenciasEstadisticas) ||
    !Array.isArray(comparacion.filasAdicionales) ||
    !comparacion.cambiosAfijos ||
    !Array.isArray(comparacion.cambiosAfijos.agregados) ||
    !Array.isArray(comparacion.cambiosAfijos.perdidos) ||
    !Array.isArray(comparacion.cambiosAfijos.modificados)
  ) {
    throw new Error("VistaDetalleObjeto recibió una comparación inválida.");
  }
}
