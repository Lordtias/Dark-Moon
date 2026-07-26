import {
  obtenerConfiguracionAtaque,
  verificarRequisitosAtaque,
} from "../../entidad/destructible/combatiente/ConfiguracionAtaque.js";
import {
  crearContextoCatalizador,
  esBaston,
  esVarita,
  validarCatalogoCatalizadores,
} from "../magia/SistemaCatalizadores.js";

const ELEMENTOS = Object.freeze(["fuego", "frio", "rayo", "veneno"]);

export function crearDepuradorEtapa6({ juego } = {}) {
  const jugador = juego?.jugador ?? juego?.player;
  if (!jugador) {
    throw new Error("El depurador de ETAPA 6 necesita un jugador activo.");
  }

  return Object.freeze({
    obtenerResumenEtapa6: () => crearResumen({ juego, jugador }),
    obtenerConfiguracionAtaqueEtapa6: () => obtenerConfiguracionAtaque(jugador),
    obtenerRequisitosAtaqueEtapa6: () => verificarRequisitosAtaque(jugador),
    validarEtapa6: () => validarContratosDeterministas({ juego }),
  });
}

export function publicarDepuradorEtapa6(depurador) {
  const base = globalThis.darkMoonDebug;
  const combinado = Object.freeze({
    ...(base && typeof base === "object" ? base : {}),
    ...depurador,
    etapa6: depurador,
  });

  globalThis.darkMoonDebug = combinado;
  globalThis.darkMoonDebugEtapa6 = depurador;
  return combinado;
}

function crearResumen({ juego, jugador }) {
  const configuracion = obtenerConfiguracionAtaque(jugador);
  const contexto = crearContextoCatalizador({
    fuentes: configuracion.fuentesDanio,
  });

  return {
    manaActual: numero(jugador.manaActual),
    manaMaximo: numero(jugador.manaMaximo),
    origenAtaque: configuracion.origen,
    esAtaqueDual: configuracion.esAtaqueDual,
    cantidadGolpes: configuracion.cantidadGolpes,
    costoAtaqueBase: configuracion.costoAtaqueBase,
    costoManaAtaqueBasico: configuracion.costoManaAtaqueBasico,
    potenciaHabilidad: contexto.potenciaHabilidad,
    multiplicadorHabilidad: contexto.multiplicadorHabilidad,
    fuentes: configuracion.fuentesDanio.map((fuente) => ({
      nombre: fuente.nombre,
      mano: fuente.mano,
      multiplicadorGolpe: fuente.multiplicadorGolpe,
      familia: fuente.objeto?.familiaObjeto ?? "natural",
      elemento: fuente.propiedades?.elementoAtaqueBasico ?? null,
      potenciaHabilidad: fuente.propiedades?.potenciaHabilidad ?? 0,
    })),
    estaEnCombate: Boolean(juego?.estaEnCombate),
  };
}

