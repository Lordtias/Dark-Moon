let siguienteIdVista = 1;

// Construye la representación visual reutilizable
// de un objeto.
//
// Esta vista no abre modales ni ejecuta acciones.
// Por eso podrá reutilizarse más adelante dentro de:
//
// - La ventana de botín.
// - Cofres.
// - Comerciantes.
// - Comparaciones de equipamiento.
export class VistaDetalleObjeto {
  constructor() {
    this.idTitulo = `tituloDetalleObjeto${siguienteIdVista}`;

    siguienteIdVista++;

    this.elemento = document.createElement("article");

    this.elemento.classList.add("detalle-objeto");

    this.construirEstructura();
  }

  construirEstructura() {
    const cabecera = document.createElement("header");

    cabecera.classList.add("detalle-objeto__cabecera");

    this.contenedorImagen = document.createElement("div");

    this.contenedorImagen.classList.add("detalle-objeto__imagen-contenedor");

    this.imagen = document.createElement("img");

    this.imagen.classList.add("detalle-objeto__imagen");

    this.imagen.alt = "";
    this.imagen.draggable = false;
    this.imagen.decoding = "async";
    this.imagen.hidden = true;

    this.respaldoImagen = document.createElement("span");

    this.respaldoImagen.classList.add("detalle-objeto__imagen-respaldo");

    this.respaldoImagen.setAttribute("aria-hidden", "true");

    this.contenedorImagen.append(this.imagen, this.respaldoImagen);

    const identidad = document.createElement("div");

    identidad.classList.add("detalle-objeto__identidad");

    this.titulo = document.createElement("h2");

    this.titulo.id = this.idTitulo;

    this.titulo.classList.add("detalle-objeto__titulo");

    this.subtitulo = document.createElement("p");

    this.subtitulo.classList.add("detalle-objeto__subtitulo");

    this.cantidad = document.createElement("span");

    this.cantidad.classList.add("detalle-objeto__cantidad");

    identidad.append(this.titulo, this.subtitulo, this.cantidad);

    cabecera.append(this.contenedorImagen, identidad);

    this.listaEstadisticas = document.createElement("dl");

    this.listaEstadisticas.classList.add("detalle-objeto__estadisticas");

    this.mensajeSinEstadisticas = document.createElement("p");

    this.mensajeSinEstadisticas.classList.add(
      "detalle-objeto__sin-estadisticas",
    );

    this.mensajeSinEstadisticas.textContent =
      "Este objeto no tiene propiedades especiales.";

    this.descripcion = document.createElement("p");

    this.descripcion.classList.add("detalle-objeto__descripcion");

    this.elemento.append(
      cabecera,
      this.listaEstadisticas,
      this.mensajeSinEstadisticas,
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

    this.cantidad.textContent =
      presentacion.cantidad > 1 ? `Cantidad: ${presentacion.cantidad}` : "";

    this.cantidad.hidden = presentacion.cantidad <= 1;

    this.actualizarImagen(presentacion);

    this.actualizarEstadisticas(presentacion.estadisticas);
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

  actualizarEstadisticas(estadisticas) {
    this.listaEstadisticas.replaceChildren();

    const tieneEstadisticas =
      Array.isArray(estadisticas) && estadisticas.length > 0;

    this.listaEstadisticas.hidden = !tieneEstadisticas;

    this.mensajeSinEstadisticas.hidden = tieneEstadisticas;

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
}

function validarPresentacion(presentacion) {
  if (
    !presentacion ||
    typeof presentacion !== "object" ||
    typeof presentacion.nombre !== "string" ||
    !Array.isArray(presentacion.estadisticas)
  ) {
    throw new Error("VistaDetalleObjeto necesita una presentación válida.");
  }
}
