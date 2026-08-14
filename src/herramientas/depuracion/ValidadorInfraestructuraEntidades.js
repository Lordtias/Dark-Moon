import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import { BotinSuelo } from "../../entidad/interactuable/BotinSuelo.js";
import {
  Cofre,
  RECURSO_VISUAL_COFRE_ABIERTO_PREDETERMINADO,
  RECURSO_VISUAL_COFRE_CERRADO_PREDETERMINADO,
} from "../../entidad/interactuable/Cofre.js";
import {
  PortalMapa,
  RECURSO_VISUAL_PORTAL_ACTIVO_PREDETERMINADO,
  RECURSO_VISUAL_PORTAL_INACTIVO_PREDETERMINADO,
} from "../../entidad/interactuable/PortalMapa.js";
import {
  ORIENTACIONES_PUERTA,
  Puerta,
  RECURSOS_VISUALES_PUERTA_PREDETERMINADOS,
} from "../../entidad/interactuable/Puerta.js";
import { ContenedorObjetos } from "../../objetos/ContenedorObjetos.js";
import { crearResultadoAccion } from "../../juego/acciones/ResultadoAccion.js";
import { crearConfiguracionCiudad } from "../../juego/configuracion/ConfiguracionCiudad.js";
import { validarConfiguracionEntidadesMazmorra } from "../../juego/configuracion/ValidadorConfiguracionEntidadesMazmorra.js";
import {
  configurarContextoGeneracionBotin,
  limpiarContextoGeneracionBotin,
} from "../../juego/botin/ContextoGeneracionBotin.js";
import { generarBotinEnSuelo } from "../../juego/botin/SistemaBotin.js";
import { ResolutorDestruccionesJugador } from "../../juego/combate/ResolutorDestruccionesJugador.js";
import { SistemaEspacial } from "../../juego/espacio/SistemaEspacial.js";
import { crearGeneradorAleatorio } from "../../juego/generacion/GeneradorAleatorio.js";
import { SistemaVisibilidadJugador } from "../../juego/visibilidad/SistemaVisibilidadJugador.js";
import {
  crearEntidadMazmorra,
  DESTINOS_ENTIDAD_MAZMORRA,
  incorporarEntidadMazmorra,
} from "../../juego/fabricas/FabricaEntidadesMazmorra.js";
import { SistemaInteraccionJugador } from "../../juego/interacciones/SistemaInteraccionJugador.js";
import { TIPOS_INTERACCION } from "../../juego/interacciones/TiposInteraccion.js";
import {
  COSTOS_TEMPORALES_BASE,
  TIPOS_ACCION_TEMPORAL,
} from "../../juego/tiempo/SistemaTiempo.js";
import {
  EjecutorAccionesJugador,
  TIPOS_COMANDO_JUGADOR,
} from "../../aplicacion/EjecutorAccionesJugador.js";
import { crearEscenaJuego } from "../../interfaz/graficos/AdaptadorEscenaJuego.js";

const mapa = crearMapaPrueba();
const jugador = {
  nombre: "Tester",
  x: 2,
  y: 3,
  simbolo: "@",
  estaVivo: true,
  percepcion: 10,
};

export function validarInfraestructuraEntidades() {
  validarAssetsVisualesEntidadesMazmorra();
  validarPuertaYEspacio();
  validarPuertaYFov();
  validarPuertaNoCierraSobreOcupante();
  validarInteraccionTemporalPuerta();
  validarContenedoresPersistentes();
  validarPortalInactivo();
  validarPortalCiudadVigente();
  validarFabricaGenerica();
  validarRecipienteContenidoUnico();
  validarObstaculoLiberaPasoAlDestruirse();
  validarDecoracionDropCanonico();
  validarCofreConBotinCanonico();
  validarEjecucionInmediataActivacion();
  validarContratoVisualPortalInactivo();

  return { valido: true };
}

