import {
  TIPOS_FUENTE_EXPERIENCIA_MAESTRIA,
  fuenteExperienciaCoincide,
  normalizarEventoExperienciaMaestria,
} from "./ContratosExperienciaMaestrias.js";

// Único traductor entre hechos canónicos ya resueltos (Maná consumido, daño
// aplicado o daño mitigado) y la XP de las maestrías. No recalcula combate.
export class SistemaExperienciaMaestrias {
  constructor({ configuracion, progresoHabilidades } = {}) {
    if (!configuracion?.maestrias || typeof configuracion.maestrias !== "object") {
      throw new Error("SistemaExperienciaMaestrias necesita la configuración validada.");
    }
    if (
      !progresoHabilidades ||
      typeof progresoHabilidades.agregarExperienciaMaestria !== "function" ||
      typeof progresoHabilidades.obtenerResumen !== "function"
    ) {
      throw new Error("SistemaExperienciaMaestrias necesita ProgresoHabilidadesJugador.");
    }
    this.configuracion = configuracion;
    this.progresoHabilidades = progresoHabilidades;
    this.idsRecompensasAplicadas = new Set();
  }

  registrarEvento(eventoRecibido) {
    const evento = normalizarEventoExperienciaMaestria(eventoRecibido);
    if (evento.cantidad <= 0) {
      return crearResultadoVacio(evento, "CANTIDAD_NO_POSITIVA");
    }

    const maestriasDisponibles = new Set(
      Object.keys(this.progresoHabilidades.obtenerResumen().maestrias),
    );
    const resultados = [];

    for (const [idMaestria, maestria] of Object.entries(this.configuracion.maestrias)) {
      if (!maestriasDisponibles.has(idMaestria)) continue;
      for (let indiceFuente = 0; indiceFuente < maestria.fuentesExperiencia.length; indiceFuente += 1) {
        const fuente = maestria.fuentesExperiencia[indiceFuente];
        if (!fuenteExperienciaCoincide(fuente, evento, idMaestria)) continue;

        const clave = crearClaveRecompensa({
          evento,
          idMaestria,
          indiceFuente,
        });
        if (this.idsRecompensasAplicadas.has(clave)) {
          resultados.push({
            exito: false,
            motivo: "EVENTO_YA_RECOMPENSADO",
            idMaestria,
            experienciaGanada: 0,
            clave,
          });
          continue;
        }

        const experiencia = Math.max(1, Math.round(evento.cantidad * fuente.factor));
        this.idsRecompensasAplicadas.add(clave);

        const resultado = this.progresoHabilidades.agregarExperienciaMaestria({
          idMaestria,
          cantidad: experiencia,
        });
        resultados.push({
          ...resultado,
          motivo: null,
          clave,
          tipoFuente: evento.tipo,
          cantidadFuente: evento.cantidad,
          factorExperiencia: fuente.factor,
        });
      }
    }

    return {
      exito: resultados.some((item) => item.experienciaGanada > 0),
      motivo: resultados.length === 0 ? "SIN_MAESTRIA_COMPATIBLE" : null,
      evento,
      experienciaGanada: resultados.reduce(
        (total, item) => total + (item.experienciaGanada ?? 0),
        0,
      ),
      resultados,
    };
  }

  registrarEventos(eventos = []) {
    if (!Array.isArray(eventos)) {
      throw new Error("Los eventos de experiencia deben formar una lista.");
    }
    const resultados = eventos.map((evento) => this.registrarEvento(evento));
    return {
      exito: resultados.some((resultado) => resultado.exito),
      experienciaGanada: resultados.reduce(
        (total, resultado) => total + resultado.experienciaGanada,
        0,
      ),
      resultados,
    };
  }

