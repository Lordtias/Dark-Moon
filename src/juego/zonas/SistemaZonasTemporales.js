import {
  crearMensajeTraducible,
  crearParametroContenidoMensaje,
  crearParametroEntidadMensaje,
  TIPOS_MENSAJE_JUEGO,
} from "../mensajes/MensajesJuego.js";
import {
  crearMensajeDetalleImpacto,
  crearMensajesDetalleDanioHabilidad,
} from "../mensajes/MensajesCalculoCombate.js";

import {
  ACTIVADORES_ZONA_TEMPORAL,
  POLITICAS_SUPERPOSICION_ZONA,
  normalizarCasillasZonaTemporal,
  normalizarConfiguracionZonaTemporal,
} from "./ContratosZonasTemporales.js";

export class SistemaZonasTemporales {
  constructor({
    mapa,
    obtenerTiempoActual,
    obtenerActores,
    esObjetivoValido,
    aplicarContenido,
  } = {}) {
    if (!Array.isArray(mapa) || mapa.length === 0) {
      throw new Error("SistemaZonasTemporales necesita un mapa válido.");
    }
    validarFuncion(obtenerTiempoActual, "consultar el tiempo actual");
    validarFuncion(obtenerActores, "consultar los actores del mapa");
    validarFuncion(esObjetivoValido, "filtrar objetivos de las zonas");
    validarFuncion(aplicarContenido, "aplicar el contenido de las zonas");

    this.mapa = mapa;
    this.obtenerTiempoActual = obtenerTiempoActual;
    this.obtenerActores = obtenerActores;
    this.esObjetivoValido = esObjetivoValido;
    this.aplicarContenido = aplicarContenido;
    this.zonas = new Map();
    this.siguienteId = 1;
    this.destruido = false;
  }

  crear(definicion = {}) {
    this.validarActivo();
    const ahora = this.obtenerTiempoActual();
    const normalizada = normalizarDefinicionCreacion({
      definicion,
      mapa: this.mapa,
      ahora,
      siguienteId: this.siguienteId,
    });
    this.siguienteId += 1;

    const coincidentes = this.encontrarZonasCoincidentes(normalizada);
    if (
      normalizada.configuracion.politicaSuperposicion ===
        POLITICAS_SUPERPOSICION_ZONA.RENOVAR_DURACION &&
      coincidentes.length > 0
    ) {
      return this.renovarZona(coincidentes[0], normalizada, ahora);
    }

    if (
      normalizada.configuracion.politicaSuperposicion ===
      POLITICAS_SUPERPOSICION_ZONA.REEMPLAZAR
    ) {
      for (const zona of coincidentes) {
        this.zonas.delete(zona.id);
      }
    }

    this.zonas.set(normalizada.id, normalizada);
    const acumulado = crearResultadoZonas();
    acumulado.eventos.push(
      crearEvento("zona_temporal_creada", normalizada, ahora),
    );
    acumulado.mensajes.push(
      crearMensajeTraducible("mensajes.zonas.creada", {
        parametros: {
          zona: parametroZona(normalizada),
          duracion: normalizada.configuracion.duracion,
        },
        tipo: TIPOS_MENSAJE_JUEGO.POSITIVO,
        respaldo: `${normalizada.nombre} permanece activa durante ${normalizada.configuracion.duracion} unidades de tiempo.`,
      }),
    );

    if (
      normalizada.configuracion.activadores.includes(
        ACTIVADORES_ZONA_TEMPORAL.AL_CREAR,
      )
    ) {
      this.activarZonaSobreOcupantes({
        zona: normalizada,
        motivo: ACTIVADORES_ZONA_TEMPORAL.AL_CREAR,
        instante: ahora,
        acumulado,
      });
    }

    return cerrarResultadoCreacion(acumulado, normalizada, {
      creada: true,
      renovada: false,
      reemplazadas: coincidentes.length,
    });
  }

