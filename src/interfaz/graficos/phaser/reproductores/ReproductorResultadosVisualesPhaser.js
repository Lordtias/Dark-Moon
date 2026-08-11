import { traducir } from "../../../idiomas/ContextoIdioma.js";
import { CONFIGURACION_ANIMACIONES_PHASER } from "../ConfiguracionAnimacionesPhaser.js";
import {
  CONFIGURACION_EFECTOS_COMBATE_PHASER,
  TIPOS_FEEDBACK_COMBATE,
} from "../ConfiguracionEfectosCombatePhaser.js";
import {
  normalizarDireccionVisual,
  obtenerCentroEntidadVisual,
} from "../GeometriaVisualPhaser.js";
import { reproducirRecuperacionHabilidad } from "./ReproductorRecuperacionesPhaser.js";

// Representa resultados ya resueltos por combate, habilidades y estados. No
// calcula daño, críticos, bloqueo, muerte ni botín.
export async function reproducirResultadoGolpe(
  contexto,
  evento,
  golpe,
  indiceGolpe,
  version,
  {
    esperarDecorativos = true,
    usarMarcaImpactoGenerica = true,
  } = {},
) {
  if (!evento.idObjetivo) return;

  const esenciales = [];
  const decorativos = [];

  if (golpe.impacto !== true) {
    esenciales.push(reproducirFalloObjetivo(contexto, evento, version));
    decorativos.push(
      reproducirTextoResultado(contexto, {
        evento,
        texto: traducir("mensajes.feedback.fallo", { respaldo: "FALLO" }),
        tipo: TIPOS_FEEDBACK_COMBATE.FALLO,
        indiceGolpe,
        version,
      }),
    );
    await Promise.all(esenciales);
    await resolverDecorativos(decorativos, esperarDecorativos);
    return;
  }

  const danio = Math.max(0, Number(golpe.danio) || 0);

  if (danio > 0) {
    esenciales.push(
      reproducirImpactoObjetivo(contexto, evento, golpe, version, {
        usarMarcaImpactoGenerica,
      }),
      reproducirCambioVida(contexto, evento, golpe, version),
    );
    decorativos.push(
      reproducirTextoResultado(contexto, {
        evento,
        texto: `${formatearDanio(danio)}`,
        tipo: TIPOS_FEEDBACK_COMBATE.DANIO,
        indiceGolpe,
        version,
      }),
    );
  }

  if (golpe.bloqueado === true) {
    decorativos.push(
      reproducirBloqueo(contexto, evento, indiceGolpe, version),
      reproducirTextoResultado(contexto, {
        evento,
        texto: traducir("mensajes.feedback.bloqueo", { respaldo: "BLOQUEO" }),
        tipo: TIPOS_FEEDBACK_COMBATE.BLOQUEO,
        indiceGolpe,
        desplazamientoY: 8,
        version,
      }),
    );
  }

  if (golpe.critico === true) {
    decorativos.push(
      reproducirTextoResultado(contexto, {
        evento,
        texto: traducir("mensajes.feedback.critico", { respaldo: "CRÍTICO" }),
        tipo: TIPOS_FEEDBACK_COMBATE.CRITICO,
        indiceGolpe,
        desplazamientoY: -8,
        version,
      }),
    );
  }

  await Promise.all(esenciales);
  await resolverDecorativos(decorativos, esperarDecorativos);
}

export function resolverDecorativos(promesas, esperar) {
  const grupo = Promise.all(promesas);
  if (esperar) {
    return grupo;
  }
  void grupo.catch(() => {});
  return Promise.resolve();
}

export async function reproducirFalloObjetivo(contexto, evento, version) {
  const nodo = contexto.compositor.obtenerNodoEntidad(evento.idObjetivo);
  if (!nodo?.contenedor || contexto.efectosReducidos) return;

  const contenedor = nodo.contenedor;
  const posicionInicial = { x: contenedor.x, y: contenedor.y };
  const direccion = normalizarDireccionVisual({
    origen: evento.origenAtacante,
    destino: evento.posicionObjetivo,
  });
  const lateral = { x: -direccion.y, y: direccion.x };
  const desplazamiento =
    CONFIGURACION_EFECTOS_COMBATE_PHASER.esquiva.desplazamientoPx;

  await contexto.crearTween({
    targets: contenedor,
    x: posicionInicial.x + lateral.x * desplazamiento,
    y: posicionInicial.y + lateral.y * desplazamiento,
    duration: contexto.calcularDuracion(
      CONFIGURACION_EFECTOS_COMBATE_PHASER.esquiva.duracionMs,
    ),
    yoyo: true,
    ease: "Sine.easeOut",
  }, version);

  contenedor.x = posicionInicial.x;
  contenedor.y = posicionInicial.y;
}

