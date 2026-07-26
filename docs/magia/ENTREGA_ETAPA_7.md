# DARK MOON — ENTREGA ETAPA 7

## Interfaz completa de habilidades y maestrías

**Commit base verificado:** `ea875089d5d67c55f00ec9c9b6968ce59391a717`  
**Rama objetivo:** `main`  
**Estado Git de la entrega:** no se realizó commit ni push.

## 1. Resumen

ETAPA 7 incorpora la administración visual de la progresión mágica ya implementada en ETAPAS 4 y 5 sin duplicar su estado ni sus motores. `ProgresoMagicoJugador` continúa siendo la única fuente de experiencia, niveles, puntos y grados. La barra solo conserva diez referencias de acceso rápido.

La entrega agrega:

- botón **Habilidades** en la misma línea que las ranuras 1–0, separado a la derecha;
- ventana completa de habilidades y maestrías;
- pestañas Mágicas, Básicas, Armas y Armaduras;
- Fuego, Frío, Rayo y Veneno con identidad cromática propia;
- experiencia, nivel, puntos universales y puntos específicos;
- estados bloqueada, disponible, aprendida, mejorable, grado máximo, sin puntos, asignada y seleccionada;
- aprendizaje y mejora con confirmación y elección explícita del tipo de punto;
- asignación, reemplazo y desasignación de barra sin duplicados;
- persistencia de las diez ranuras sin migradores;
- iconos por ruta con fallback visual;
- conexión explícita al crear cada `Juego`, reemplazando la instalación provisional de ETAPA 5;
- fachada `darkMoonDebug.etapa7` para validaciones desde la consola.

La regla vigente de desbloqueos permanece en **0/3/6** y la maestría mantiene nivel máximo 10. La idea 10/40/70 queda descartada.

## 2. Decisiones aplicadas

### 2.1 Fuente única

La interfaz consulta y opera mediante los métodos públicos del jugador y de `ProgresoMagicoJugador`. No almacena copias de XP, niveles, puntos ni grados.

### 2.2 Barra manual

Aprender una habilidad ya no la coloca automáticamente en una ranura. Una ranura vacía permanece vacía hasta que el jugador elige una asignación.

### 2.3 Habilidades todavía no ejecutables

Las doce habilidades pueden visualizarse, aprenderse y mejorarse. Una habilidad sin bloque `ejecucion` se marca como **Ejecución en construcción** y no puede asignarse todavía a la barra. En el estado actual, Aguijón tóxico sigue siendo el único corte jugable completo.

### 2.4 Secciones futuras

- **Básicas:** sección vacía con recordatorio de futuras acciones como Descansar e Investigar.
- **Armas:** familias obtenidas del catálogo real; cada una muestra En construcción.
- **Armaduras:** liviana, media y pesada; muestran En construcción.

Estas secciones no generan experiencia, puntos, niveles ni datos ficticios.

### 2.5 Persistencia sin migraciones

La configuración de accesos rápidos utiliza la clave:

```text
dark-moon:barra-habilidades:v1
```

Contiene exactamente diez valores `string | null`. No se creó migrador ni compatibilidad para formatos anteriores. La carga valida:

- cantidad exacta de ranuras;
- IDs existentes;
- habilidad aprendida;
- ejecución jugable;
- ausencia de duplicados.

El guardado durable normal del jugador continúa almacenando progresión, recursos, oro, inventario y equipamiento. Los cambios de progreso disparan además ese guardado existente.

## 3. Arquitectura

```text
Aplicacion
  └─ ControladorPartidaEtapa7
       ├─ hereda ControladorPartida
       └─ después de activar cada mapa crea:
            IntegracionHabilidadesEtapa7
              ├─ SistemaHabilidadesJugadorEtapa7
              │    └─ hereda el motor de ETAPA 5
              ├─ BarraHabilidades
              ├─ PanelHabilidadesMaestrias
              ├─ ControladorEntradaHabilidades
              ├─ ObservadorProgresoMagico
              ├─ PersistenciaBarraHabilidades
              └─ Depuradores ETAPA 5, 6 y 7
```

### Responsabilidades

