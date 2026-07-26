import * as AtributosMagicos from "../magia/CalculadorAtributosMagicos.js";
import { obtenerEfectosFallback } from "./EstadoSesionHabilidades.js";
import {
  obtenerContextoCatalizadorHabilidad,
  obtenerMultiplicadorEfectos,
  resolverDanioHabilidad,
} from "./MotorDanioHabilidad.js";

// Delega primero al motor temporal existente. El registro fallback sólo se usa
// cuando una versión anterior del coordinador no expone todavía la fachada de
// aplicación esperada; sus pulsos avanzan con el tiempo simulado, nunca con el
// reloj real del navegador.
export function aplicarEfectosHabilidad({
  juego,
  lanzador,
  objetivo,
  efectosConfigurados,
  idEjecucion,
} = {}) {
  const resultados = [];
  for (const efecto of efectosConfigurados) {
    const definicion = crearDefinicionEfecto({
      efecto,
      lanzador,
      objetivo,
      idEjecucion,
    });

    const resultadoMotor = intentarAplicarEnMotorExistente({
      juego,
      lanzador,
      objetivo,
      definicion,
      idEjecucion,
    });
    if (resultadoMotor.aplicado) {
      resultados.push({
        id: efecto.id,
        aplicado: true,
        motor: "SistemaEfectosTemporales",
        resultado: resultadoMotor.resultado,
      });
      continue;
    }

    registrarFallback({ juego, lanzador, objetivo, definicion, idEjecucion });
    resultados.push({
      id: efecto.id,
      aplicado: true,
      motor: "fallback_tiempo_simulado",
      advertencia: resultadoMotor.error?.message ?? null,
    });
  }

  return resultados;
}

export function procesarEfectosFallback({ juego, jugador }) {
  const efectos = obtenerEfectosFallback(jugador);
  const tiempoActual = leerTiempoActual(juego);
  const eventos = [];
  for (const efecto of [...efectos]) {
    while (
      efecto.pulsosRestantes > 0 &&
      tiempoActual >= efecto.proximoPulso &&
      !estaDerrotado(efecto.objetivo)
    ) {
      const resultadoDanio = resolverDanioHabilidad({
        lanzador: efecto.lanzador,
        objetivo: efecto.objetivo,
        componentesConfigurados: [
          {
            tipo: efecto.definicion.tipoDanio,
            valorBase: efecto.definicion.potencia,
          },
        ],
        idEjecucion: efecto.idEjecucion,
        // La potencia quedó fijada en la instantánea al aplicar el efecto.
        aplicarEscaladoMagico: false,
        aplicarCatalizador: false,
      });
      efecto.pulsosRestantes -= 1;
      efecto.proximoPulso += efecto.definicion.intervalo;
      eventos.push({
        tipo: "pulso_efecto_habilidad",
        idEjecucion: efecto.idEjecucion,
        idEfecto: efecto.definicion.id,
        danioFinal: resultadoDanio.danioFinal,
        pulsosRestantes: efecto.pulsosRestantes,
      });
    }
  }
  for (let indice = efectos.length - 1; indice >= 0; indice -= 1) {
    if (
      efectos[indice].pulsosRestantes <= 0 ||
      estaDerrotado(efectos[indice].objetivo)
    ) {
      efectos.splice(indice, 1);
    }
  }

  return eventos;
}

function crearDefinicionEfecto({ efecto, lanzador, objetivo, idEjecucion }) {
  const multiplicadorAtributos = obtenerMultiplicadorEfectos(lanzador);
  const contextoCatalizador = obtenerContextoCatalizadorHabilidad(lanzador);
  const multiplicador =
    multiplicadorAtributos * contextoCatalizador.multiplicadorHabilidad;
  const potencia = Math.max(1, Math.round(efecto.potenciaBase * multiplicador));
  const instantanea = crearInstantaneaMagica({
    lanzador,
    objetivo,
    efecto,
    potencia,
  });
  return {
    id: efecto.id,
    idEfecto: efecto.id,
    tipo: efecto.tipo,
    categoria: efecto.tipo,
    tipoDanio: efecto.tipoDanio,
    potencia,
    potenciaBase: efecto.potenciaBase,
    multiplicadorEfectos: multiplicador,
    multiplicadorAtributosMagicos: multiplicadorAtributos,
    multiplicadorCatalizador: contextoCatalizador.multiplicadorHabilidad,
    potenciaHabilidad: contextoCatalizador.potenciaHabilidad,
    duracion: efecto.duracion,
    intervalo: efecto.intervalo,
    reglaAcumulacion: efecto.reglaAcumulacion,
    hostil: true,
    idEjecucion,
    instantanea,
  };
}