  renovarZona(zona, definicion, ahora) {
    zona.nombre = definicion.nombre;
    zona.idEjecucion = definicion.idEjecucion;
    zona.idHabilidad = definicion.idHabilidad;
    zona.grado = definicion.grado;
    zona.fuente = definicion.fuente;
    zona.hostil = definicion.hostil;
    zona.configuracion = definicion.configuracion;
    zona.contenido = definicion.contenido;
    zona.contextoPotencia = definicion.contextoPotencia;
    zona.creadaEn = ahora;
    zona.venceEn = ahora + definicion.configuracion.duracion;
    zona.proximaActivacion = calcularProximaActivacion(zona, ahora);

    const acumulado = crearResultadoZonas();
    acumulado.eventos.push(crearEvento("zona_temporal_renovada", zona, ahora));
    acumulado.mensajes.push(
      crearMensajeTraducible("mensajes.zonas.renovada", {
        parametros: { zona: parametroZona(zona) },
        tipo: TIPOS_MENSAJE_JUEGO.POSITIVO,
        respaldo: `La duración de ${zona.nombre} fue renovada.`,
      }),
    );

    if (
      zona.configuracion.activadores.includes(
        ACTIVADORES_ZONA_TEMPORAL.AL_CREAR,
      )
    ) {
      this.activarZonaSobreOcupantes({
        zona,
        motivo: ACTIVADORES_ZONA_TEMPORAL.AL_CREAR,
        instante: ahora,
        acumulado,
      });
    }

    return cerrarResultadoCreacion(acumulado, zona, {
      creada: false,
      renovada: true,
      reemplazadas: 0,
    });
  }

  procesarMovimiento({ actor, origen, destino } = {}) {
    this.validarActivo();
    if (!actor || typeof actor !== "object") {
      throw new Error("El movimiento en zonas necesita un actor válido.");
    }
    validarPosicion(origen, "la posición anterior");
    validarPosicion(destino, "la posición nueva");

    const instante = this.obtenerTiempoActual();
    const acumulado = crearResultadoZonas();

    for (const zona of this.obtenerZonasInternasOrdenadas()) {
      if (
        !zona.configuracion.activadores.includes(
          ACTIVADORES_ZONA_TEMPORAL.AL_ENTRAR,
        )
      ) {
        continue;
      }
      const estabaDentro = zona.clavesCasillas.has(crearClaveCasilla(origen));
      const estaDentro = zona.clavesCasillas.has(crearClaveCasilla(destino));
      if (estabaDentro || !estaDentro) continue;
      if (!this.esObjetivoValido({ zona, actor })) continue;

      acumulado.eventos.push({
        ...crearEvento("actor_entro_zona_temporal", zona, instante),
        actor,
        origen: { ...origen },
        destino: { ...destino },
      });
      acumulado.mensajes.push(
        crearMensajeTraducible("mensajes.zonas.entrada", {
          parametros: {
            actor: crearParametroEntidadMensaje(actor, actor.nombre ?? "Un actor"),
            zona: parametroZona(zona),
          },
          tipo: TIPOS_MENSAJE_JUEGO.ALERTA,
          respaldo: `${actor.nombre ?? "Un actor"} entra en ${zona.nombre}.`,
        }),
      );
      this.activarZonaSobreObjetivo({
        zona,
        objetivo: actor,
        motivo: ACTIVADORES_ZONA_TEMPORAL.AL_ENTRAR,
        instante,
        acumulado,
      });
    }

    return cerrarResultado(acumulado);
  }

  obtenerSiguienteInstante() {
    this.validarActivo();
    let siguiente = null;
    for (const zona of this.zonas.values()) {
      siguiente = minimoNoNulo(siguiente, zona.venceEn);
      siguiente = minimoNoNulo(siguiente, zona.proximaActivacion);
    }
    return siguiente;
  }

