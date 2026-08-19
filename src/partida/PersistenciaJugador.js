import {
  eliminarClaveAlmacenada,
  existeClaveAlmacenada,
  guardarJsonAlmacenado,
  leerJsonAlmacenado,
  validarAlmacenamientoClaveValor,
} from "../utilidades/AlmacenamientoJson.js";
import { Player } from "../entidad/destructible/combatiente/Player.js";
import {
  ATRIBUTOS_COMBATIENTE_CANONICOS,
  validarClavesAtributosCombatiente,
} from "../entidad/destructible/combatiente/ContratosAtributosCombatiente.js";
import { crearObjeto } from "../objetos/FabricaObjetos.js";
import { ContenedorObjetos } from "../objetos/ContenedorObjetos.js";
import { obtenerRecursoVisualPredeterminado } from "../juego/configuracion/RecursosVisualesCombatientes.js";

export const CLAVE_GUARDADO_JUGADOR = "dark-moon:estado-jugador:v5";
export const VERSION_GUARDADO_JUGADOR = 5;

// Serializa el estado durable del personaje, no la simulación del mapa.
//
// Incluye progresión, recursos, oro, inventario y equipamiento. Quedan fuera
// enemigos, posiciones del mapa, agenda temporal, estado de combate, botín en
// suelo y efectos temporales activos.
export function crearSnapshotJugador(jugador) {
  validarJugador(jugador);

  const ranurasEquipamiento = {};
  for (const [nombreRanura, objeto] of Object.entries(
    jugador.equipamiento.obtenerRanuras(),
  )) {
    ranurasEquipamiento[nombreRanura] = objeto
      ? serializarObjeto(objeto)
      : null;
  }

  return {
    version: VERSION_GUARDADO_JUGADOR,
    guardadoEn: new Date().toISOString(),
    jugador: {
      nombre: jugador.nombre,
      idProfesion: jugador.idProfesion,
      clasePersonaje: jugador.clasePersonaje,
      recursoVisual: jugador.recursoVisual,
      nivel: jugador.nivel,
      experiencia: jugador.experiencia,
      experienciaTotal: jugador.experienciaTotal,
      puntosAtributoDisponibles: jugador.puntosAtributoDisponibles,
      atributos: copiarDatos(jugador.atributos),
      // Se persisten solamente los factores base. Efectos, terreno y otras
      // fuentes modificadoras se reconstruyen desde sus fuentes canónicas.
      factoresTemporales: jugador.obtenerFactoresTemporalesBase(),
      recursos: {
        vidaActual: jugador.vidaActual,
        manaActual: jugador.manaActual,
        acumuladorRegeneracionVida: jugador.acumuladorRegeneracionVida,
        acumuladorRegeneracionMana: jugador.acumuladorRegeneracionMana,
      },
      oro: jugador.oro,
      progresoHabilidades: jugador.exportarProgresoHabilidades(),
      inventario: {
        capacidad: jugador.inventario.capacidad,
        espacios: jugador.inventario
          .obtenerEspacios()
          .map((objeto) => (objeto ? serializarObjeto(objeto) : null)),
      },
      equipamiento: {
        ranuras: ranurasEquipamiento,
      },
    },
  };
}

export function guardarJugadorDurable({
  jugador,
  almacenamiento = globalThis.localStorage,
} = {}) {
  validarAlmacenamientoClaveValor(almacenamiento);
  const snapshot = crearSnapshotJugador(jugador);
  guardarJsonAlmacenado({
    almacenamiento,
    clave: CLAVE_GUARDADO_JUGADOR,
    valor: snapshot,
  });

  return {
    exito: true,
    clave: CLAVE_GUARDADO_JUGADOR,
    snapshot,
  };
}

export function existeGuardadoJugador({
  almacenamiento = globalThis.localStorage,
} = {}) {
  if (!almacenamiento) {
    return false;
  }

  validarAlmacenamientoClaveValor(almacenamiento);
  return existeClaveAlmacenada({
    almacenamiento,
    clave: CLAVE_GUARDADO_JUGADOR,
  });
}

export function leerSnapshotJugador({
  almacenamiento = globalThis.localStorage,
} = {}) {
  validarAlmacenamientoClaveValor(almacenamiento);
  const snapshot = leerJsonAlmacenado({
    almacenamiento,
    clave: CLAVE_GUARDADO_JUGADOR,
    descripcion: "El guardado del jugador",
  });

  if (snapshot === null) {
    return null;
  }

  validarRaizSnapshot(snapshot);
  return copiarDatos(snapshot);
}