function crearInstantaneaMagica({ lanzador, objetivo, efecto, potencia }) {
  const funcion = AtributosMagicos.crearInstantaneaEfectoMagico;
  if (typeof funcion !== "function") {
    return {
      potencia,
      tipoDanio: efecto.tipoDanio,
    };
  }

  const intentos = [
    () => funcion({ lanzador, objetivo, efecto, potencia }),
    () => funcion(lanzador, efecto),
    () => funcion({ combatiente: lanzador, definicion: efecto }),
  ];
  for (const intento of intentos) {
    try {
      const resultado = intento();
      if (resultado && typeof resultado === "object") {
        return resultado;
      }
    } catch {
      // Se conserva compatibilidad con la firma real del motor activo.
    }
  }

  return { potencia, tipoDanio: efecto.tipoDanio };
}

function intentarAplicarEnMotorExistente({
  juego,
  lanzador,
  objetivo,
  definicion,
  idEjecucion,
}) {
  const receptores = [
    juego?.coordinadorTiempo,
    juego?.sistemaEfectosTemporales,
    juego?.coordinadorTiempo?.sistemaEfectosTemporales,
  ].filter(Boolean);

  const nombres = ["aplicarEfectoTemporal", "aplicarEfecto"];
  let ultimoError = null;
  for (const receptor of receptores) {
    for (const nombre of nombres) {
      if (typeof receptor[nombre] !== "function") {
        continue;
      }
      try {
        const resultado = receptor[nombre]({
          objetivo,
          fuente: lanzador,
          lanzador,
          definicion,
          efecto: definicion,
          idEjecucion,
          hostil: true,
        });
        return { aplicado: true, resultado };
      } catch (error) {
        ultimoError = error;
      }
    }
  }
  return { aplicado: false, error: ultimoError };
}

function registrarFallback({
  juego,
  lanzador,
  objetivo,
  definicion,
  idEjecucion,
}) {
  const efectos = obtenerEfectosFallback(lanzador);
  const tiempoActual = leerTiempoActual(juego);
  const pulsos = Math.floor(definicion.duracion / definicion.intervalo);
  if (definicion.reglaAcumulacion !== "independiente") {
    const existente = efectos.find(
      (efecto) =>
        efecto.definicion.id === definicion.id && efecto.objetivo === objetivo,
    );
    if (existente) {
      existente.definicion = definicion;
      existente.idEjecucion = idEjecucion;
      existente.proximoPulso = tiempoActual + definicion.intervalo;
      existente.pulsosRestantes = pulsos;
      return;
    }
  }
  efectos.push({
    juego,
    lanzador,
    objetivo,
    definicion,
    idEjecucion,
    proximoPulso: tiempoActual + definicion.intervalo,
    pulsosRestantes: pulsos,
  });
}

function leerTiempoActual(juego) {
  const candidatos = [
    typeof juego?.tiempoActual === "number" ? juego.tiempoActual : null,
    juego?.sistemaTiempo?.tiempoActual,
    juego?.coordinadorTiempo?.tiempoActual,
  ];
  return candidatos.find(Number.isFinite) ?? 0;
}

function estaDerrotado(objetivo) {
  if (typeof objetivo?.estaDerrotado === "function") {
    return Boolean(objetivo.estaDerrotado());
  }
  const vida = objetivo?.vidaActual ?? objetivo?.vida;
  return Number.isFinite(vida) ? vida <= 0 : false;
}