  procesarEventosEn(instante) {
    this.validarActivo();
    if (!Number.isFinite(instante) || instante < 0) {
      throw new Error("El instante de zonas temporales no es válido.");
    }

    const acumulado = crearResultadoZonas();
    const ordenadas = this.obtenerZonasInternasOrdenadas();

    for (const zona of ordenadas) {
      if (
        zona.proximaActivacion === instante &&
        instante < zona.venceEn &&
        zona.configuracion.activadores.includes(
          ACTIVADORES_ZONA_TEMPORAL.POR_INTERVALO,
        )
      ) {
        const objetivos = this.obtenerOcupantesValidos(zona);
        acumulado.eventos.push({
          ...crearEvento("zona_temporal_pulso", zona, instante),
          motivo: ACTIVADORES_ZONA_TEMPORAL.POR_INTERVALO,
          cantidadObjetivos: objetivos.length,
        });
        this.activarZonaSobreOcupantes({
          zona,
          motivo: ACTIVADORES_ZONA_TEMPORAL.POR_INTERVALO,
          instante,
          acumulado,
          objetivos,
        });
        zona.proximaActivacion = calcularProximaActivacion(zona, instante);
      }
    }

    for (const zona of ordenadas) {
      if (zona.venceEn !== instante) continue;
      this.zonas.delete(zona.id);
      acumulado.eventos.push(
        crearEvento("zona_temporal_vencida", zona, instante),
      );
      acumulado.mensajes.push(
        crearMensajeTraducible("mensajes.zonas.disipada", {
          parametros: { zona: parametroZona(zona) },
          respaldo: `${zona.nombre} se disipó.`,
        }),
      );
    }

    return cerrarResultado(acumulado);
  }

  obtenerZonasActivas() {
    this.validarActivo();
    const ahora = this.obtenerTiempoActual();
    return this.obtenerZonasInternasOrdenadas().map((zona) => ({
      id: zona.id,
      idHabilidad: zona.idHabilidad,
      nombre: zona.nombre,
      grado: zona.grado,
      casillas: zona.casillas.map(copiarCasilla),
      apariencia: zona.configuracion.apariencia,
      grupoSuperposicion: zona.configuracion.grupoSuperposicion,
      politicaSuperposicion: zona.configuracion.politicaSuperposicion,
      activadores: [...zona.configuracion.activadores],
      creadaEn: zona.creadaEn,
      venceEn: zona.venceEn,
      tiempoRestante: Math.max(0, zona.venceEn - ahora),
      duracion: zona.configuracion.duracion,
      proximaActivacion: zona.proximaActivacion,
    }));
  }

  destruir() {
    if (this.destruido) return 0;
    const cantidad = this.zonas.size;
    this.zonas.clear();
    this.destruido = true;
    return cantidad;
  }

  obtenerOcupantesValidos(zona) {
    return this.obtenerActores()
      .filter((actor) => actor && typeof actor === "object")
      .filter((actor) => zona.clavesCasillas.has(crearClaveCasilla(actor)))
      .filter((actor) => this.esObjetivoValido({ zona, actor }))
      .sort(compararActores);
  }

  activarZonaSobreOcupantes({
    zona,
    motivo,
    instante,
    acumulado,
    objetivos = null,
  }) {
    const actores = Array.isArray(objetivos)
      ? objetivos
      : this.obtenerOcupantesValidos(zona);

    for (const objetivo of actores) {
      this.activarZonaSobreObjetivo({
        zona,
        objetivo,
        motivo,
        instante,
        acumulado,
      });
    }

    return actores.length;
  }

  activarZonaSobreObjetivo({ zona, objetivo, motivo, instante, acumulado }) {
    const ultimaActivacion = zona.ultimaActivacionPorObjetivo.get(objetivo);
    if (ultimaActivacion === instante) return;
    zona.ultimaActivacionPorObjetivo.set(objetivo, instante);

    const impacto = this.aplicarContenido({
      zona,
      objetivo,
      motivo,
      instante,
    });
    acumulado.impactos.push(impacto);
    if (impacto.danio) {
      acumulado.mensajes.push(
        ...crearMensajesDetalleDanioHabilidad({
          habilidad: { id: zona.idHabilidad, nombre: zona.nombre },
          objetivo,
          danio: impacto.danio,
          tipo: zona.hostil
            ? TIPOS_MENSAJE_JUEGO.POSITIVO
            : TIPOS_MENSAJE_JUEGO.SISTEMA,
        }),
      );
    } else if (impacto.resolucionImpacto) {
      acumulado.mensajes.push(
        crearMensajeDetalleImpacto(impacto.resolucionImpacto, {
          tipo: impacto.resolucionImpacto.impacto
            ? TIPOS_MENSAJE_JUEGO.POSITIVO
            : TIPOS_MENSAJE_JUEGO.NEGATIVO,
        }),
      );
    }
    for (const efecto of impacto.efectos ?? []) {
      acumulado.mensajes.push(
        efecto?.resultado?.mensajePresentacion ?? efecto?.resultado?.mensaje ?? null,
      );
    }
    const eventosEfectos = (impacto.efectos ?? []).flatMap(
      (efecto) => efecto?.eventos ?? [],
    );
    acumulado.eventos.push(
      {
        ...crearEvento("zona_temporal_activada", zona, instante),
        idEjecucion: impacto.idEjecucion,
        motivo,
        objetivo,
        posicionObjetivo: copiarPosicionSegura(objetivo),
        impacto: impacto.impacto === true,
        critico: impacto.critico === true,
        objetivoDerrotado: impacto.objetivoDerrotado === true,
        danio: copiarSimple(impacto.danio),
        resolucionImpacto: copiarSimple(impacto.resolucionImpacto),
        efectos: (impacto.efectos ?? []).map(({ eventos: _eventos, ...efecto }) =>
          copiarSimple(efecto),
        ),
      },
      ...eventosEfectos,
    );
    if (impacto.objetivoDerrotado) {
      acumulado.objetivosDerrotados.push(objetivo);
    }
  }