export function eliminarGuardadoJugador({
  almacenamiento = globalThis.localStorage,
} = {}) {
  if (!almacenamiento) {
    return { exito: false, eliminado: false };
  }

  validarAlmacenamientoClaveValor(almacenamiento);
  const existia = eliminarClaveAlmacenada({
    almacenamiento,
    clave: CLAVE_GUARDADO_JUGADOR,
  });

  return {
    exito: true,
    eliminado: existia,
    clave: CLAVE_GUARDADO_JUGADOR,
  };
}

// Reconstruye un Player real y todas sus instancias de objetos.
//
// La función crea el estado completo en memoria antes de devolverlo. Si un
// afijo, grado, cantidad o referencia es inválido, lanza un error y no altera
// el jugador activo de la partida.
export function crearJugadorDesdeSnapshot({
  snapshot,
  configuracionPersonaje,
  configuracionObjetos,
} = {}) {
  validarRaizSnapshot(snapshot);
  validarObjetoPlano(configuracionPersonaje, "la configuración del personaje");
  validarObjetoPlano(configuracionObjetos, "la configuración de objetos");

  const estado = snapshot.jugador;
  const profesion = configuracionPersonaje.profesiones?.[estado.idProfesion];

  if (!profesion) {
    throw new Error(
      `El guardado referencia la profesión inexistente "${estado.idProfesion}".`,
    );
  }

  validarEstadoJugadorGuardado(estado);

  const player = new Player({
    nombre: estado.nombre,
    idProfesion: estado.idProfesion,
    clasePersonaje: estado.clasePersonaje ?? profesion.nombre,
    recursoVisual:
      estado.recursoVisual ??
      obtenerRecursoVisualPredeterminado(profesion.recursoVisual, {
        descripcion: `el recurso visual de la profesión "${estado.idProfesion}"`,
      }),
    nivel: estado.nivel,
    atributos: copiarDatos(estado.atributos),
    estadisticasBase: profesion.estadisticasBase,
    ataqueNatural: profesion.ataqueNatural ?? null,
    factoresTemporales: copiarDatos(estado.factoresTemporales),
    experiencia: 0,
    puntosAtributoDisponibles: estado.puntosAtributoDisponibles,
    oro: estado.oro,
    capacidadInventario: estado.inventario.capacidad,
    objetosInventarioIniciales: [],
    equipamientoInicial: [],
    estadoProgresoHabilidades: estado.progresoHabilidades,
    reglasSuerte: configuracionPersonaje.reglasSuerte,
  });

  restaurarInventario({
    player,
    inventarioGuardado: estado.inventario,
    configuracionObjetos,
  });
  restaurarEquipamiento({
    player,
    equipamientoGuardado: estado.equipamiento,
    configuracionObjetos,
  });

  player.restaurarProgresionGeneral({
    nivel: estado.nivel,
    experiencia: estado.experiencia,
    experienciaTotal: estado.experienciaTotal,
    puntosAtributoDisponibles: estado.puntosAtributoDisponibles,
  });
  player.restaurarOro(estado.oro);

  // Primero se recalculan los máximos desde nivel, atributos y equipo.
  const estadisticas = player.estadisticasDerivadas;
  validarRecursosGuardados({
    recursos: estado.recursos,
    vidaMaxima: estadisticas.vidaMaxima,
    manaMaximo: estadisticas.manaMaximo,
  });

  player.vidaActual = estado.recursos.vidaActual;
  player.manaActual = estado.recursos.manaActual;
  player.acumuladorRegeneracionVida =
    estado.recursos.acumuladorRegeneracionVida;
  player.acumuladorRegeneracionMana =
    estado.recursos.acumuladorRegeneracionMana;

  return player;
}

export function crearJugadorDesdeGuardado({
  configuracionPersonaje,
  configuracionObjetos,
  almacenamiento = globalThis.localStorage,
} = {}) {
  const snapshot = leerSnapshotJugador({ almacenamiento });

  if (!snapshot) {
    return null;
  }

  return crearJugadorDesdeSnapshot({
    snapshot,
    configuracionPersonaje,
    configuracionObjetos,
  });
}

