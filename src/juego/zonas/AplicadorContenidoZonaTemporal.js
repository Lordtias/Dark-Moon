import {
  resolverDanioHabilidad,
  resolverImpactoHabilidad,
} from "../habilidades/MotorDanioHabilidad.js";
import { normalizarDescriptorModificador } from "../modificadores/ContratosModificadoresCombatiente.js";
import {
  aplicarEfectosHabilidad,
  prepararEfectosHabilidad,
  validarDisponibilidadEfectosHabilidad,
} from "../habilidades/MotorEfectosHabilidad.js";

export function validarContenidoZonaTemporal({
  coordinadorTiempo,
  contenido,
} = {}) {
  validarCoordinador(coordinadorTiempo);
  validarContenido(contenido);
  validarDisponibilidadEfectosHabilidad({
    juego: { coordinadorTiempo },
    efectosConfigurados: contenido.efectos,
  });
  return true;
}

export function aplicarContenidoZonaTemporal({
  coordinadorTiempo,
  zona,
  objetivo,
  motivo,
  instante,
  registrarHostilidad = () => {},
} = {}) {
  validarCoordinador(coordinadorTiempo);
  validarZona(zona);
  if (!objetivo || typeof objetivo !== "object") {
    throw new Error("La activación de una zona necesita un objetivo válido.");
  }

  const contenido = zona.contenido;
  validarContenido(contenido);
  const idEjecucion = crearIdActivacion({ zona, objetivo, motivo, instante });

  const tieneContenidoActivable =
    contenido.danio.length > 0 || contenido.efectos.length > 0;

  if (!tieneContenidoActivable) {
    return {
      idEjecucion,
      zonaId: zona.id,
      idHabilidad: zona.idHabilidad,
      motivo,
      instante,
      objetivo,
      impacto: false,
      critico: false,
      objetivoDerrotado: false,
      danio: null,
      resolucionImpacto: null,
      efectos: [],
    };
  }

  if (zona.hostil) {
    registrarHostilidad(objetivo, `zona_temporal:${motivo}`);
  }

  const danio =
    contenido.danio.length > 0
      ? resolverDanioHabilidad({
          lanzador: zona.fuente,
          objetivo,
          componentesConfigurados: contenido.danio,
          contextoDanioHabilidad: zona.contextoDanioHabilidad,
          idEjecucion,
          resolverImpacto: zona.configuracion.resolverImpacto,
          resolverCritico: zona.configuracion.resolverCritico,
        })
      : resolverImpactoHabilidad({
          lanzador: zona.fuente,
          objetivo,
          idEjecucion,
          resolverImpacto: zona.configuracion.resolverImpacto,
          resolverCritico: zona.configuracion.resolverCritico,
        });

  const definicionesEfectos =
    danio.impacto && !danio.objetivoDerrotado
      ? prepararEfectosHabilidad({
          lanzador: zona.fuente,
          objetivo,
          efectosConfigurados: contenido.efectos,
          idEjecucion,
        })
      : [];
  const efectos =
    danio.impacto && !danio.objetivoDerrotado
      ? aplicarEfectosHabilidad({
          juego: { coordinadorTiempo },
          lanzador: zona.fuente,
          objetivo,
          efectosConfigurados: contenido.efectos,
          definicionesPreparadas: definicionesEfectos,
          idEjecucion,
        })
      : [];

  return {
    idEjecucion,
    zonaId: zona.id,
    idHabilidad: zona.idHabilidad,
    motivo,
    instante,
    objetivo,
    impacto: danio.impacto,
    critico: danio.critico,
    objetivoDerrotado: danio.objetivoDerrotado,
    danio: contenido.danio.length > 0 ? danio : null,
    resolucionImpacto: contenido.danio.length === 0 ? danio : null,
    efectos,
  };
}

function crearIdActivacion({ zona, objetivo, motivo, instante }) {
  const identidadObjetivo =
    objetivo.id ??
    objetivo.idEntidad ??
    objetivo.nombre ??
    `${objetivo.x}:${objetivo.y}`;
  return [
    zona.idEjecucion,
    "zona",
    zona.id,
    instante,
    motivo,
    identidadObjetivo,
  ].join(":");
}

function validarCoordinador(coordinadorTiempo) {
  if (
    !coordinadorTiempo ||
    typeof coordinadorTiempo.aplicarEfectoTemporal !== "function"
  ) {
    throw new Error(
      "La zona temporal necesita el coordinador canónico de tiempo y efectos.",
    );
  }
}

function validarZona(zona) {
  if (!zona || typeof zona !== "object") {
    throw new Error("La zona temporal activa no es válida.");
  }
  if (!zona.fuente || typeof zona.fuente !== "object") {
    throw new Error("La zona temporal necesita conservar su fuente.");
  }
  if (!zona.configuracion || typeof zona.configuracion !== "object") {
    throw new Error("La zona temporal no conserva su configuración.");
  }
}

function validarContenido(contenido) {
  if (!contenido || typeof contenido !== "object") {
    throw new Error("La zona temporal necesita contenido configurable.");
  }
  if (!Array.isArray(contenido.danio) || !Array.isArray(contenido.efectos)) {
    throw new Error("El contenido de la zona debe declarar daño y efectos.");
  }
  const modificadores = contenido.modificadores ?? [];
  if (!Array.isArray(modificadores)) {
    throw new Error("Los modificadores de zona deben estar dentro de una lista.");
  }
  modificadores.forEach((descriptor, indice) =>
    normalizarDescriptorModificador(
      {
        ...descriptor,
        id: descriptor?.id ?? `zona_config:${indice}`,
        origen: descriptor?.origen ?? "zona",
      },
      { origenPredeterminado: "zona" },
    ),
  );
  if (
    contenido.danio.length === 0 &&
    contenido.efectos.length === 0 &&
    modificadores.length === 0
  ) {
    throw new Error("La zona temporal necesita daño, efectos o modificadores.");
  }
}