function validarAssetsVisualesEntidadesMazmorra() {
  const configuracionEntidadesMazmorra = cargarConfiguracionEntidadesMazmorra();
  const rutas = [
    RECURSO_VISUAL_COFRE_CERRADO_PREDETERMINADO,
    RECURSO_VISUAL_COFRE_ABIERTO_PREDETERMINADO,
    RECURSO_VISUAL_PORTAL_ACTIVO_PREDETERMINADO,
    RECURSO_VISUAL_PORTAL_INACTIVO_PREDETERMINADO,
    RECURSOS_VISUALES_PUERTA_PREDETERMINADOS.horizontal.cerrada,
    RECURSOS_VISUALES_PUERTA_PREDETERMINADOS.horizontal.abierta,
    RECURSOS_VISUALES_PUERTA_PREDETERMINADOS.vertical.cerrada,
    RECURSOS_VISUALES_PUERTA_PREDETERMINADOS.vertical.abierta,
    ...Object.values(configuracionEntidadesMazmorra.porId).map(
      (definicion) => definicion.recursoVisual,
    ),
  ];

  for (const ruta of rutas) {
    const url = new URL(`../../../${ruta}`, import.meta.url);
    assert.equal(existsSync(url), true, `Falta el asset visual ${ruta}`);
  }
}

function validarPuertaYEspacio() {
  const puerta = new Puerta({ x: 3, y: 3 });
  const sistemaEspacial = new SistemaEspacial({
    mapa,
    obtenerEntidades: () => [jugador, puerta],
  });

  assert.equal(puerta.abierta, false);
  assert.equal(puerta.orientacion, ORIENTACIONES_PUERTA.VERTICAL);
  assert.equal(sistemaEspacial.bloqueaMovimiento(3, 3), true);
  assert.equal(sistemaEspacial.bloqueaVision(3, 3), true);
  assert.equal(
    puerta.recursoVisual,
    RECURSOS_VISUALES_PUERTA_PREDETERMINADOS.vertical.cerrada,
  );

  puerta.activar();
  assert.equal(puerta.abierta, true);
  assert.equal(sistemaEspacial.bloqueaMovimiento(3, 3), false);
  assert.equal(sistemaEspacial.bloqueaVision(3, 3), false);
  assert.equal(
    puerta.recursoVisual,
    RECURSOS_VISUALES_PUERTA_PREDETERMINADOS.vertical.abierta,
  );
  assert.equal(puerta.simbolo, "/");

  puerta.activar();
  assert.equal(puerta.abierta, false);
  assert.equal(sistemaEspacial.bloqueaMovimiento(3, 3), true);
  assert.equal(sistemaEspacial.bloqueaVision(3, 3), true);

  const puertaHorizontal = new Puerta({
    x: 4,
    y: 3,
    orientacion: ORIENTACIONES_PUERTA.HORIZONTAL,
  });
  assert.equal(
    puertaHorizontal.recursoVisual,
    RECURSOS_VISUALES_PUERTA_PREDETERMINADOS.horizontal.cerrada,
  );
  puertaHorizontal.abrir();
  assert.equal(
    puertaHorizontal.recursoVisual,
    RECURSOS_VISUALES_PUERTA_PREDETERMINADOS.horizontal.abierta,
  );
}


function validarPuertaYFov() {
  const puerta = new Puerta({ x: 3, y: 3 });
  const sistemaEspacial = new SistemaEspacial({
    mapa,
    obtenerEntidades: () => [jugador, puerta],
  });
  const visibilidad = new SistemaVisibilidadJugador({
    mapa,
    jugador,
    sistemaEspacial,
    configuracion: { campoVisible: true, descubrimiento: true },
  });

  assert.equal(visibilidad.esCasillaVisible(4, 3), false);
  puerta.activar();
  assert.equal(visibilidad.esCasillaVisible(4, 3), true);
}