function restaurarInventario({
  player,
  inventarioGuardado,
  configuracionObjetos,
}) {
  if (
    inventarioGuardado.capacidad !== player.inventario.capacidad ||
    inventarioGuardado.espacios.length !== player.inventario.capacidad
  ) {
    throw new Error("La capacidad guardada del inventario no es coherente.");
  }

  const espacios = inventarioGuardado.espacios.map((definicion) =>
    definicion
      ? crearObjetoDesdeDefinicionPersistida({
          definicion,
          configuracionObjetos,
        })
      : null,
  );

  player.inventario.espacios = espacios;
}

function restaurarEquipamiento({
  player,
  equipamientoGuardado,
  configuracionObjetos,
}) {
  validarObjetoPlano(equipamientoGuardado, "el equipamiento guardado");
  validarObjetoPlano(equipamientoGuardado.ranuras, "las ranuras guardadas");

  const ranurasDisponibles = Object.keys(player.equipamiento.obtenerRanuras());

  for (const nombreRanura of ranurasDisponibles) {
    const definicion = equipamientoGuardado.ranuras[nombreRanura];
    if (!definicion) {
      continue;
    }

    const objeto = crearObjetoDesdeDefinicionPersistida({
      definicion,
      configuracionObjetos,
    });
    player.equipamiento.equiparEnRanura(nombreRanura, objeto);
  }
}

function serializarObjeto(objeto) {
  validarObjetoPlano(objeto, "el objeto que se desea guardar");

  return {
    id: objeto.id,
    cantidad: objeto.cantidad,
    rareza: objeto.rareza,
    nivelObjeto: objeto.nivelObjeto,
    prefijos: copiarDatos(objeto.prefijos ?? []),
    sufijos: copiarDatos(objeto.sufijos ?? []),
    contenedor: objeto.contenedorObjetos
      ? {
          capacidad: objeto.contenedorObjetos.capacidad,
          espacios: objeto.contenedorObjetos
            .obtenerEspacios()
            .map((contenido) =>
              contenido ? serializarObjeto(contenido) : null,
            ),
        }
      : null,
  };
}

function crearObjetoDesdeDefinicionPersistida({
  definicion,
  configuracionObjetos,
}) {
  validarObjetoPlano(definicion, "la definición persistida del objeto");

  const objeto = crearObjeto({
    configuracionObjetos,
    idObjeto: definicion.id,
    cantidad: definicion.cantidad,
    rareza: definicion.rareza,
    nivelObjeto: definicion.nivelObjeto,
    prefijos: definicion.prefijos,
    sufijos: definicion.sufijos,
  });

  if (definicion.contenedor === null) {
    if (objeto.contenedorObjetos !== null) {
      throw new Error(
        `El objeto guardado "${definicion.id}" ya no coincide con su plantilla de contenedor.`,
      );
    }
    return objeto;
  }

  validarObjetoPlano(
    definicion.contenedor,
    `el contenedor de "${definicion.id}"`,
  );

  if (objeto.contenedorObjetos === null) {
    throw new Error(
      `El objeto guardado "${definicion.id}" ya no coincide con su plantilla de contenedor.`,
    );
  }

  const espaciosGuardados = definicion.contenedor.espacios;
  if (
    !Number.isSafeInteger(definicion.contenedor.capacidad) ||
    definicion.contenedor.capacidad <= 0 ||
    objeto.contenedorObjetos.capacidad !== definicion.contenedor.capacidad ||
    !Array.isArray(espaciosGuardados) ||
    espaciosGuardados.length !== definicion.contenedor.capacidad
  ) {
    throw new Error(
      `El contenido guardado de "${definicion.id}" no es compatible.`,
    );
  }

  const contenedor = new ContenedorObjetos({
    capacidad: definicion.contenedor.capacidad,
    objetosIniciales: [],
  });
  contenedor.espacios = espaciosGuardados.map((contenido) =>
    contenido
      ? crearObjetoDesdeDefinicionPersistida({
          definicion: contenido,
          configuracionObjetos,
        })
      : null,
  );
  objeto.contenedorObjetos = contenedor;

  return objeto;
}

function validarRaizSnapshot(snapshot) {
  validarObjetoPlano(snapshot, "el guardado del jugador");

  if (snapshot.version !== VERSION_GUARDADO_JUGADOR) {
    throw new Error(
      `La versión ${snapshot.version} del guardado no es compatible.`,
    );
  }

  validarObjetoPlano(snapshot.jugador, "el estado guardado del jugador");
}

