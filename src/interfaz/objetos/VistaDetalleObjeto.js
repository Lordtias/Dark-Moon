import { aplicarAparienciaRarezaObjeto } from "./ContextoPresentacionObjetos.js";

let siguienteIdVista = 1;

// Construye la representación visual reutilizable
// de un objeto.
//
// Esta vista no abre modales ni ejecuta acciones.
// Puede utilizarse dentro de inventario, botín,
// cofres, comerciantes o comparaciones futuras.
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

    this.metadatosGeneracion = document.createElement("div");

    this.metadatosGeneracion.classList.add("detalle-objeto__metadatos");

    this.insigniaRareza = document.createElement("span");

    this.insigniaRareza.classList.add("detalle-objeto__rareza");

    this.insigniaNivel = document.createElement("span");

    this.insigniaNivel.classList.add("detalle-objeto__nivel");

    this.metadatosGeneracion.append(this.insigniaRareza, this.insigniaNivel);

    this.cantidad = document.createElement("span");

    this.cantidad.classList.add("detalle-objeto__cantidad");

    identidad.append(
      this.titulo,
      this.subtitulo,
      this.metadatosGeneracion,
      this.cantidad,
    );

    cabecera.append(this.contenedorImagen, identidad);

    this.listaEstadisticas = document.createElement("dl");

    this.listaEstadisticas.classList.add("detalle-objeto__estadisticas");

    this.seccionAfijos = document.createElement("section");

    this.seccionAfijos.classList.add("detalle-objeto__seccion-afijos");

    const tituloAfijos = document.createElement("h3");

    tituloAfijos.classList.add("detalle-objeto__titulo-afijos");

    tituloAfijos.textContent = "Afijos";

    this.listaAfijos = document.createElement("div");

    this.listaAfijos.classList.add("detalle-objeto__afijos");

    this.seccionAfijos.append(tituloAfijos, this.listaAfijos);

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
      this.seccionAfijos,
      this.mensajeSinEstadisticas,
      this.descripcion,
    );
  }

  mostrar(presentacion) {
    validarPresentacion(presentacion);

    aplicarAparienciaRarezaObjeto({
      elemento: this.elemento,

      rareza: presentacion.rareza,
    });

    this.titulo.textContent = presentacion.nombre;

    this.subtitulo.textContent = presentacion.subtitulo;

    this.descripcion.textContent = presentacion.descripcion;

    this.cantidad.textContent =
      presentacion.cantidad > 1 ? `Cantidad: ${presentacion.cantidad}` : "";

    this.cantidad.hidden = presentacion.cantidad <= 1;

    this.actualizarMetadatos(presentacion);

    this.actualizarImagen(presentacion);

    this.actualizarEstadisticas({
      estadisticas: presentacion.estadisticas,

      mostrarMensajeSinEstadisticas: presentacion.mostrarMensajeSinEstadisticas,
    });

    this.actualizarAfijos(presentacion.afijos);
  }

  actualizarMetadatos(presentacion) {
    const mostrar = presentacion.mostrarMetadatosGeneracion;

    this.metadatosGeneracion.hidden = !mostrar;

    if (!mostrar) {
      this.insigniaRareza.textContent = "";

      this.insigniaNivel.textContent = "";

      return;
    }

    this.insigniaRareza.textContent = presentacion.rareza.nombre;

    this.insigniaNivel.textContent = `Nivel de objeto ${presentacion.nivelObjeto}`;
  }

  actualizarImagen(presentacion) {
    const letraRespaldo =
      presentacion.nombre.trim().charAt(0).toUpperCase() || "?";

    this.respaldoImagen.textContent = letraRespaldo;

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

  actualizarEstadisticas({ estadisticas, mostrarMensajeSinEstadisticas }) {
    this.listaEstadisticas.replaceChildren();

    const tieneEstadisticas =
      Array.isArray(estadisticas) && estadisticas.length > 0;

    this.listaEstadisticas.hidden = !tieneEstadisticas;

    this.mensajeSinEstadisticas.hidden =
      tieneEstadisticas || !mostrarMensajeSinEstadisticas;

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

    const tieneAfijos = Array.isArray(afijos) && afijos.length > 0;

    this.seccionAfijos.hidden = !tieneAfijos;

    if (!tieneAfijos) {
      return;
    }

    const fragmento = document.createDocumentFragment();

    for (const afijo of afijos) {
      fragmento.appendChild(this.crearTarjetaAfijo(afijo));
    }

    this.listaAfijos.appendChild(fragmento);
  }

  crearTarjetaAfijo(afijo) {
    const tarjeta = document.createElement("article");

    tarjeta.classList.add(
      "detalle-objeto__afijo",

      `detalle-objeto__afijo--${afijo.tipo}`,
    );

    const cabecera = document.createElement("header");

    cabecera.classList.add("detalle-objeto__afijo-cabecera");

    const identidad = document.createElement("div");

    identidad.classList.add("detalle-objeto__afijo-identidad");

    const tipo = document.createElement("span");

    tipo.classList.add("detalle-objeto__afijo-tipo");

    tipo.textContent = afijo.tipoEtiqueta;

    const nombre = document.createElement("strong");

    nombre.classList.add("detalle-objeto__afijo-nombre");

    nombre.textContent = afijo.nombre;

    identidad.append(tipo, nombre);

    const grado = document.createElement("span");

    grado.classList.add("detalle-objeto__afijo-grado");

    grado.textContent = `Grado ${afijo.grado}`;

    cabecera.append(identidad, grado);

    const listaEfectos = document.createElement("ul");

    listaEfectos.classList.add("detalle-objeto__afijo-efectos");

    for (const efecto of afijo.efectos) {
      const elemento = document.createElement("li");

      elemento.textContent = efecto;

      listaEfectos.appendChild(elemento);
    }

    tarjeta.append(cabecera, listaEfectos);

    return tarjeta;
  }
}

function validarPresentacion(presentacion) {
  if (
    !presentacion ||
    typeof presentacion !== "object" ||
    typeof presentacion.nombre !== "string" ||
    !presentacion.rareza ||
    typeof presentacion.rareza.nombre !== "string" ||
    !Number.isInteger(presentacion.nivelObjeto) ||
    typeof presentacion.mostrarMetadatosGeneracion !== "boolean" ||
    !Array.isArray(presentacion.afijos) ||
    !Array.isArray(presentacion.estadisticas) ||
    typeof presentacion.mostrarMensajeSinEstadisticas !== "boolean"
  ) {
    throw new Error("VistaDetalleObjeto necesita una presentación válida.");
  }
}
