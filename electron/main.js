const {
  app,
  BrowserWindow,
  Menu,
  net,
  protocol,
  session,
} = require("electron");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const PROTOCOLO = "darkmoon";
const HOST = "app";

Menu.setApplicationMenu(null);

protocol.registerSchemesAsPrivileged([
  {
    scheme: PROTOCOLO,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
    },
  },
]);

function registrarProtocolo() {
  const raizAplicacion = app.getAppPath();

  protocol.handle(PROTOCOLO, async (request) => {
    try {
      const url = new URL(request.url);

      if (url.host !== HOST) {
        return new Response("Host no permitido", { status: 403 });
      }

      let rutaSolicitada = decodeURIComponent(url.pathname);

      if (rutaSolicitada === "/") {
        rutaSolicitada = "/index.html";
      }

      const rutaRelativa = rutaSolicitada.replace(/^\/+/, "");
      const rutaArchivo = path.resolve(raizAplicacion, rutaRelativa);

      const relativaSegura = path.relative(raizAplicacion, rutaArchivo);

      const esSegura =
        relativaSegura &&
        !relativaSegura.startsWith("..") &&
        !path.isAbsolute(relativaSegura);

      if (!esSegura) {
        return new Response("Ruta no permitida", { status: 400 });
      }

      return await net.fetch(pathToFileURL(rutaArchivo).toString());
    } catch (error) {
      console.error("Error sirviendo recurso:", error);
      return new Response("Recurso no encontrado", { status: 404 });
    }
  });
}

function configurarCsp() {
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "connect-src 'self'",
    "font-src 'self' data:",
    "media-src 'self' data: blob:",
    "object-src 'none'",
    "frame-src 'none'",
    "base-uri 'none'",
  ].join("; ");

  session.defaultSession.webRequest.onHeadersReceived(
    {
      urls: [`${PROTOCOLO}://*/*`],
    },
    (details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Content-Security-Policy": [csp],
        },
      });
    },
  );
}

function crearVentanaPrincipal() {
  const ventana = new BrowserWindow({
    width: 1440,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
  });

  ventana.webContents.setWindowOpenHandler(() => {
    return { action: "deny" };
  });

  ventana.webContents.on("will-navigate", (event, destino) => {
    const url = new URL(destino);

    if (url.protocol !== `${PROTOCOLO}:` || url.host !== HOST) {
      event.preventDefault();
    }
  });

  ventana.loadURL(`${PROTOCOLO}://${HOST}/index.html`);
}

app.whenReady().then(() => {
  registrarProtocolo();
  configurarCsp();
  crearVentanaPrincipal();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      crearVentanaPrincipal();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