function validarEstadoJugadorGuardado(estado) {
  validarTexto(estado.nombre, "El nombre guardado");
  validarTexto(estado.idProfesion, "La profesión guardada");
  validarEnteroPositivo(estado.nivel, "El nivel guardado");
  validarEnteroNoNegativo(estado.experiencia, "La experiencia guardada");
  validarEnteroNoNegativo(
    estado.experienciaTotal,
    "La experiencia total guardada",
  );
  validarEnteroNoNegativo(
    estado.puntosAtributoDisponibles,
    "Los puntos de atributo guardados",
  );
  validarEnteroNoNegativo(estado.oro, "El oro guardado");
  validarObjetoPlano(estado.atributos, "los atributos guardados");
  validarAtributosGuardados(estado.atributos);
  validarObjetoPlano(
    estado.factoresTemporales,
    "los factores temporales guardados",
  );
  validarObjetoPlano(estado.recursos, "los recursos guardados");
  validarObjetoPlano(estado.progresoHabilidades, "el progreso de habilidades guardado");
  validarObjetoPlano(estado.inventario, "el inventario guardado");
  validarObjetoPlano(estado.equipamiento, "el equipamiento guardado");

  if (
    !Number.isSafeInteger(estado.inventario.capacidad) ||
    estado.inventario.capacidad <= 0 ||
    !Array.isArray(estado.inventario.espacios)
  ) {
    throw new Error("El inventario guardado no es válido.");
  }
}

function validarAtributosGuardados(atributos) {
  validarClavesAtributosCombatiente(atributos, {
    descripcion: "Los atributos guardados",
  });
  for (const atributo of ATRIBUTOS_COMBATIENTE_CANONICOS) {
    if (!Number.isInteger(atributos[atributo]) || atributos[atributo] < 0) {
      throw new Error(`El atributo guardado "${atributo}" no es válido.`);
    }
  }
}

function validarRecursosGuardados({ recursos, vidaMaxima, manaMaximo }) {
  const campos = [
    "vidaActual",
    "manaActual",
    "acumuladorRegeneracionVida",
    "acumuladorRegeneracionMana",
  ];

  for (const campo of campos) {
    if (!Number.isFinite(recursos[campo]) || recursos[campo] < 0) {
      throw new Error(`El recurso guardado "${campo}" no es válido.`);
    }
  }

  if (recursos.vidaActual <= 0 || recursos.vidaActual > vidaMaxima) {
    throw new Error("La Vida guardada debe corresponder a un personaje vivo.");
  }

  if (recursos.manaActual > manaMaximo) {
    throw new Error("El Maná guardado supera su máximo recalculado.");
  }
}

function validarJugador(jugador) {
  if (
    jugador === null ||
    typeof jugador !== "object" ||
    typeof jugador.exportarProgresoHabilidades !== "function" ||
    !jugador.inventario ||
    !jugador.equipamiento
  ) {
    throw new Error("Se necesita un jugador válido para guardar.");
  }
}


function validarObjetoPlano(valor, descripcion) {
  if (valor === null || typeof valor !== "object" || Array.isArray(valor)) {
    throw new Error(`Se necesita ${descripcion} válido.`);
  }
}

function validarTexto(valor, descripcion) {
  if (typeof valor !== "string" || valor.trim() === "") {
    throw new Error(`${descripcion} debe ser un texto válido.`);
  }
}

function validarEnteroPositivo(valor, descripcion) {
  if (!Number.isSafeInteger(valor) || valor <= 0) {
    throw new Error(`${descripcion} debe ser un entero mayor que 0.`);
  }
}

function validarEnteroNoNegativo(valor, descripcion) {
  if (!Number.isSafeInteger(valor) || valor < 0) {
    throw new Error(`${descripcion} debe ser un entero igual o mayor que 0.`);
  }
}

function copiarDatos(valor) {
  if (Array.isArray(valor)) {
    return valor.map(copiarDatos);
  }
  if (valor !== null && typeof valor === "object") {
    const copia = {};
    for (const [clave, contenido] of Object.entries(valor)) {
      copia[clave] = copiarDatos(contenido);
    }
    return copia;
  }
  return valor;
}