function validarPuertaNoCierraSobreOcupante() {
  const puerta = new Puerta({ x: 3, y: 3, abierta: true });
  const ocupante = { nombre: "Ocupante", x: 3, y: 3 };
  const sistemaEspacial = new SistemaEspacial({
    mapa,
    obtenerEntidades: () => [jugador, puerta, ocupante],
  });

  const resultado = puerta.activar({
    contexto: { juego: { sistemaEspacial } },
  });

  assert.equal(resultado.exito, false);
  assert.equal(puerta.abierta, true);
  assert.equal(sistemaEspacial.bloqueaMovimiento(3, 3), false);
}

function validarInteraccionTemporalPuerta() {
  const puerta = new Puerta({ x: 3, y: 3 });
  const llamadasFinalizacion = [];
  const sistema = crearSistemaInteraccion({
    interactuables: [puerta],
    finalizarResultadoAccionJugador: (parametros) => {
      llamadasFinalizacion.push(parametros);
      return crearResultadoAccion({
        ...parametros.resultado,
        turnoConsumido: true,
      });
    },
  });

  const interaccion = sistema.obtenerInteraccionPrioritaria();
  assert.equal(interaccion.tipo, TIPOS_INTERACCION.ACTIVAR);

  const resultado = sistema.ejecutarActivacion(interaccion);
  assert.equal(resultado.exito, true);
  assert.equal(resultado.turnoConsumido, true);
  assert.equal(puerta.abierta, true);
  assert.equal(llamadasFinalizacion.length, 1);
  assert.equal(
    llamadasFinalizacion[0].tipoAccion,
    TIPOS_ACCION_TEMPORAL.ACCION,
  );
  assert.equal(
    llamadasFinalizacion[0].costoBase,
    COSTOS_TEMPORALES_BASE.accion,
  );
}

function validarContenedoresPersistentes() {
  const objeto = { id: "objeto_prueba", nombre: "Objeto de prueba" };
  const cofre = new Cofre({
    x: 3,
    y: 3,
    contenedorObjetos: new ContenedorObjetos({
      capacidad: 2,
      objetosIniciales: [objeto],
    }),
  });
  const interactuablesCofre = [cofre];
  const sistemaCofre = crearSistemaInteraccion({
    interactuables: interactuablesCofre,
  });

  assert.equal(
    cofre.recursoVisual,
    RECURSO_VISUAL_COFRE_CERRADO_PREDETERMINADO,
  );
  cofre.contenedorObjetos.retirarObjeto(0);
  assert.equal(cofre.estaVacio, true);
  assert.equal(
    cofre.recursoVisual,
    RECURSO_VISUAL_COFRE_ABIERTO_PREDETERMINADO,
  );
  assert.equal(sistemaCofre.retirarInteractuableSiVacio(cofre), false);
  assert.equal(interactuablesCofre.includes(cofre), true);
  assert.deepEqual(cofre.obtenerInteracciones(), []);

  const botin = new BotinSuelo({
    x: 3,
    y: 3,
    contenedorObjetos: new ContenedorObjetos({
      capacidad: 2,
      objetosIniciales: [{ id: "drop", nombre: "Drop" }],
    }),
  });
  const interactuablesBotin = [botin];
  const sistemaBotin = crearSistemaInteraccion({
    interactuables: interactuablesBotin,
  });

  botin.contenedorObjetos.retirarObjeto(0);
  assert.equal(sistemaBotin.retirarInteractuableSiVacio(botin), true);
  assert.equal(interactuablesBotin.length, 0);
}