  registrarAtaqueRealizado({ resultadoAtaque } = {}) {
    validarResultadoAtaque(resultadoAtaque);
    const idEvento = resultadoAtaque.idResolucion;
    const eventos = [];
    for (let indice = 0; indice < resultadoAtaque.golpes.length; indice += 1) {
      const golpe = resultadoAtaque.golpes[indice];
      if (golpe?.impacto !== true || !Number.isFinite(golpe.danio) || golpe.danio <= 0) {
        continue;
      }
      if (typeof golpe.familiaArma !== "string" || golpe.familiaArma === "") {
        continue;
      }
      eventos.push({
        idEvento,
        idComponente: `golpe:${indice + 1}:${golpe.mano ?? "sin_mano"}`,
        tipo: TIPOS_FUENTE_EXPERIENCIA_MAESTRIA.DANIO_APLICADO_ARMA,
        cantidad: golpe.danio,
        familiaArma: golpe.familiaArma,
      });
    }
    return this.registrarEventos(eventos);
  }

  registrarAtaqueRecibido({ resultadoAtaque, combatiente } = {}) {
    validarResultadoAtaque(resultadoAtaque);
    if (!combatiente || typeof combatiente !== "object") {
      throw new Error("La experiencia defensiva necesita el combatiente objetivo.");
    }
    const idEvento = resultadoAtaque.idResolucion;
    const resultados = [];
    for (let indice = 0; indice < resultadoAtaque.golpes.length; indice += 1) {
      const golpe = resultadoAtaque.golpes[indice];
      const eventosArmadura = [];
      const distribucion = golpe?.distribucionMitigacionArmadura ?? {};
      for (const categoria of ["ligera", "media", "pesada", "escudo"]) {
        const cantidad = distribucion[categoria] ?? 0;
        if (!Number.isFinite(cantidad) || cantidad <= 0) continue;
        eventosArmadura.push({
          idEvento,
          idComponente: `golpe:${indice + 1}:armadura:${categoria}`,
          tipo: TIPOS_FUENTE_EXPERIENCIA_MAESTRIA.DANIO_MITIGADO_ARMADURA,
          cantidad,
          categoriaArmadura: categoria,
        });
      }
      if (eventosArmadura.length > 0) {
        resultados.push(this.registrarDistribucionArmadura(eventosArmadura));
      }

      if (Number.isFinite(golpe?.danioMitigadoBloqueo) && golpe.danioMitigadoBloqueo > 0) {
        const contexto = typeof combatiente.obtenerContextoModificadores === "function"
          ? combatiente.obtenerContextoModificadores()
          : {};
        resultados.push(this.registrarEvento({
          idEvento,
          idComponente: `golpe:${indice + 1}:bloqueo`,
          tipo: TIPOS_FUENTE_EXPERIENCIA_MAESTRIA.DANIO_MITIGADO_BLOQUEO,
          cantidad: golpe.danioMitigadoBloqueo,
          familiaSecundaria: contexto.familiaSecundaria ?? null,
        }));
      }
    }
    return combinarResultados(resultados);
  }

