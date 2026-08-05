import { validarPerfilesAtaquePorFamilia } from "./ValidadorPerfilesAtaquePorFamilia.js";

let configuracionActiva = null;

export function configurarPerfilesAtaquePorFamilia({
  configuracion,
  configuracionObjetos,
} = {}) {
  configuracionActiva = validarPerfilesAtaquePorFamilia({
    configuracion,
    configuracionObjetos,
  });
  return configuracionActiva;
}

export function obtenerPerfilesAtaquePorFamilia() {
  if (!configuracionActiva) {
    throw new Error(
      "Los perfiles de ataque por familia todavía no fueron configurados.",
    );
  }
  return configuracionActiva;
}

export function obtenerPerfilAtaque({
  familiaObjeto = null,
  esAtaqueNatural = false,
} = {}) {
  const configuracion = obtenerPerfilesAtaquePorFamilia();

  if (esAtaqueNatural) {
    return configuracion.fallbacks.ataque_natural;
  }

  if (
    typeof familiaObjeto === "string" &&
    Object.hasOwn(configuracion.familias, familiaObjeto)
  ) {
    return configuracion.familias[familiaObjeto];
  }

  return configuracion.fallbacks.familia_desconocida;
}

export function obtenerSecuenciaAtaque(idSecuencia) {
  const configuracion = obtenerPerfilesAtaquePorFamilia();
  const secuencia = configuracion.secuencias[idSecuencia];

  if (!secuencia) {
    throw new Error(
      `La secuencia visual de ataque "${idSecuencia}" no está configurada.`,
    );
  }

  return secuencia;
}


export function obtenerPerfilProyectilElemental(elemento) {
  const configuracion = obtenerPerfilesAtaquePorFamilia();
  const perfil = configuracion.proyectilesElementales?.[elemento];

  if (!perfil) {
    throw new Error(
      `El proyectil elemental "${elemento}" no está configurado.`,
    );
  }

  return perfil;
}

export function obtenerConfiguracionRitmoVisual() {
  return obtenerPerfilesAtaquePorFamilia().ritmoVisual;
}