- `SistemaHabilidadesJugador.js`: continúa resolviendo selección, alcance, línea de visión, Maná, tiempo, daño, efectos, `idEjecucion` y experiencia.
- `SistemaHabilidadesJugadorEtapa7.js`: modifica únicamente la política de accesos rápidos y elimina la autoasignación.
- `ProgresoMagicoJugador.js`: continúa validando requisitos, puntos, grado anterior y máximo.
- `PanelHabilidadesMaestrias.js`: representa el estado y solicita operaciones públicas; no modifica campos internos.
- `PersistenciaBarraHabilidades.js`: guarda solo IDs de acceso rápido.
- `ControladorPartidaEtapa7.js`: crea y destruye la integración en el mismo ciclo que cada mapa.

## 4. Archivos completos

### Nuevos

```text
habilidades-maestrias.css
src/aplicacion/ControladorPartidaEtapa7.js
src/interfaz/habilidades/PanelHabilidadesMaestrias.js
src/juego/habilidades/DepuradorEtapa7.js
src/juego/habilidades/IntegracionHabilidadesEtapa7.js
src/juego/habilidades/ObservadorProgresoMagico.js
src/juego/habilidades/PersistenciaBarraHabilidades.js
src/juego/habilidades/SistemaHabilidadesJugadorEtapa7.js
docs/magia/ENTREGA_ETAPA_7.md
docs/magia/VALIDACION_MANUAL_ETAPA_7.md
docs/magia/RESULTADOS_VALIDACION_ETAPA_7.md
docs/magia/Plan_Maestro_Magia_Habilidades_Maestrias_Dark_Moon_v1.8.docx
```

### Modificados mediante reemplazo completo

```text
src/aplicacion/Aplicacion.js
src/interfaz/habilidades/BarraHabilidades.js
src/juego/maestrias/ContextoProgresoMagico.js
```

### Eliminados

```text
src/juego/habilidades/InstaladorEtapa5.js
src/juego/habilidades/IntegracionHabilidadesEtapa5.js
```

Los motores, depuradores y configuraciones funcionales de ETAPAS 5 y 6 se conservan.

## 5. Resumen por archivo

- `Aplicacion.js`: utiliza el controlador explícito de ETAPA 7 y limpia también la barra al crear un personaje nuevo.
- `ControladorPartidaEtapa7.js`: conecta una única integración después de crear cada mapa y destruye la anterior.
- `ContextoProgresoMagico.js`: deja de programar la instalación dinámica de ETAPA 5.
- `SistemaHabilidadesJugadorEtapa7.js`: conserva el motor base, desactiva la autoasignación y añade restaurar, vaciar y desasignar.
- `PersistenciaBarraHabilidades.js`: serializa y valida diez accesos rápidos sin migraciones.
- `ObservadorProgresoMagico.js`: emite notificaciones después de mutaciones reales sin copiar el estado.
- `IntegracionHabilidadesEtapa7.js`: normaliza explícitamente la fachada real `player/map`, y coordina sistema, barra, panel, entrada, guardado y depuración.
- `BarraHabilidades.js`: repintado por eventos, selección 1–0, iconos, fallback, Maná y estado seleccionado.
- `PanelHabilidadesMaestrias.js`: ventana completa, estados visuales, confirmaciones, puntos, barra y secciones futuras.
- `DepuradorEtapa7.js`: comandos deterministas para consultar, preparar escenarios y validar contratos.
- `habilidades-maestrias.css`: composición horizontal, modal, estados, temas Fuego/Frío/Rayo/Veneno y adaptación de pantalla.

## 6. Instalación

1. Ubicar el repositorio en el commit base indicado y comprobar que no haya cambios propios que puedan sobrescribirse.
2. Copiar el contenido completo de la carpeta de entrega sobre la raíz del repositorio, conservando rutas y aceptando reemplazar los tres archivos modificados.
3. Eliminar los dos archivos indicados en `ARCHIVOS_A_ELIMINAR_ETAPA_7.txt`.
4. Servir el juego por el mismo método HTTP usado habitualmente y abrir una partida nueva.

No se requiere:

- Node.js;
- npm;
- instalación de paquetes;
- compilación;
- migración de guardados;
- librerías externas.

### PowerShell opcional

Ejecutar desde la raíz del repositorio, ajustando la ruta de la entrega:

```powershell
Copy-Item "C:\ruta\Dark-Moon_ETAPA_7\*" "." -Recurse -Force
Remove-Item "src\juego\habilidades\InstaladorEtapa5.js" -Force
Remove-Item "src\juego\habilidades\IntegracionHabilidadesEtapa5.js" -Force
```

## 7. Pruebas

Las instrucciones completas están en `VALIDACION_MANUAL_ETAPA_7.md`.

Validaciones principales:

- panel y posición del botón;
- cuatro maestrías y requisitos 0/3/6;
- puntos universales y específicos;
- aprendizaje y mejora;
- bloqueos y grado máximo;
- confirmación antes de gastar;
- asignar, mover, reemplazar y quitar;
- barra vacía que permanece vacía;
- persistencia y rechazo de datos inválidos;
- lanzamiento de Aguijón tóxico;
- deduplicación de experiencia por `idEjecucion`;
- comparación sin arma, con bastón, una varita y dos varitas;
- ausencia de duplicación de Maná, tiempo, lanzamiento y XP.

## 8. Resultados ejecutados

En el entorno de entrega se realizaron validaciones sin Node.js ni dependencias nuevas:

- **10/10** archivos JavaScript parseados por Chromium sin error de sintaxis;
- **11/11** comprobaciones de interfaz y persistencia aprobadas;
- **6/6** comprobaciones del sistema de barra y observación de progreso aprobadas;
- **6/6** comprobaciones de integración explícita con `Juego` aprobadas;
- **0** errores de página en el arnés visual;
- revisión visual del modal en Chromium.

No fue posible ejecutar el juego completo porque el entorno no pudo resolver `github.com` para clonar la copia de trabajo. Por esa razón, las pruebas integradas dentro de Dark Moon quedan expresamente listadas para ejecución manual en el repositorio del usuario y no se presentan falsamente como realizadas.

## 9. Criterios comprobados estáticamente o en arnés

- botón único junto a diez ranuras;
- cuatro categorías;
- cuatro maestrías mágicas;
- tres habilidades por escuela;
- sección Básicas vacía con recordatorios;
- familias de armas visibles y En construcción;
- persistencia de diez ranuras;
- duplicados rechazados;
- constructor sin autoasignación;
- mover una habilidad no la duplica;
- barra vacía permanece vacía;
- restauración válida y rechazo de restauración duplicada;
- observador reactivo sin segunda copia del progreso;
- integración explícita compatible con las propiedades reales `player` y `map`;
- destrucción limpia al reemplazar el mapa;
- módulos sin errores de sintaxis.

## 10. Riesgos pendientes de prueba integrada

- convivencia exacta de eventos de teclado con todos los modales existentes;
- dimensiones finales en resoluciones muy pequeñas;
- guardado al cambiar rápidamente de mapa;
- comportamiento del selector de casilla con el DOM real del mapa;
- validación completa de lanzamiento con las cuatro combinaciones de equipamiento;
- regeneración y efectos temporales durante sesiones prolongadas.

## 11. Restricciones confirmadas

- no se crearon archivos `.patch`;
- no se crearon archivos `.mjs`;
- no se utilizó Node.js ni `node:test`;
- no se instaló ninguna dependencia;
- no se creó `package.json`;
- se entregan archivos completos;
- no se realizó commit;
- no se realizó push;
- no se avanzó a ETAPA 8.

## 12. Conventional Commit sugerido

```text
feat(habilidades): completar interfaz de maestrías y barra

- agregar panel de maestrías mágicas con experiencia, puntos y grados
- incorporar estados visuales, confirmaciones y elección de puntos
- permitir asignar, reemplazar y quitar habilidades sin duplicados
- persistir las diez ranuras sin autoasignación ni migradores
- añadir secciones futuras de Básicas, armas y armaduras
- integrar la etapa explícitamente al ciclo de mapas
- conservar los motores de habilidades, combate y catalizadores
- agregar comandos manuales de validación para ETAPA 7
```

## 13. Etapa siguiente

La siguiente etapa del plan es **ETAPA 8 — Corte vertical de habilidades básicas mágicas**: implementar Ascua, Esquirla de hielo, Chispa y completar la convivencia de Aguijón tóxico mediante el mismo contrato configurable, sin alterar la interfaz ni crear motores paralelos.