function validarPortalInactivo() {
  const { entidad, destino } = crearEntidadMazmorra({
    id: "portal_entrada",
    x: 2,
    y: 3,
  });

  assert.equal(entidad instanceof PortalMapa, true);
  assert.equal(destino, DESTINOS_ENTIDAD_MAZMORRA.INTERACTUABLES);
  assert.equal(entidad.activo, false);
  assert.equal(entidad.recursoVisual, RECURSO_VISUAL_PORTAL_INACTIVO_PREDETERMINADO);
  assert.equal(entidad.atenuarInactivo, false);
  assert.deepEqual(entidad.obtenerInteracciones(), []);
  assert.throws(() => entidad.activar(), /solicitud de transición/i);

  const portalActivo = new PortalMapa({
    nombre: "Portal activo de prueba",
    x: 3,
    y: 3,
    tipoInteraccion: TIPOS_INTERACCION.SELECCIONAR_MAZMORRA,
  });
  assert.equal(portalActivo.activo, true);
  assert.equal(
    portalActivo.recursoVisual,
    RECURSO_VISUAL_PORTAL_ACTIVO_PREDETERMINADO,
  );
  assert.equal(portalActivo.atenuarInactivo, false);
}


function validarPortalCiudadVigente() {
  const configuracion = crearConfiguracionCiudad({
    player: { nombre: "Tester ciudad", x: 0, y: 0 },
    configuracionCiudad: leerJsonConfiguracion("mapas/CiudadInicial.json"),
  });

  const portal = configuracion.interactuables.find(
    (entidad) => entidad instanceof PortalMapa,
  );
  assert.equal(Boolean(portal), true);
  assert.equal(portal.activo, true);
  assert.equal(portal.obtenerInteracciones().length, 1);
  assert.equal(
    portal.obtenerInteracciones()[0].tipo,
    TIPOS_INTERACCION.SELECCIONAR_MAZMORRA,
  );
}

function validarFabricaGenerica() {
  const objetivos = [];
  const interactuables = [];
  const configuracionEntidadesMazmorra = cargarConfiguracionEntidadesMazmorra();
  const objeto = { id: "objeto_prueba", nombre: "Objeto de prueba", cantidad: 1 };

  const barril = incorporarEntidadMazmorra({
    id: "barril_madera",
    x: 1,
    y: 1,
    objetosIniciales: [objeto],
    configuracionEntidadesMazmorra,
    objetivos,
    interactuables,
  });
  assert.equal(barril.destino, DESTINOS_ENTIDAD_MAZMORRA.AMBOS);
  assert.equal(objetivos.includes(barril.entidad), true);
  assert.equal(interactuables.includes(barril.entidad), true);
  assert.equal(barril.entidad.id, "barril_madera");
  assert.equal(barril.entidad.cantidadObjetos, 1);

  const barricada = incorporarEntidadMazmorra({
    id: "barricada_improvisada",
    x: 1,
    y: 2,
    configuracionEntidadesMazmorra,
    objetivos,
    interactuables,
  });
  assert.equal(barricada.destino, DESTINOS_ENTIDAD_MAZMORRA.OBJETIVOS);
  assert.equal(objetivos.includes(barricada.entidad), true);
  assert.equal(interactuables.includes(barricada.entidad), false);

  const puerta = incorporarEntidadMazmorra({
    id: "puerta",
    x: 3,
    y: 3,
    objetivos,
    interactuables,
  });
  assert.equal(puerta.entidad instanceof Puerta, true);
  assert.equal(interactuables.includes(puerta.entidad), true);

  const cofre = incorporarEntidadMazmorra({
    id: "cofre",
    x: 4,
    y: 3,
    objetivos,
    interactuables,
    objetosIniciales: [{ id: "recompensa", nombre: "Recompensa" }],
  });
  assert.equal(cofre.entidad instanceof Cofre, true);
  assert.equal(cofre.entidad.cantidadObjetos, 1);
  assert.equal(interactuables.includes(cofre.entidad), true);

  assert.throws(
    () =>
      crearEntidadMazmorra({
        id: "desconocido",
        x: 1,
        y: 1,
        configuracionEntidadesMazmorra,
      }),
    /no existe una entidad/i,
  );
}