  encontrarZonasCoincidentes(definicion) {
    return this.obtenerZonasInternasOrdenadas().filter(
      (zona) =>
        zona.fuente === definicion.fuente &&
        zona.configuracion.grupoSuperposicion ===
          definicion.configuracion.grupoSuperposicion &&
        conjuntosIguales(zona.clavesCasillas, definicion.clavesCasillas),
    );
  }

  obtenerZonasInternasOrdenadas() {
    return [...this.zonas.values()].sort(
      (a, b) => a.creadaEn - b.creadaEn || a.ordenRegistro - b.ordenRegistro,
    );
  }

  validarActivo() {
    if (this.destruido) {
      throw new Error("El sistema de zonas temporales ya fue destruido.");
    }
  }
}

function normalizarDefinicionCreacion({
  definicion,
  mapa,
  ahora,
  siguienteId,
}) {
  if (!definicion || typeof definicion !== "object") {
    throw new Error("La creación de zona temporal necesita una definición.");
  }
  if (!definicion.fuente || typeof definicion.fuente !== "object") {
    throw new Error("La zona temporal necesita una fuente válida.");
  }
  if (!definicion.contenido || typeof definicion.contenido !== "object") {
    throw new Error("La zona temporal necesita contenido configurable.");
  }
  const danio = Array.isArray(definicion.contenido.danio)
    ? definicion.contenido.danio.map(copiarSimple)
    : null;
  const efectos = Array.isArray(definicion.contenido.efectos)
    ? definicion.contenido.efectos.map(copiarSimple)
    : null;
  if (!danio || !efectos || (danio.length === 0 && efectos.length === 0)) {
    throw new Error("La zona temporal necesita daño, efectos o ambos.");
  }

  const configuracion = normalizarConfiguracionZonaTemporal(
    definicion.configuracion,
    {
      etiqueta: `la zona de "${definicion.nombre ?? definicion.idHabilidad ?? "habilidad"}"`,
    },
  );
  const casillas = normalizarCasillasZonaTemporal(definicion.casillas, mapa);
  const id = `zona-${siguienteId}`;

  return {
    id,
    ordenRegistro: siguienteId,
    idEjecucion: normalizarTexto(definicion.idEjecucion, "el ID de ejecución"),
    idHabilidad: normalizarTexto(
      definicion.idHabilidad ?? "zona_temporal",
      "el ID de habilidad",
    ),
    nombre: normalizarTexto(
      definicion.nombre ?? definicion.idHabilidad ?? "Zona temporal",
      "el nombre de la zona",
    ),
    grado: Number.isInteger(definicion.grado) ? definicion.grado : 1,
    fuente: definicion.fuente,
    hostil: definicion.hostil === true,
    casillas,
    clavesCasillas: new Set(casillas.map(crearClaveCasilla)),
    configuracion,
    contenido: Object.freeze({
      danio: Object.freeze(danio.map((item) => Object.freeze(item))),
      efectos: Object.freeze(efectos.map((item) => Object.freeze(item))),
    }),
    contextoPotencia: copiarSimple(definicion.contextoPotencia),
    creadaEn: ahora,
    venceEn: ahora + configuracion.duracion,
    proximaActivacion: configuracion.activadores.includes(
      ACTIVADORES_ZONA_TEMPORAL.POR_INTERVALO,
    )
      ? ahora + configuracion.intervalo
      : null,
    ultimaActivacionPorObjetivo: new WeakMap(),
  };
}