  // La mitigación de Armadura forma un único pool por golpe. Primero se
  // calcula la XP total y luego se distribuye por restos mayores entre las
  // categorías que realmente aportaron Armadura. De esta forma el redondeo
  // nunca crea ni destruye XP por llevar un conjunto mixto.
  registrarDistribucionArmadura(eventosRecibidos) {
    if (!Array.isArray(eventosRecibidos) || eventosRecibidos.length === 0) {
      return combinarResultados([]);
    }

    const maestriasDisponibles = new Set(
      Object.keys(this.progresoHabilidades.obtenerResumen().maestrias),
    );
    const candidatos = [];

    for (const eventoRecibido of eventosRecibidos) {
      const evento = normalizarEventoExperienciaMaestria(eventoRecibido);
      if (evento.cantidad <= 0) continue;

      for (const [idMaestria, maestria] of Object.entries(this.configuracion.maestrias)) {
        if (!maestriasDisponibles.has(idMaestria)) continue;
        for (let indiceFuente = 0; indiceFuente < maestria.fuentesExperiencia.length; indiceFuente += 1) {
          const fuente = maestria.fuentesExperiencia[indiceFuente];
          if (!fuenteExperienciaCoincide(fuente, evento, idMaestria)) continue;
          const clave = crearClaveRecompensa({ evento, idMaestria, indiceFuente });
          if (this.idsRecompensasAplicadas.has(clave)) {
            candidatos.push({
              duplicado: true,
              evento,
              idMaestria,
              fuente,
              clave,
            });
            continue;
          }
          candidatos.push({
            duplicado: false,
            evento,
            idMaestria,
            fuente,
            clave,
            experienciaExacta: evento.cantidad * fuente.factor,
          });
        }
      }
    }

    const nuevos = candidatos.filter((item) => !item.duplicado);
    if (nuevos.length === 0) {
      return combinarResultados(
        candidatos.map((item) => ({
          exito: false,
          motivo: "EVENTO_YA_RECOMPENSADO",
          idMaestria: item.idMaestria,
          experienciaGanada: 0,
          clave: item.clave,
        })),
      );
    }

    const experienciaTotalExacta = nuevos.reduce(
      (total, item) => total + item.experienciaExacta,
      0,
    );
    const objetivoEntero = Math.max(1, Math.round(experienciaTotalExacta));
    let asignada = 0;
    for (const item of nuevos) {
      item.experienciaAsignada = Math.floor(item.experienciaExacta);
      item.resto = item.experienciaExacta - item.experienciaAsignada;
      asignada += item.experienciaAsignada;
    }

    let restante = objetivoEntero - asignada;
    const orden = [...nuevos].sort((a, b) => {
      const diferenciaResto = b.resto - a.resto;
      if (diferenciaResto !== 0) return diferenciaResto;
      if (a.idMaestria !== b.idMaestria) {
        return a.idMaestria < b.idMaestria ? -1 : 1;
      }
      if (a.clave === b.clave) return 0;
      return a.clave < b.clave ? -1 : 1;
    });
    for (let indice = 0; restante > 0; indice = (indice + 1) % orden.length) {
      orden[indice].experienciaAsignada += 1;
      restante -= 1;
    }

    const resultados = candidatos.filter((item) => item.duplicado).map((item) => ({
      exito: false,
      motivo: "EVENTO_YA_RECOMPENSADO",
      idMaestria: item.idMaestria,
      experienciaGanada: 0,
      clave: item.clave,
    }));

    for (const item of nuevos) {
      this.idsRecompensasAplicadas.add(item.clave);
      if (item.experienciaAsignada <= 0) {
        resultados.push({
          exito: false,
          motivo: "SIN_XP_TRAS_DISTRIBUCION",
          idMaestria: item.idMaestria,
          experienciaGanada: 0,
          clave: item.clave,
          tipoFuente: item.evento.tipo,
          cantidadFuente: item.evento.cantidad,
          factorExperiencia: item.fuente.factor,
        });
        continue;
      }
      const resultado = this.progresoHabilidades.agregarExperienciaMaestria({
        idMaestria: item.idMaestria,
        cantidad: item.experienciaAsignada,
      });
      resultados.push({
        ...resultado,
        motivo: null,
        clave: item.clave,
        tipoFuente: item.evento.tipo,
        cantidadFuente: item.evento.cantidad,
        factorExperiencia: item.fuente.factor,
      });
    }

    return combinarResultados(resultados);
  }

  limpiarDeduplicacionSesion() {
    this.idsRecompensasAplicadas.clear();
  }
}

function combinarResultados(resultados) {
  return {
    exito: resultados.some((resultado) =>
      resultado.exito === true || (resultado.experienciaGanada ?? 0) > 0,
    ),
    experienciaGanada: resultados.reduce(
      (total, resultado) => total + (resultado.experienciaGanada ?? 0),
      0,
    ),
    resultados,
  };
}

function validarResultadoAtaque(resultado) {
  if (!resultado || typeof resultado !== "object") {
    throw new Error("Se necesita un resultado canónico de ataque.");
  }
  if (typeof resultado.idResolucion !== "string" || resultado.idResolucion === "") {
    throw new Error("El resultado de ataque necesita un ID de resolución.");
  }
  if (!Array.isArray(resultado.golpes)) {
    throw new Error("El resultado de ataque necesita su lista de golpes.");
  }
}

function crearClaveRecompensa({ evento, idMaestria, indiceFuente }) {
  return [
    evento.idEvento,
    evento.idComponente ?? "evento",
    evento.tipo,
    idMaestria,
    indiceFuente,
  ].join("|");
}

function crearResultadoVacio(evento, motivo) {
  return {
    exito: false,
    motivo,
    evento,
    experienciaGanada: 0,
    resultados: [],
  };
}
