let siguienteIdVista = 1;

// Construye la representación visual reutilizable de un objeto.
//
// Esta vista solamente muestra información. No conoce inventarios,
// equipamiento, comparaciones ni acciones del juego.
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

    this.metadatos = crearElemento("p", "detalle-objeto__metadatos");

    this.cantidad = crearElemento("span", "detalle-objeto__cantidad");

    identidad.append(
      this.titulo,
      this.subtitulo,
      this.metadatos,
      this.cantidad,
    );

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

    this.seccionAfijos = crearElemento("section", "detalle-objeto__afijos");

    const tituloAfijos = crearElemento(
      "h3",
      "detalle-objeto__afijos-titulo",
      "Afijos",
    );

    this.listaAfijos = crearElemento("div", "detalle-objeto__afijos-lista");

    this.seccionAfijos.append(tituloAfijos, this.listaAfijos);

    this.descripcion = crearElemento("p", "detalle-objeto__descripcion");

    this.elemento.append(
      cabecera,
      this.listaEstadisticas,
      this.mensajeSinEstadisticas,
      this.seccionAfijos,
      this.descripcion,
    );
  }

  // Actualiza la vista con un modelo producido
  // por PresentadorObjeto.
  mostrar(presentacion) {
    validarPresentacion(presentacion);

    this.titulo.textContent = presentacion.nombre;

    this.subtitulo.textContent = presentacion.subtitulo;

    this.descripcion.textContent = presentacion.descripcion;

    this.actualizarRareza(presentacion);

    this.actualizarCantidad(presentacion);

    this.actualizarImagen(presentacion);

    this.actualizarEstadisticas(
      presentacion.estadisticas,

      presentacion.mostrarMensajeSinEstadisticas !== false,
    );

    this.actualizarAfijos(
      Array.isArray(presentacion.afijos) ? presentacion.afijos : [],
    );
  }

  // Muestra rareza y nivel sin mezclarlos
  // con las estadísticas funcionales del objeto.
  actualizarRareza(presentacion) {
    this.titulo.style.removeProperty("color");

    const rareza =
      presentacion.rareza && typeof presentacion.rareza === "object"
        ? presentacion.rareza
        : null;

    const partes = [];

    if (
      rareza &&
      typeof rareza.nombre === "string" &&
      rareza.nombre.trim() !== ""
    ) {
      partes.push(rareza.nombre.trim());
    }

    if (Number.isInteger(presentacion.nivelObjeto)) {
      partes.push(`Nivel de objeto ${presentacion.nivelObjeto}`);
    }

    this.metadatos.textContent = partes.join(" · ");

    this.metadatos.hidden = partes.length === 0;

    if (
      rareza &&
      typeof rareza.color === "string" &&
      rareza.color.trim() !== ""
    ) {
      this.titulo.style.color = rareza.color.trim();
    }
  }

  actualizarCantidad(presentacion) {
    const cantidad = Number.isInteger(presentacion.cantidad)
      ? presentacion.cantidad
      : 1;

    this.cantidad.textContent = cantidad > 1 ? `Cantidad: ${cantidad}` : "";

    this.cantidad.hidden = cantidad <= 1;
  }

  actualizarImagen(presentacion) {
    const letraRespaldo =
      presentacion.nombre.trim().charAt(0).toUpperCase() || "?";

    this.respaldoImagen.textContent = letraRespaldo;

    // Retiramos callbacks y ruta anteriores
    // antes de representar otro objeto.
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

    const tieneEstadisticas =
      Array.isArray(estadisticas) && estadisticas.length > 0;

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

  actualizarAfijos(afijos) {
    this.listaAfijos.replaceChildren();

    this.seccionAfijos.hidden = afijos.length === 0;

    if (afijos.length === 0) {
      return;
    }

    const fragmento = document.createDocumentFragment();

    for (const afijo of afijos) {
      fragmento.appendChild(crearTarjetaAfijo(afijo));
    }

    this.listaAfijos.appendChild(fragmento);
  }
}

function crearTarjetaAfijo(afijo) {
  const tarjeta = crearElemento("article", "detalle-objeto__afijo");

  const cabecera = crearElemento("div", "detalle-objeto__afijo-cabecera");

  const tipo = crearElemento(
    "span",
    "detalle-objeto__afijo-tipo",
    obtenerTipoAfijo(afijo),
  );

  const nombre = crearElemento(
    "strong",
    "detalle-objeto__afijo-nombre",

    typeof afijo.nombre === "string" ? afijo.nombre : "Afijo",
  );

  const grado = crearElemento(
    "span",
    "detalle-objeto__afijo-grado",

    Number.isInteger(afijo.grado) ? `Grado ${afijo.grado}` : "",
  );

  grado.hidden = !Number.isInteger(afijo.grado);

  cabecera.append(tipo, nombre, grado);

  const listaEfectos = crearElemento("ul", "detalle-objeto__afijo-efectos");

  const efectos = Array.isArray(afijo.efectos) ? afijo.efectos : [];

  for (const efecto of efectos) {
    const texto = formatearEfecto(efecto);

    if (texto === "") {
      continue;
    }

    const elemento = document.createElement("li");

    elemento.textContent = texto;

    listaEfectos.appendChild(elemento);
  }

  listaEfectos.hidden = listaEfectos.children.length === 0;

  tarjeta.append(cabecera, listaEfectos);

  return tarjeta;
}

function obtenerTipoAfijo(afijo) {
  if (
    typeof afijo.tipoEtiqueta === "string" &&
    afijo.tipoEtiqueta.trim() !== ""
  ) {
    return afijo.tipoEtiqueta.trim();
  }

  if (typeof afijo.tipo === "string" && afijo.tipo.trim() !== "") {
    return formatearIdentificador(afijo.tipo);
  }

  return "Afijo";
}

function formatearEfecto(efecto) {
  if (typeof efecto === "string") {
    return efecto.trim();
  }

  if (!efecto || typeof efecto !== "object") {
    return "";
  }

  if (typeof efecto.texto === "string" && efecto.texto.trim() !== "") {
    return efecto.texto.trim();
  }

  if (typeof efecto.etiqueta === "string" && efecto.etiqueta.trim() !== "") {
    const valor = efecto.valor ?? efecto.cantidad ?? "";

    return `${efecto.etiqueta} ${valor}`.trim();
  }

  if (typeof efecto.propiedad === "string" && efecto.propiedad.trim() !== "") {
    const valor = efecto.valor ?? efecto.cantidad ?? "";

    return `${formatearIdentificador(efecto.propiedad)} ${valor}`.trim();
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

function formatearIdentificador(valor) {
  if (typeof valor !== "string" || valor.trim() === "") {
    return "—";
  }

  const texto = valor
    .replace(/([a-záéíóúñ])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .trim()
    .toLowerCase();

  return texto.charAt(0).toUpperCase() + texto.slice(1);
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