export async function reproducirImpactoObjetivo(
  contexto,
  evento,
  golpe,
  version,
  { usarMarcaImpactoGenerica = true } = {},
) {
  const nodoObjetivo = contexto.compositor.obtenerNodoEntidad(evento.idObjetivo);
  if (!nodoObjetivo?.contenedor) return;

  const contenedor = nodoObjetivo.contenedor;
  const posicionInicial = {
    x: contenedor.x,
    y: contenedor.y,
    alpha: contenedor.alpha ?? 1,
  };
  const direccion = normalizarDireccionVisual({
    origen: evento.origenAtacante,
    destino: evento.posicionObjetivo,
  });
  const duracion = contexto.calcularDuracion(
    CONFIGURACION_ANIMACIONES_PHASER.impactoObjetivoMs,
  );
  const factorCritico = golpe.critico === true
    ? CONFIGURACION_EFECTOS_COMBATE_PHASER.golpe.impactoCriticoEscala
    : 1;
  const marca = contexto.efectosReducidos || !usarMarcaImpactoGenerica
    ? null
    : contexto.creadorEfectos?.crearMarcaImpacto({
        centro: posicionInicial,
        critico: golpe.critico === true,
      });

  if (marca) {
    marca.setScale?.(
      CONFIGURACION_ANIMACIONES_PHASER.escalaMarcaImpactoInicial,
    );
  }

  const promesas = [
    contexto.crearTween({
      targets: contenedor,
      x:
        posicionInicial.x +
        direccion.x *
          CONFIGURACION_ANIMACIONES_PHASER.desplazamientoImpactoPx *
          factorCritico,
      y:
        posicionInicial.y +
        direccion.y *
          CONFIGURACION_ANIMACIONES_PHASER.desplazamientoImpactoPx *
          factorCritico,
      alpha: contexto.efectosReducidos ? 0.72 : golpe.critico ? 0.4 : 0.52,
      duration: Math.max(1, Math.round(duracion / 2)),
      yoyo: true,
      ease: "Quad.easeOut",
    }, version),
  ];

  if (marca) {
    promesas.push(
      contexto.crearTween({
        targets: marca,
        scaleX: CONFIGURACION_ANIMACIONES_PHASER.escalaMarcaImpactoFinal,
        scaleY: CONFIGURACION_ANIMACIONES_PHASER.escalaMarcaImpactoFinal,
        alpha: 0,
        duration: duracion,
        ease: "Quad.easeOut",
      }, version),
    );
  }

  await Promise.all(promesas);

  contenedor.x = posicionInicial.x;
  contenedor.y = posicionInicial.y;
  contenedor.alpha = posicionInicial.alpha;
  marca?.destroy?.();
}

export async function reproducirCambioVida(contexto, evento, golpe, version) {
  const vidaAntes = Number(golpe.vidaObjetivoAntes);
  const vidaDespues = Number(golpe.vidaObjetivoDespues);
  const vidaMaxima = Number(golpe.vidaObjetivoMaxima);

  if (
    !Number.isFinite(vidaAntes) ||
    !Number.isFinite(vidaDespues) ||
    !Number.isFinite(vidaMaxima) ||
    vidaMaxima <= 0 ||
    vidaAntes === vidaDespues
  ) {
    return;
  }

  const estado = { vida: vidaAntes };
  const actualizable = contexto.compositor.actualizarBarraVidaEntidad(
    evento.idObjetivo,
    {
      vidaActual: vidaAntes,
      vidaMaxima,
    },
  );
  if (!actualizable) return;

  await contexto.crearTween({
    targets: estado,
    vida: vidaDespues,
    duration: contexto.calcularDuracion(
      CONFIGURACION_EFECTOS_COMBATE_PHASER.barraVida.duracionMs,
    ),
    ease: "Linear",
    onUpdate: () => {
      contexto.compositor.actualizarBarraVidaEntidad(evento.idObjetivo, {
        vidaActual: estado.vida,
        vidaMaxima,
      });
    },
  }, version);

  contexto.compositor.actualizarBarraVidaEntidad(evento.idObjetivo, {
    vidaActual: vidaDespues,
    vidaMaxima,
  });
}

export async function reproducirBloqueo(contexto, evento, indiceGolpe, version) {
  if (contexto.efectosReducidos) return;
  const centro = obtenerCentroObjetivo(contexto, evento);
  const escudo = contexto.creadorEfectos?.crearEscudoBloqueo({
    centro,
    indiceGolpe,
  });
  if (!escudo) return;

  await contexto.crearTween({
    targets: escudo,
    scaleX: CONFIGURACION_EFECTOS_COMBATE_PHASER.bloqueo.escalaFinal,
    scaleY: CONFIGURACION_EFECTOS_COMBATE_PHASER.bloqueo.escalaFinal,
    alpha: 0,
    duration: contexto.calcularDuracion(
      CONFIGURACION_EFECTOS_COMBATE_PHASER.bloqueo.duracionMs,
    ),
    ease: "Quad.easeOut",
  }, version);
  escudo.destroy?.();
}

