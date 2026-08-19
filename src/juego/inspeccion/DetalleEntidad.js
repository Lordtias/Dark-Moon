export const ACCIONES_DETALLE_ENTIDAD = Object.freeze({
  ATACAR: "atacar",
  INTERACTUAR: "interactuar",
});

export function crearDetalleEntidad({ entidad, juego } = {}) {
  if (!entidad || typeof entidad !== "object") {
    throw new Error("El detalle de entidad necesita una entidad válida.");
  }
  if (!juego?.player) {
    throw new Error("El detalle de entidad necesita un Juego activo.");
  }

  return Object.freeze({
    entidad,
    nombre: entidad.nombre ?? "Entidad",
    descripcion: obtenerDescripcion(entidad),
    recursoVisual: entidad.recursoVisual ?? null,
    secciones: Object.freeze(crearSecciones({ entidad, juego })),
    acciones: Object.freeze(crearAcciones({ entidad, juego })),
  });
}

function crearSecciones({ entidad, juego }) {
  const secciones = [];
  agregarSeccion(secciones, "Estado", [
    campo("Vida", formatearProporcion(entidad.vidaActual, entidad.vidaMaxima)),
    campo("Maná", formatearProporcion(entidad.manaActual, entidad.manaMaximo)),
    campo("Armadura", numeroSiFinito(entidad.armadura)),
    campo("Nivel", enteroSiValido(entidad.nivel)),
    campo("Variante", formatearId(entidad.idVariante)),
    campo("Familia", formatearId(entidad.familiaEntidad)),
    campo("Estado físico", obtenerEstadoFisico(entidad)),
    campo(
      "Estado",
      typeof entidad.abierta === "boolean"
        ? entidad.abierta
          ? "Abierta"
          : "Cerrada"
        : typeof entidad.activo === "boolean"
          ? entidad.activo
            ? "Activo"
            : "Inactivo"
          : null,
    ),
  ]);

  agregarSeccion(secciones, "Identidad", [
    campo("Facción", formatearId(entidad.faccion)),
    campo("Rol", formatearId(entidad.rol)),
    campo("Roles", formatearLista(entidad.roles)),
  ]);

  agregarSeccion(secciones, "Comportamiento", [
    campo(
      "Agresividad",
      formatearId(entidad.configuracionIA?.tipoAgresividad),
    ),
    campo(
      "Estado actual",
      typeof entidad.estaAgresivo === "boolean"
        ? entidad.estaAgresivo
          ? "En persecución"
          : "No alertado"
        : null,
    ),
  ]);

  agregarSeccionLista(
    secciones,
    "Interacciones",
    obtenerInteraccionesDeclaradas(entidad),
    formatearInteraccion,
  );

  const efectos = obtenerEfectos(juego, entidad);
  const auras = efectos.filter((efecto) => contieneEtiqueta(efecto, "aura"));
  const maldiciones = efectos.filter((efecto) =>
    contieneEtiqueta(efecto, "maldicion"),
  );
  const otros = efectos.filter(
    (efecto) =>
      !contieneEtiqueta(efecto, "aura") &&
      !contieneEtiqueta(efecto, "maldicion"),
  );

  agregarSeccionLista(secciones, "Auras activas", auras, formatearEfecto);
  agregarSeccionLista(
    secciones,
    "Maldiciones activas",
    maldiciones,
    formatearEfecto,
  );
  agregarSeccionLista(secciones, "Otros efectos", otros, formatearEfecto);

  return secciones;
}

function crearAcciones({ entidad, juego }) {
  const acciones = [];

  if (
    Array.isArray(juego.objetivos) &&
    juego.objetivos.includes(entidad) &&
    entidad.estaDestruido !== true &&
    entidad.estaVivo !== false
  ) {
    acciones.push(
      Object.freeze({
        id: ACCIONES_DETALLE_ENTIDAD.ATACAR,
        etiqueta: "Atacar",
      }),
    );
  }

  const opcionInteraccion = juego
    .obtenerOpcionesInteraccion?.()
    ?.find((opcion) => opcion?.entidad === entidad);

  if (opcionInteraccion) {
    acciones.push(
      Object.freeze({
        id: ACCIONES_DETALLE_ENTIDAD.INTERACTUAR,
        etiqueta: opcionInteraccion.interaccionPrioritaria?.texto ?? "Interactuar",
      }),
    );
  }

  return acciones;
}