function validarRecipienteContenidoUnico() {
  const configuracionEntidadesMazmorra = cargarConfiguracionEntidadesMazmorra();
  const objeto = {
    id: "contenido_unico",
    nombre: "Contenido único",
    cantidad: 1,
    apilable: true,
    rareza: "comun",
    nivelObjeto: 1,
    afijos: [],
  };
  const objetivos = [];
  const interactuables = [];
  const resultado = incorporarEntidadMazmorra({
    id: "caja_humeda",
    x: 3,
    y: 3,
    objetosIniciales: [objeto],
    configuracionEntidadesMazmorra,
    objetivos,
    interactuables,
  });
  const recipiente = resultado.entidad;

  assert.equal(recipiente.obtenerInteracciones().length, 1);
  const sistemaInteraccion = crearSistemaInteraccion({ interactuables });
  assert.equal(
    sistemaInteraccion.obtenerInteraccionPrioritaria()?.tipo,
    TIPOS_INTERACCION.ABRIR_CONTENEDOR,
  );
  recipiente.recibirDanio(999);

  const resolutor = new ResolutorDestruccionesJugador({
    jugador,
    objetivos,
    interactuables,
    configuracionObjetos: {},
    eliminarActorTemporal: () => {},
  });
  const destruccion = resolutor.resolverObjetivo(recipiente);
  assert.equal(destruccion.procesada, true);
  assert.equal(interactuables.includes(recipiente), false);
  assert.equal(recipiente.estaVacio, true);

  const botines = interactuables.filter((entidad) => entidad instanceof BotinSuelo);
  assert.equal(botines.length, 1);
  assert.equal(botines[0].contenedorObjetos.obtenerObjetos()[0], objeto);
  assert.equal(resolutor.resolverObjetivo(recipiente).procesada, false);
  assert.equal(interactuables.filter((entidad) => entidad instanceof BotinSuelo).length, 1);

  const objetoRetirado = {
    id: "contenido_retirado",
    nombre: "Contenido retirado",
    cantidad: 1,
    apilable: true,
    rareza: "comun",
    nivelObjeto: 1,
    afijos: [],
  };
  const objetoRestante = {
    id: "contenido_restante",
    nombre: "Contenido restante",
    cantidad: 1,
    apilable: true,
    rareza: "comun",
    nivelObjeto: 1,
    afijos: [],
  };
  const recipienteParcial = crearEntidadMazmorra({
    id: "caja_humeda",
    x: 5,
    y: 4,
    objetosIniciales: [objetoRetirado, objetoRestante],
    configuracionEntidadesMazmorra,
  }).entidad;
  const retirado = recipienteParcial.contenedorObjetos.retirarObjeto(0);
  assert.equal(retirado, objetoRetirado);
  recipienteParcial.recibirDanio(999);
  const interactuablesParcial = [recipienteParcial];
  const resolutorParcial = new ResolutorDestruccionesJugador({
    jugador,
    objetivos: [recipienteParcial],
    interactuables: interactuablesParcial,
    configuracionObjetos: {},
    eliminarActorTemporal: () => {},
  });
  resolutorParcial.resolverObjetivo(recipienteParcial);
  const botinParcial = interactuablesParcial.find(
    (entidad) => entidad instanceof BotinSuelo,
  );
  assert.ok(botinParcial);
  const objetosLiberados = botinParcial.contenedorObjetos.obtenerObjetos();
  assert.equal(objetosLiberados.length, 1);
  assert.equal(objetosLiberados[0], objetoRestante);
  assert.equal(objetosLiberados.includes(objetoRetirado), false);

  const recipienteVacio = crearEntidadMazmorra({
    id: "caja_humeda",
    x: 4,
    y: 4,
    objetosIniciales: [{
      id: "retirado",
      nombre: "Retirado",
      cantidad: 1,
      apilable: true,
      rareza: "comun",
      nivelObjeto: 1,
      afijos: [],
    }],
    configuracionEntidadesMazmorra,
  }).entidad;
  recipienteVacio.contenedorObjetos.retirarObjeto(0);
  recipienteVacio.recibirDanio(999);
  const interactuablesVacio = [recipienteVacio];
  const resolutorVacio = new ResolutorDestruccionesJugador({
    jugador,
    objetivos: [recipienteVacio],
    interactuables: interactuablesVacio,
    configuracionObjetos: {},
    eliminarActorTemporal: () => {},
  });
  resolutorVacio.resolverObjetivo(recipienteVacio);
  assert.equal(interactuablesVacio.length, 0);
}