export async function reproducirTextoResultado(
  contexto,
  {
    evento,
    texto,
    tipo,
    indiceGolpe,
    desplazamientoY = 0,
    version,
  } = {},
) {
  const centro = obtenerCentroObjetivo(contexto, evento);
  const objeto = contexto.creadorEfectos?.crearTextoFlotante({
    centro,
    texto,
    tipo,
    indiceGolpe,
    desplazamientoY,
  });
  if (!objeto) return;

  const duracion = contexto.calcularDuracion(
    CONFIGURACION_EFECTOS_COMBATE_PHASER.texto.duracionMs,
  );
  const yInicial = objeto.y;

  await contexto.crearTween({
    targets: objeto,
    y: yInicial - CONFIGURACION_EFECTOS_COMBATE_PHASER.texto.elevacionPx,
    scaleX: CONFIGURACION_EFECTOS_COMBATE_PHASER.texto.escalaFinal,
    scaleY: CONFIGURACION_EFECTOS_COMBATE_PHASER.texto.escalaFinal,
    alpha: 0,
    duration: duracion,
    ease: "Quad.easeOut",
  }, version);
  objeto.destroy?.();
}

export async function reproducirDanioPeriodico(contexto, evento, version) {
  if (!evento.idObjetivo || evento.danio <= 0) {
    return;
  }

  const golpeVisual = {
    vidaObjetivoAntes: evento.vidaAntes,
    vidaObjetivoDespues: evento.vidaDespues,
    vidaObjetivoMaxima: evento.vidaMaxima,
  };
  const nodo = contexto.compositor.obtenerNodoEntidad(evento.idObjetivo);
  const centro = nodo?.contenedor
    ? { x: nodo.contenedor.x, y: nodo.contenedor.y }
    : contexto.compositor.obtenerCentroCasilla(evento.posicionObjetivo);
  const promesas = [
    reproducirCambioVida(contexto, evento, golpeVisual, version),
  ];

  if (centro) {
    promesas.push(
      reproducirTextoResultado(contexto, {
        evento,
        texto: `${formatearDanio(evento.danio)}`,
        tipo: TIPOS_FEEDBACK_COMBATE.DANIO,
        indiceGolpe: 0,
        desplazamientoY: 0,
        version,
      }),
    );
  }

  if (nodo?.contenedor && !contexto.efectosReducidos) {
    const alphaInicial = nodo.contenedor.alpha ?? 1;
    promesas.push(
      contexto.crearTween({
        targets: nodo.contenedor,
        alpha: 0.48,
        duration: contexto.calcularDuracion(90),
        yoyo: true,
        ease: "Sine.easeOut",
      }, version).then(() => {
        if (nodo.contenedor) nodo.contenedor.alpha = alphaInicial;
      }),
    );
  }

  await Promise.all(promesas);
}

export async function reproducirBotinAparecido(contexto, evento, version) {
  if (!evento?.entidadBotin) return;

  if (evento.botinActualizado === true && evento.idBotinAnterior) {
    const nodoExistente = contexto.compositor.obtenerNodoEntidad?.(
      evento.idBotinAnterior,
    );
    if (nodoExistente?.contenedor) {
      if (contexto.efectosReducidos) {
        await contexto.esperar(contexto.calcularDuracion(90), version);
        return;
      }

      const escalaX = nodoExistente.contenedor.scaleX ?? 1;
      const escalaY = nodoExistente.contenedor.scaleY ?? 1;
      await contexto.crearTween({
        targets: nodoExistente.contenedor,
        scaleX: escalaX * 1.14,
        scaleY: escalaY * 1.14,
        duration: contexto.calcularDuracion(110),
        yoyo: true,
        ease: "Sine.easeOut",
      }, version);
      if (nodoExistente.contenedor) {
        nodoExistente.contenedor.scaleX = escalaX;
        nodoExistente.contenedor.scaleY = escalaY;
      }
      return;
    }
  }

  const rutaBotin = evento.entidadBotin.recursoVisual ?? null;
  if (rutaBotin) {
    await contexto.gestorRecursos?.obtenerInformacionAsync?.(rutaBotin);
    if (version !== contexto.versionCancelacion || contexto.destruido) return;
  }

  const nodo = contexto.compositor.establecerEntidadVisualTemporal?.(
    evento.entidadBotin,
  );
  if (!nodo?.contenedor) return;

  if (contexto.efectosReducidos) {
    nodo.contenedor.alpha = 1;
    nodo.contenedor.scaleX = 1;
    nodo.contenedor.scaleY = 1;
    await contexto.esperar(contexto.calcularDuracion(80), version);
    return;
  }

  nodo.contenedor.alpha = 0;
  nodo.contenedor.scaleX = 0.6;
  nodo.contenedor.scaleY = 0.6;
  await contexto.crearTween({
    targets: nodo.contenedor,
    alpha: 1,
    scaleX: 1.1,
    scaleY: 1.1,
    duration: contexto.calcularDuracion(130),
    ease: "Back.easeOut",
  }, version);

  if (version !== contexto.versionCancelacion || contexto.destruido) return;
  await contexto.crearTween({
    targets: nodo.contenedor,
    scaleX: 1,
    scaleY: 1,
    duration: contexto.calcularDuracion(70),
    ease: "Sine.easeInOut",
  }, version);
}

