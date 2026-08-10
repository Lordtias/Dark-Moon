export const VERSION_PHASER = "4.2.1";
export const RUTA_PHASER =
  "./assets/vendor/phaser/4.2.1/phaser.min.js";

const ID_SCRIPT_PHASER = "dependencia-phaser";

// Phaser es la dependencia gráfica canónica de Dark Moon y se carga desde la
// copia local versionada antes de construir la presentación de la aplicación.
export async function cargarPhaser({
  documento = globalThis.document,
  ambitoGlobal = globalThis,
} = {}) {
  validarDocumento(documento);

  if (ambitoGlobal.Phaser) {
    return validarVersion(ambitoGlobal.Phaser);
  }

  const scriptExistente = documento.getElementById(ID_SCRIPT_PHASER);

  if (scriptExistente) {
    if (scriptExistente.dataset.fallido === "true") {
      scriptExistente.remove();
    } else {
      await esperarCarga(scriptExistente);
      return validarVersion(ambitoGlobal.Phaser);
    }
  }

  const script = documento.createElement("script");
  script.id = ID_SCRIPT_PHASER;
  script.src = new URL(RUTA_PHASER, documento.baseURI).href;
  script.async = true;
  script.dataset.version = VERSION_PHASER;

  const carga = esperarCarga(script);
  documento.head.appendChild(script);
  await carga;

  return validarVersion(ambitoGlobal.Phaser);
}

function esperarCarga(script) {
  if (script.dataset.cargado === "true") {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const alCargar = () => {
      limpiar();
      script.dataset.cargado = "true";
      script.dataset.fallido = "false";
      resolve();
    };

    const alFallar = () => {
      limpiar();
      script.dataset.fallido = "true";
      reject(
        new Error(
          `No se pudo cargar Phaser ${VERSION_PHASER} desde ${RUTA_PHASER}.`,
        ),
      );
    };

    const limpiar = () => {
      script.removeEventListener("load", alCargar);
      script.removeEventListener("error", alFallar);
    };

    script.addEventListener("load", alCargar, { once: true });
    script.addEventListener("error", alFallar, { once: true });
  });
}

function validarVersion(Phaser) {
  if (!Phaser || typeof Phaser !== "object") {
    throw new Error("La dependencia Phaser no quedó disponible en el navegador.");
  }

  if (Phaser.VERSION !== VERSION_PHASER) {
    throw new Error(
      `Se esperaba Phaser ${VERSION_PHASER}, pero se cargó ${Phaser.VERSION ?? "una versión desconocida"}.`,
    );
  }

  return Phaser;
}

function validarDocumento(documento) {
  if (!documento?.head || typeof documento.createElement !== "function") {
    throw new Error("No existe un documento válido para cargar Phaser.");
  }
}