function validarObstaculoLiberaPasoAlDestruirse() {
  const configuracionEntidadesMazmorra = cargarConfiguracionEntidadesMazmorra();
  const barricada = crearEntidadMazmorra({
    id: "barricada_improvisada",
    x: 3,
    y: 3,
    configuracionEntidadesMazmorra,
  }).entidad;
  const sistemaEspacial = new SistemaEspacial({
    mapa,
    obtenerEntidades: () => [jugador, barricada],
  });

  assert.equal(sistemaEspacial.bloqueaMovimiento(3, 3), true);
  barricada.recibirDanio(999);
  assert.equal(barricada.estaDestruido, true);
  assert.equal(sistemaEspacial.bloqueaMovimiento(3, 3), false);
}

function validarDecoracionDropCanonico() {
  const configuracionEntidadesMazmorra = cargarConfiguracionEntidadesMazmorra();
  const configuracionObjetos = cargarConfiguracionObjetos();
  const configuracionGeneracionObjetos = cargarConfiguracionGeneracionObjetos();
  const objetivos = [];
  const interactuables = [];
  const tablaBotin = [
    {
      idObjeto: "carne_putrefacta",
      probabilidad: 100,
      cantidadMinima: 1,
      cantidadMaxima: 1,
    },
  ];
  const restos = incorporarEntidadMazmorra({
    id: "restos_abandonados",
    x: 3,
    y: 3,
    tablaBotin,
    configuracionEntidadesMazmorra,
    objetivos,
    interactuables,
  }).entidad;

  configurarContextoGeneracionBotin({
    configuracionGeneracionObjetos,
    semillaMapa: "decoracion-drop-canonico",
    nivelMapa: 3,
  });

  try {
    restos.recibirDanio(999);
    const resolutor = new ResolutorDestruccionesJugador({
      jugador,
      objetivos,
      interactuables,
      configuracionObjetos,
      semillaMapa: "decoracion-drop-canonico",
      eliminarActorTemporal: () => {},
    });
    const resultado = resolutor.resolverObjetivo(restos);
    assert.equal(resultado.procesada, true);
    assert.equal(resultado.resultadosBotin.length, 1);
    assert.equal(resultado.resultadosBotin[0].cantidadUnidades, 1);
    assert.equal(
      interactuables.filter((entidad) => entidad instanceof BotinSuelo).length,
      1,
    );
    assert.equal(resolutor.resolverObjetivo(restos).procesada, false);
    assert.equal(
      interactuables.filter((entidad) => entidad instanceof BotinSuelo).length,
      1,
    );
  } finally {
    limpiarContextoGeneracionBotin();
  }
}