function validarContratosDeterministas({ juego }) {
  const catalogo = juego?.configuracionObjetos;
  validarCatalogoCatalizadores(catalogo);

  const plantillas = Object.entries(catalogo);
  const varitas = plantillas.filter(([, plantilla]) =>
    esVarita(crearObjetoPrueba(plantilla)),
  );
  const bastones = plantillas.filter(([, plantilla]) =>
    esBaston(crearObjetoPrueba(plantilla)),
  );
  const comprobaciones = [];

  comprobar(
    comprobaciones,
    "Hay ocho varitas",
    varitas.length === 8,
    varitas.length,
  );
  comprobar(
    comprobaciones,
    "Hay dos bastones",
    bastones.length === 2,
    bastones.length,
  );

  for (const tier of [1, 2]) {
    const elementos = new Set(
      varitas
        .filter(([, plantilla]) => plantilla.tierBase === tier)
        .map(([, plantilla]) => plantilla.propiedades.elementoAtaqueBasico),
    );
    comprobar(
      comprobaciones,
      `Tier ${tier} contiene cuatro elementos`,
      ELEMENTOS.every((elemento) => elementos.has(elemento)) &&
        elementos.size === 4,
      [...elementos],
    );
  }

  const principal = crearObjetoPrueba(
    catalogo.varita_aprendiz,
    "varita_aprendiz",
  );
  const secundaria = crearObjetoPrueba(
    catalogo.varita_frio_aprendiz,
    "varita_frio_aprendiz",
  );
  const baston = crearObjetoPrueba(catalogo.baston_aprendiz, "baston_aprendiz");

  const unaVarita = crearCombatientePrueba({ arma: principal, mana: 1 });
  const dobleVarita = crearCombatientePrueba({
    arma: principal,
    secundaria,
    mana: 2,
  });
  const dobleSinMana = crearCombatientePrueba({
    arma: principal,
    secundaria,
    mana: 1,
  });
  const conBaston = crearCombatientePrueba({ arma: baston, mana: 0 });

  const configUna = obtenerConfiguracionAtaque(unaVarita);
  const configDoble = obtenerConfiguracionAtaque(dobleVarita);
  const configBaston = obtenerConfiguracionAtaque(conBaston);
  const requisitosSinMana = verificarRequisitosAtaque(dobleSinMana);

  comprobar(
    comprobaciones,
    "Una varita cuesta 1 de Maná",
    configUna.costoManaAtaqueBasico === 1,
    configUna.costoManaAtaqueBasico,
  );
  comprobar(
    comprobaciones,
    "Dos varitas cuestan 2 de Maná",
    configDoble.costoManaAtaqueBasico === 2,
    configDoble.costoManaAtaqueBasico,
  );
  comprobar(
    comprobaciones,
    "Dos varitas usan ataque dual",
    configDoble.esAtaqueDual === true,
    configDoble.esAtaqueDual,
  );
  comprobar(
    comprobaciones,
    "Dos varitas conservan dos fuentes",
    configDoble.fuentesDanio.length === 2,
    configDoble.fuentesDanio.length,
  );
  comprobar(
    comprobaciones,
    "El coste temporal dual usa la regla común",
    configDoble.costoAtaqueBase === 111,
    configDoble.costoAtaqueBase,
  );
  comprobar(
    comprobaciones,
    "Maná parcial rechaza toda la acción",
    requisitosSinMana.disponible === false,
    requisitosSinMana,
  );
  comprobar(
    comprobaciones,
    "El bastón no consume Maná",
    configBaston.costoManaAtaqueBasico === 0,
    configBaston.costoManaAtaqueBasico,
  );
  comprobar(
    comprobaciones,
    "El bastón conserva cuerpo a cuerpo",
    configBaston.propiedadesControladoras.tipoAtaque === "cuerpoACuerpo",
    configBaston.propiedadesControladoras.tipoAtaque,
  );

  const contextoUna = crearContextoCatalizador({
    fuentes: configUna.fuentesDanio,
  });
  const contextoDoble = crearContextoCatalizador({
    fuentes: configDoble.fuentesDanio,
  });
  comprobar(
    comprobaciones,
    "Una varita Tier I aporta 8 %",
    contextoUna.potenciaHabilidad === 8,
    contextoUna.potenciaHabilidad,
  );
  comprobar(
    comprobaciones,
    "Doble varita reutiliza multiplicadores de mano",
    contextoDoble.potenciaHabilidad === 12,
    contextoDoble.potenciaHabilidad,
  );

  const aprobadas = comprobaciones.filter((item) => item.aprobada).length;
  return Object.freeze({
    aprobado: aprobadas === comprobaciones.length,
    aprobadas,
    total: comprobaciones.length,
    comprobaciones,
  });
}

function crearObjetoPrueba(plantilla, id = null) {
  return {
    ...plantilla,
    id: id ?? plantilla.id ?? plantilla.nombre,
    esArma: plantilla.tipo === "arma",
    propiedades: { ...plantilla.propiedades },
  };
}

function crearCombatientePrueba({ arma = null, secundaria = null, mana = 0 }) {
  const ranuras = { arma, secundaria };
  return {
    nombre: "Combatiente de prueba",
    manaActual: mana,
    ataqueNaturalForzado: false,
    ataqueNatural: {
      danioFisicoMinimo: 1,
      danioFisicoMaximo: 2,
      atributoAtaque: "fuerza",
      precision: 0,
      alcance: 1,
      tipoAtaque: "cuerpoACuerpo",
      patronAtaque: "adyacente",
      probabilidadCritico: 5,
      multiplicadorCritico: 1.5,
      costoAtaque: 100,
    },
    equipamiento: {
      tieneRanura: (nombre) =>
        Object.prototype.hasOwnProperty.call(ranuras, nombre),
      obtenerObjetoEnRanura: (nombre) => ranuras[nombre] ?? null,
    },
  };
}

function comprobar(lista, nombre, condicion, obtenido) {
  lista.push(Object.freeze({ nombre, aprobada: Boolean(condicion), obtenido }));
}

function numero(valor) {
  return Number.isFinite(valor) ? valor : 0;
}