function agregarSeccion(secciones, titulo, campos) {
  const visibles = campos.filter((actual) => actual?.valor !== null);
  if (visibles.length === 0) return;
  secciones.push(
    Object.freeze({
      titulo,
      campos: Object.freeze(visibles),
      elementos: Object.freeze([]),
    }),
  );
}

function agregarSeccionLista(
  secciones,
  titulo,
  elementos,
  formateador = (valor) => String(valor),
) {
  if (!Array.isArray(elementos) || elementos.length === 0) return;
  secciones.push(
    Object.freeze({
      titulo,
      campos: Object.freeze([]),
      elementos: Object.freeze(elementos.map(formateador)),
    }),
  );
}

function campo(etiqueta, valor) {
  return Object.freeze({ etiqueta, valor: normalizarValor(valor) });
}

function normalizarValor(valor) {
  if (valor === null || valor === undefined || valor === "") return null;
  return String(valor);
}

function formatearProporcion(actual, maximo) {
  if (!Number.isFinite(actual) || !Number.isFinite(maximo)) return null;
  return `${Math.round(actual)} / ${Math.round(maximo)}`;
}

function numeroSiFinito(valor) {
  return Number.isFinite(valor) ? Math.round(valor * 100) / 100 : null;
}

function enteroSiValido(valor) {
  return Number.isInteger(valor) ? valor : null;
}

function obtenerEstadoFisico(entidad) {
  if (entidad.estaDestruido === true || entidad.estaVivo === false) {
    return "Destruido";
  }
  if (
    Number.isFinite(entidad.vidaActual) &&
    Number.isFinite(entidad.vidaMaxima) &&
    entidad.vidaActual < entidad.vidaMaxima
  ) {
    return "Dañado";
  }
  if (Number.isFinite(entidad.vidaMaxima)) {
    return "Intacto";
  }
  return null;
}

function formatearId(valor) {
  if (typeof valor !== "string" || valor.trim() === "") return null;
  return valor
    .trim()
    .replaceAll("_", " ")
    .replace(/\b\p{L}/gu, (letra) => letra.toLocaleUpperCase("es"));
}

function formatearLista(valor) {
  if (!Array.isArray(valor) || valor.length === 0) return null;
  return valor.map(formatearId).filter(Boolean).join(", ");
}

function obtenerDescripcion(entidad) {
  if (typeof entidad.descripcion === "string" && entidad.descripcion.trim()) {
    return entidad.descripcion.trim();
  }
  return "Sin descripción configurada.";
}


function obtenerInteraccionesDeclaradas(entidad) {
  if (typeof entidad.obtenerInteracciones !== "function") return [];
  const interacciones = entidad.obtenerInteracciones();
  return Array.isArray(interacciones) ? interacciones : [];
}

function formatearInteraccion(interaccion) {
  if (typeof interaccion?.texto === "string" && interaccion.texto.trim()) {
    return interaccion.texto.trim();
  }
  return formatearId(interaccion?.tipo) ?? "Interacción";
}

function obtenerEfectos(juego, entidad) {
  if (typeof juego.obtenerEfectosTemporales !== "function") return [];
  const efectos = juego.obtenerEfectosTemporales(entidad);
  return Array.isArray(efectos) ? efectos : [];
}

function contieneEtiqueta(efecto, etiqueta) {
  return Array.isArray(efecto?.etiquetas) && efecto.etiquetas.includes(etiqueta);
}

function formatearEfecto(efecto) {
  const nombre =
    efecto?.nombreEfecto ??
    efecto?.nombre ??
    formatearId(efecto?.efectoId) ??
    "Efecto";
  const partes = [nombre];
  if (Number.isFinite(efecto?.intensidad) && efecto.intensidad > 1) {
    partes.push(`Intensidad ${efecto.intensidad}`);
  }
  if (Number.isFinite(efecto?.cantidad) && efecto.cantidad > 1) {
    partes.push(`x${efecto.cantidad}`);
  }
  return partes.join(" · ");
}