function validarCofreConBotinCanonico() {
  const configuracionObjetos = cargarConfiguracionObjetos();
  const configuracionGeneracionObjetos = cargarConfiguracionGeneracionObjetos();

  configurarContextoGeneracionBotin({
    configuracionGeneracionObjetos,
    semillaMapa: "e2a-cofre-canonico",
    nivelMapa: 3,
  });

  try {
    const resultadoCofre = crearEntidadMazmorra({
      id: "cofre",
      x: 4,
      y: 3,
      nombre: "Cofre de prueba",
      tablaBotin: [
        {
          idObjeto: "pocion_curacion",
          probabilidad: 100,
          cantidadMinima: 1,
          cantidadMaxima: 1,
        },
      ],
      configuracionObjetos,
      aleatorio: crearGeneradorAleatorio("e2a-cofre-canonico:tabla"),
    });

    assert.equal(resultadoCofre.entidad instanceof Cofre, true);
    assert.equal(resultadoCofre.entidad.cantidadObjetos, 1);
    assert.equal(resultadoCofre.resultadoBotin?.cantidadUnidades, 1);
    assert.equal(resultadoCofre.resultadoBotin?.objetosGenerados.length, 1);

    // La misma resolución canónica debe seguir alimentando BotinSuelo.
    // Esta regresión protege el comportamiento previo al extraer
    // generarContenidoBotin() como punto reutilizable para Cofre.
    const interactuables = [];
    const resultadoSuelo = generarBotinEnSuelo({
      fuente: {
        nombre: "Fuente de prueba",
        x: 2,
        y: 2,
        nivel: 3,
        tablaBotin: [
          {
            idObjeto: "pocion_curacion",
            probabilidad: 100,
            cantidadMinima: 1,
            cantidadMaxima: 1,
          },
        ],
      },
      configuracionObjetos,
      aleatorio: crearGeneradorAleatorio("e2a-botin-suelo:tabla"),
      interactuables,
    });

    assert.equal(resultadoSuelo.botinCreado, true);
    assert.equal(resultadoSuelo.botin instanceof BotinSuelo, true);
    assert.equal(interactuables.includes(resultadoSuelo.botin), true);
    assert.equal(resultadoSuelo.cantidadUnidades, 1);
  } finally {
    limpiarContextoGeneracionBotin();
  }
}

function validarEjecucionInmediataActivacion() {
  let activaciones = 0;
  const interaccion = {
    tipo: TIPOS_INTERACCION.ACTIVAR,
    texto: "Abrir puerta",
    alcance: 1,
    prioridad: 1,
    entidad: { nombre: "Puerta", x: 1, y: 3 },
  };

  const juego = crearJuegoMinimoEjecutor({
    interaccion,
    alActivar: (recibida) => {
      activaciones += 1;
      assert.equal(recibida, interaccion);
      return crearResultadoAccion({
        exito: true,
        turnoConsumido: true,
        redibujar: true,
      });
    },
  });

  const ejecutor = new EjecutorAccionesJugador({ juego });
  const resultado = ejecutor.ejecutar({
    tipo: TIPOS_COMANDO_JUGADOR.INTERACTUAR_O_CONFIRMAR,
  });

  assert.equal(activaciones, 1);
  assert.equal(resultado.turnoConsumido, true);
  assert.equal(resultado.interaccion, undefined);
  assert.equal(resultado.redibujar, true);
  assert.equal(resultado.entidad, interaccion.entidad);
}

function validarContratoVisualPortalInactivo() {
  const portal = crearEntidadMazmorra({
    id: "portal_entrada",
    x: 2,
    y: 3,
  }).entidad;

  const escena = crearEscenaJuego({
    map: mapa,
    player: jugador,
    objetivos: [],
    interactuables: [portal],
    mapaSeleccionado: { apariencia: {} },
    modoCombateActivo: false,
    modoInteraccionActivo: false,
    selectorCombate: null,
    selectorInteraccion: null,
    obtenerEstadoVisibilidadJugador: () => ({
      campoVisible: false,
      descubrimiento: false,
      alcance: 10,
      casillasVisibles: todasLasCasillas(mapa),
      casillasDescubiertas: todasLasCasillas(mapa),
    }),
    obtenerZonasTemporales: () => [],
  });

  const visualPortal = escena.entidades.find(
    (entidad) => entidad.nombre === portal.nombre,
  );
  assert.equal(visualPortal.activo, false);
  assert.equal(visualPortal.atenuarInactivo, false);
  assert.equal(
    visualPortal.recursoVisual,
    RECURSO_VISUAL_PORTAL_INACTIVO_PREDETERMINADO,
  );
}