function parametroZona(zona) {
  return crearParametroContenidoMensaje("habilidades", zona?.idHabilidad, {
    respaldo: zona?.nombre ?? "",
  });
}

function calcularProximaActivacion(zona, desde) {
  if (
    !zona.configuracion.activadores.includes(
      ACTIVADORES_ZONA_TEMPORAL.POR_INTERVALO,
    ) ||
    !Number.isFinite(zona.configuracion.intervalo)
  ) {
    return null;
  }
  const siguiente = desde + zona.configuracion.intervalo;
  return siguiente < zona.venceEn ? siguiente : null;
}

function crearResultadoZonas() {
  return {
    mensajes: [],
    eventos: [],
    impactos: [],
    objetivosDerrotados: [],
  };
}

function cerrarResultado(acumulado) {
  const mensajes = acumulado.mensajes.filter(Boolean);
  return {
    mensajes,
    mensaje: mensajes,
    eventos: acumulado.eventos,
    impactos: acumulado.impactos,
    objetivosDerrotados: [...new Set(acumulado.objetivosDerrotados)],
  };
}

function cerrarResultadoCreacion(acumulado, zona, datos) {
  return {
    ...cerrarResultado(acumulado),
    ...datos,
    zona: resumirZona(zona),
  };
}

function resumirZona(zona) {
  return {
    id: zona.id,
    idHabilidad: zona.idHabilidad,
    nombre: zona.nombre,
    grado: zona.grado,
    casillas: zona.casillas.map(copiarCasilla),
    apariencia: zona.configuracion.apariencia,
    grupoSuperposicion: zona.configuracion.grupoSuperposicion,
    politicaSuperposicion: zona.configuracion.politicaSuperposicion,
    activadores: [...zona.configuracion.activadores],
    creadaEn: zona.creadaEn,
    venceEn: zona.venceEn,
    duracion: zona.configuracion.duracion,
    proximaActivacion: zona.proximaActivacion,
  };
}

function crearEvento(tipo, zona, instante) {
  return {
    tipo,
    zonaId: zona.id,
    idHabilidad: zona.idHabilidad,
    nombre: zona.nombre,
    instante,
    zona: resumirZona(zona),
  };
}

function minimoNoNulo(actual, candidato) {
  if (!Number.isFinite(candidato)) return actual;
  if (!Number.isFinite(actual)) return candidato;
  return Math.min(actual, candidato);
}

function conjuntosIguales(a, b) {
  if (a.size !== b.size) return false;
  for (const valor of a) {
    if (!b.has(valor)) return false;
  }
  return true;
}

function compararActores(a, b) {
  return (
    a.y - b.y ||
    a.x - b.x ||
    String(a.nombre ?? "").localeCompare(String(b.nombre ?? ""))
  );
}

function crearClaveCasilla({ x, y }) {
  return `${x}:${y}`;
}

function copiarCasilla({ x, y }) {
  return { x, y };
}

function copiarPosicionSegura(posicion) {
  if (!Number.isInteger(posicion?.x) || !Number.isInteger(posicion?.y)) {
    return null;
  }
  return { x: posicion.x, y: posicion.y };
}

function validarPosicion(posicion, descripcion) {
  if (!Number.isInteger(posicion?.x) || !Number.isInteger(posicion?.y)) {
    throw new Error(`${descripcion} debe utilizar coordenadas enteras.`);
  }
}

function validarFuncion(funcion, descripcion) {
  if (typeof funcion !== "function") {
    throw new Error(`SistemaZonasTemporales necesita ${descripcion}.`);
  }
}

function normalizarTexto(valor, descripcion) {
  if (typeof valor !== "string" || valor.trim() === "") {
    throw new Error(`${descripcion} necesita texto.`);
  }
  return valor.trim();
}

function copiarSimple(valor) {
  if (valor === null || typeof valor !== "object") return valor;
  if (Array.isArray(valor)) return valor.map(copiarSimple);
  return Object.fromEntries(
    Object.entries(valor).map(([clave, contenido]) => [
      clave,
      copiarSimple(contenido),
    ]),
  );
}
