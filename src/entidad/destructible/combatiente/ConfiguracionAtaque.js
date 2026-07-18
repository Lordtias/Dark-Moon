// Analiza el equipo actual y determina:
//
// - Qué arma controla el ataque.
// - Qué fuentes aportan daño.
// - Si el ataque requiere munición.
// - Si el combatiente está usando temporalmente
//   su ataque natural como respaldo.
export function obtenerConfiguracionAtaque(combatiente) {
  // Algunos enemigos pueden cambiar temporalmente
  // a su ataque natural cuando su arma principal
  // no tiene los recursos necesarios.
  //
  // El equipamiento no se modifica ni se desequipa.
  if (combatiente.ataqueNaturalForzado === true) {
    return crearConfiguracionAtaqueNatural(combatiente);
  }

  const armaPrincipal = obtenerArmaEnRanura(combatiente, "arma");

  const objetoSecundario = obtenerObjetoEnRanura(combatiente, "secundaria");

  const armaSecundaria = objetoSecundario?.esArma ? objetoSecundario : null;

  const quiver = objetoSecundario?.esQuiver ? objetoSecundario : null;

  if (armaPrincipal) {
    const propiedades = armaPrincipal.propiedades;

    const fuentesDanio = [crearFuenteDesdeArma(armaPrincipal)];

    // Dos armas cuerpo a cuerpo de una mano
    // contribuyen al mismo ataque.
    //
    // El arma principal continúa controlando:
    //
    // - Alcance.
    // - Patrón de ataque.
    // - Precisión.
    // - Probabilidad de crítico.
    if (
      propiedades.tipoAtaque === "cuerpoACuerpo" &&
      propiedades.manos === 1 &&
      armaSecundaria?.propiedades?.tipoAtaque === "cuerpoACuerpo" &&
      armaSecundaria.propiedades.manos === 1
    ) {
      fuentesDanio.push(crearFuenteDesdeArma(armaSecundaria));
    }

    return {
      origen: "armaPrincipal",

      armaControladora: armaPrincipal,

      armaPrincipal,
      armaSecundaria,
      quiver,

      fuentesDanio,

      propiedadesControladoras: propiedades,

      requiereQuiver: armaPrincipal.requiereQuiver,

      tipoMunicion: propiedades.tipoMunicion ?? null,
    };
  }

  // Un arma cuerpo a cuerpo colocada
  // únicamente en secundaria puede utilizarse
  // cuando no existe un arma principal.
  if (armaSecundaria) {
    return {
      origen: "armaSecundaria",

      armaControladora: armaSecundaria,

      armaPrincipal: null,
      armaSecundaria,
      quiver: null,

      fuentesDanio: [crearFuenteDesdeArma(armaSecundaria)],

      propiedadesControladoras: armaSecundaria.propiedades,

      requiereQuiver: armaSecundaria.requiereQuiver,

      tipoMunicion: armaSecundaria.propiedades.tipoMunicion ?? null,
    };
  }

  return crearConfiguracionAtaqueNatural(combatiente);
}

// Crea una configuración completa basada
// únicamente en el ataque natural.
//
// Esta función evita duplicar la estructura
// en varios puntos del sistema.
function crearConfiguracionAtaqueNatural(combatiente) {
  return {
    origen: "ataqueNatural",

    armaControladora: null,
    armaPrincipal: null,
    armaSecundaria: null,
    quiver: null,

    fuentesDanio: [
      {
        nombre: "Ataque natural",
        objeto: null,

        propiedades: combatiente.ataqueNatural,
      },
    ],

    propiedadesControladoras: combatiente.ataqueNatural,

    requiereQuiver: false,
    tipoMunicion: null,
  };
}

// Comprueba que el ataque actual tenga
// todos los recursos necesarios.
export function verificarRequisitosAtaque(combatiente) {
  const configuracion = obtenerConfiguracionAtaque(combatiente);

  if (!configuracion.requiereQuiver) {
    return {
      disponible: true,
      configuracion,
      cantidadMunicion: null,
      mensaje: null,
    };
  }

  if (!configuracion.quiver) {
    return {
      disponible: false,
      configuracion,
      cantidadMunicion: 0,

      mensaje:
        `${configuracion.armaControladora.nombre} ` +
        "necesita un quiver equipado en secundaria.",
    };
  }

  if (
    configuracion.quiver.propiedades.tipoMunicion !== configuracion.tipoMunicion
  ) {
    return {
      disponible: false,
      configuracion,
      cantidadMunicion: 0,

      mensaje:
        `${configuracion.quiver.nombre} no admite ` +
        "la munición requerida por " +
        `${configuracion.armaControladora.nombre}.`,
    };
  }

  const cantidadMunicion = contarMunicionCompatible(configuracion);

  if (cantidadMunicion <= 0) {
    return {
      disponible: false,
      configuracion,
      cantidadMunicion: 0,

      mensaje:
        `${configuracion.quiver.nombre} ` + "no tiene munición compatible.",
    };
  }

  return {
    disponible: true,
    configuracion,
    cantidadMunicion,
    mensaje: null,
  };
}

// Consume una unidad al realizar un disparo.
//
// La munición se gasta aunque el ataque:
//
// - Falle.
// - Sea bloqueado.
// - Apunte a una casilla vacía.
export function consumirMunicionAtaque(combatiente) {
  const requisitos = verificarRequisitosAtaque(combatiente);

  if (!requisitos.disponible || !requisitos.configuracion.requiereQuiver) {
    return {
      consumida: false,

      restante: requisitos.cantidadMunicion,

      requisitos,
    };
  }

  const { configuracion } = requisitos;

  const consumida =
    configuracion.quiver.contenedorObjetos.consumirCantidadObjeto(
      (objeto) =>
        objeto.esMunicion &&
        objeto.propiedades.tipoMunicion === configuracion.tipoMunicion,

      1,
    );

  return {
    consumida,

    restante: contarMunicionCompatible(configuracion),

    requisitos,
  };
}

function obtenerArmaEnRanura(combatiente, nombreRanura) {
  const objeto = obtenerObjetoEnRanura(combatiente, nombreRanura);

  return objeto?.esArma ? objeto : null;
}

function obtenerObjetoEnRanura(combatiente, nombreRanura) {
  if (!combatiente.equipamiento?.tieneRanura(nombreRanura)) {
    return null;
  }

  return combatiente.equipamiento.obtenerObjetoEnRanura(nombreRanura);
}

function crearFuenteDesdeArma(arma) {
  return {
    nombre: arma.nombre,
    objeto: arma,

    propiedades: arma.propiedades,
  };
}

function contarMunicionCompatible(configuracion) {
  if (!configuracion.quiver?.contenedorObjetos || !configuracion.tipoMunicion) {
    return 0;
  }

  return configuracion.quiver.contenedorObjetos
    .obtenerObjetos()
    .filter(
      (objeto) =>
        objeto.esMunicion &&
        objeto.propiedades.tipoMunicion === configuracion.tipoMunicion,
    )
    .reduce(
      (total, objeto) => total + objeto.cantidad,

      0,
    );
}