function crearSistemaInteraccion({
  interactuables,
  finalizarResultadoAccionJugador = ({ resultado }) => resultado,
}) {
  return new SistemaInteraccionJugador({
    jugador,
    interactuables,
    obtenerModoCombateActivo: () => false,
    obtenerContextoInteraccion: () => ({}),
    finalizarResultadoAccionJugador,
  });
}

function crearJuegoMinimoEjecutor({ interaccion, alActivar }) {
  const noopResultado = () => crearResultadoAccion({ exito: false });

  return {
    player: jugador,
    modoInteraccionActivo: false,
    modoCombateActivo: false,
    moverJugador: noopResultado,
    moverSelectorInteraccion: noopResultado,
    seleccionarCasillaInteraccion: noopResultado,
    moverSelectorCombate: noopResultado,
    seleccionarCasillaCombate: noopResultado,
    esperarTurno: noopResultado,
    entrarModoCombate: noopResultado,
    confirmarAtaque: noopResultado,
    cancelarModoInteraccion: noopResultado,
    cancelarModoCombate: noopResultado,
    obtenerBloqueoInteraccion: () => null,
    obtenerOpcionesInteraccion: () => [
      {
        entidad: interaccion.entidad,
        interaccionPrioritaria: interaccion,
      },
    ],
    entrarModoInteraccion: noopResultado,
    confirmarInteraccionSeleccionada: noopResultado,
    activarInteractuable: alActivar,
  };
}



function cargarConfiguracionEntidadesMazmorra() {
  return validarConfiguracionEntidadesMazmorra({
    recipientes: leerJsonConfiguracion("entidades/mazmorra/Recipientes.json"),
    obstaculos: leerJsonConfiguracion("entidades/mazmorra/Obstaculos.json"),
    decoraciones: leerJsonConfiguracion("entidades/mazmorra/Decoraciones.json"),
  });
}

function cargarConfiguracionObjetos() {
  return Object.assign(
    {},
    leerJsonConfiguracion("objetos/Armas.json"),
    leerJsonConfiguracion("objetos/Armaduras.json"),
    leerJsonConfiguracion("objetos/Consumibles.json"),
    leerJsonConfiguracion("objetos/Municiones.json"),
    leerJsonConfiguracion("objetos/Contenedores.json"),
    leerJsonConfiguracion("objetos/Materiales.json"),
  );
}

function cargarConfiguracionGeneracionObjetos() {
  return {
    reglas: leerJsonConfiguracion("objetos/GeneracionObjetos.json"),
    rarezas: leerJsonConfiguracion("objetos/Rarezas.json"),
    prefijos: leerJsonConfiguracion("objetos/afijos/Prefijos.json"),
    sufijos: leerJsonConfiguracion("objetos/afijos/Sufijos.json"),
  };
}

function leerJsonConfiguracion(rutaRelativa) {
  const url = new URL(`../../config/${rutaRelativa}`, import.meta.url);
  return JSON.parse(readFileSync(url, "utf8"));
}

function crearMapaPrueba() {
  return [
    ["#", "#", "#", "#", "#", "#", "#"],
    ["#", ".", ".", ".", ".", ".", "#"],
    ["#", ".", ".", ".", ".", ".", "#"],
    ["#", ".", ".", ".", ".", ".", "#"],
    ["#", ".", ".", ".", ".", ".", "#"],
    ["#", ".", ".", ".", ".", ".", "#"],
    ["#", "#", "#", "#", "#", "#", "#"],
  ];
}

function todasLasCasillas(mapaActual) {
  const casillas = [];
  for (let y = 0; y < mapaActual.length; y++) {
    for (let x = 0; x < mapaActual[y].length; x++) {
      casillas.push({ x, y });
    }
  }
  return casillas;
}