export async function reproducirEntidadDerrotada(contexto, evento, version) {
  const nodo = contexto.compositor.obtenerNodoEntidad(evento.idEntidad);
  if (!nodo) {
    return;
  }

  const objetivos = [nodo.contenedor, nodo.sombra].filter(Boolean);
  if (objetivos.length > 0 && !contexto.efectosReducidos) {
    await contexto.crearTween({
      targets: objetivos,
      alpha: 0,
      scaleX: 0.82,
      scaleY: 0.82,
      duration: contexto.calcularDuracion(160),
      ease: "Quad.easeIn",
    }, version);
  }

  if (version === contexto.versionCancelacion && !contexto.destruido) {
    contexto.compositor.retirarEntidadVisual?.(evento.idEntidad);
  }
}

export function obtenerCentroObjetivo(contexto, evento) {
  return obtenerCentroEntidadVisual(contexto, {
    idEntidad: evento.idObjetivo,
    posicion: evento.posicionObjetivo,
  });
}

function formatearDanio(valor) {
  return Number.isInteger(valor) ? `${valor}` : valor.toFixed(1);
}
// Adapta el resultado ya resuelto de una habilidad o zona a las primitivas
// visuales compartidas de daño, recuperación, estados, muerte y botín.
export async function reproducirResultadoImpactoHabilidad(reproductor, evento, impacto, version) {
  const eventoResultado = {
    ...evento,
    esHabilidad: true,
    idAtacante: evento.idActor,
    idObjetivo: impacto.idObjetivo,
    origenAtacante: evento.origenActor,
    posicionObjetivo: impacto.posicionObjetivo ?? evento.posicionObjetivo,
  };
  const golpe = {
    impacto: impacto.impacto === true,
    bloqueado: false,
    critico: impacto.critico === true,
    danio: Math.max(0, Number(impacto.danio?.cantidad) || 0),
    vidaObjetivoAntes: impacto.danio?.vidaObjetivoAntes ?? null,
    vidaObjetivoDespues: impacto.danio?.vidaObjetivoDespues ?? null,
    vidaObjetivoMaxima: impacto.danio?.vidaObjetivoMaxima ?? null,
  };
  await reproducirResultadoGolpe(
    reproductor,
    eventoResultado,
    golpe,
    impacto.orden ?? 0,
    version,
    {
      esperarDecorativos: false,
      usarMarcaImpactoGenerica: false,
    },
  );

  const recursosRecuperados = convertirCambiosRecursosARecuperacion(
    impacto.recursosObjetivo,
  );
  if (recursosRecuperados.length > 0) {
    await reproducirRecuperacionHabilidad(reproductor, {
      evento,
      impacto,
      recursos: recursosRecuperados,
      version,
    });
  }

  for (const eventoEfecto of impacto.eventosEfectos ?? []) {
    if (version !== reproductor.versionCancelacion || reproductor.destruido) return;
    await reproductor.reproducirEventoVisual(eventoEfecto, version);
  }

  if (impacto.derrotaVisual) {
    await reproducirEntidadDerrotada(reproductor, impacto.derrotaVisual, version);
  }
  if (impacto.botinVisual) {
    await reproducirBotinAparecido(reproductor, impacto.botinVisual, version);
  }
}

function convertirCambiosRecursosARecuperacion(recursos) {
  if (!Array.isArray(recursos)) return [];
  return recursos
    .map((recurso) => {
      const cantidadAplicada = Math.max(0, Number(recurso?.cantidadReal) || 0);
      const valorMaximo = Math.max(0, Number(recurso?.valorMaximo) || 0);
      if (cantidadAplicada <= 0 || valorMaximo <= 0) return null;
      return {
        recurso: recurso?.recurso === "mana" ? "mana" : "vida",
        cantidadAplicada,
        valorAntes: Math.max(0, Number(recurso?.valorAntes) || 0),
        valorDespues: Math.max(0, Number(recurso?.valorDespues) || 0),
        valorMaximo,
        proporcionRecuperada: Math.min(1, cantidadAplicada / valorMaximo),
      };
    })
    .filter(Boolean);
}
