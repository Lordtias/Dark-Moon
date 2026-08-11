import { obtenerPerfilAtaque } from "../../ContextoPerfilesAtaquePorFamilia.js";
import { TAMANO_CASILLA_REFERENCIA } from "../ConfiguracionPhaser.js";

// Contrato visual compartido para clasificar ataques y resolver sus fuentes/perfiles.

export function esAtaqueCuerpoACuerpo(reproductor, evento) {
  const fuentes = evento?.configuracionAtaque?.fuentes ?? [];
  return fuentes.length === 0 || fuentes.every(
    (fuente) =>
      fuente?.esAtaqueNatural === true ||
      fuente?.tipoAtaque === "cuerpoACuerpo",
  );
}

export function esAtaqueArco(reproductor, evento) {
  const fuentes = evento?.configuracionAtaque?.fuentes ?? [];
  return fuentes.length === 1 &&
    fuentes[0]?.familiaObjeto === "arco" &&
    fuentes[0]?.tipoAtaque === "distancia";
}

export function esAtaqueVarita(reproductor, evento) {
  const fuentes = evento?.configuracionAtaque?.fuentes ?? [];
  return fuentes.length > 0 &&
    fuentes.every(
      (fuente) =>
        fuente?.familiaObjeto === "varita" &&
        fuente?.tipoAtaque === "distancia" &&
        typeof fuente?.elementoAtaqueBasico === "string",
    );
}

export function obtenerGolpesVisuales(reproductor, evento) {
  const golpes = evento?.resultado?.golpes;
  if (Array.isArray(golpes) && golpes.length > 0) {
    return golpes;
  }

  const golpesRealizados = evento?.resultado?.golpesRealizados;
  if (
    evento?.idObjetivo &&
    golpesRealizados === undefined &&
    evento?.resultado
  ) {
    return [
      Object.freeze({
        mano: null,
        impacto: evento.resultado.impacto === true,
        bloqueado: evento.resultado.bloqueado === true,
        critico: evento.resultado.critico === true,
        danio: Number(evento.resultado.danio) || 0,
        vidaObjetivoAntes: null,
        vidaObjetivoDespues: evento.estadoObjetivoFinal?.vidaActual ?? null,
        vidaObjetivoMaxima: evento.estadoObjetivoFinal?.vidaMaxima ?? null,
      }),
    ];
  }

  // Un ataque a casilla vacía conserva preparación, pero no inventa fallo,
  // objetivo ni daño.
  return [null];
}

export function obtenerPerfilGolpe(reproductor, evento, golpe, indiceGolpe) {
  const fuente = obtenerFuenteGolpe(reproductor, evento, golpe, indiceGolpe);
  return obtenerPerfilAtaque({
    familiaObjeto: fuente?.familiaObjeto ?? null,
    esAtaqueNatural: fuente?.esAtaqueNatural === true || fuente === null,
  });
}

export function obtenerFuenteGolpe(reproductor, evento, golpe, indiceGolpe) {
  const fuentes = evento?.configuracionAtaque?.fuentes ?? [];
  return (
    fuentes.find((actual) => golpe?.mano && actual?.mano === golpe.mano) ??
    fuentes[indiceGolpe] ??
    fuentes[0] ??
    null
  );
}

export function obtenerAvancePixeles(reproductor, perfil) {
  return Math.max(2,
    (Number(perfil?.animacion?.avanceCasilla) || 0.25) *
      TAMANO_CASILLA_REFERENCIA,
  );
}

export function debeUsarMarcaImpactoGenerica(reproductor, evento) {
  if (evento?.esHabilidad === true) return false;
  if (esAtaqueArco(reproductor, evento) || esAtaqueVarita(reproductor, evento)) return false;
  if (!esAtaqueCuerpoACuerpo(reproductor, evento)) return true;

  const fuentes = evento?.configuracionAtaque?.fuentes ?? [];
  return !fuentes.some((fuente) => {
    const perfil = obtenerPerfilAtaque({
      familiaObjeto: fuente?.familiaObjeto ?? null,
      esAtaqueNatural: fuente?.esAtaqueNatural === true || fuente == null,
    });
    return perfil?.animacion?.tipo === "corte" ||
      perfil?.animacion?.tipo === "golpe" ||
      perfil?.animacion?.tipo === "estocada" ||
      perfil?.animacion?.tipo === "estocada_recurso";
  });
}
