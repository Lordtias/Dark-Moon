# ENTREGA ETAPA 5 — Motor configurable de habilidades y grados

## 1. Identificación

- Repositorio: `https://github.com/Lordtias/Dark-Moon.git`
- Rama revisada: `main`
- Commit base y HEAD verificado: `563c52f907cad2bc1f2ceb711a1f186f7b0aad2d`
- Entrega anterior: `docs/magia/ENTREGA_ETAPA_4.md`
- Commit realizado durante esta entrega: ninguno

## 2. Resultado funcional

ETAPA 5 incorpora una infraestructura común para seleccionar, validar y ejecutar habilidades configuradas por grado. `ProgresoMagicoJugador` continúa siendo la fuente única de maestrías, experiencia, puntos y grados; la nueva capa sólo consume esos datos y conserva asignaciones transitorias de barra.

El corte vertical jugable es `aguijon_toxico` en grados 1–4. Las otras once habilidades mantienen sus requisitos `0/3/6` y máximos `4/3/3`, pero continúan sin contenido ejecutable hasta sus etapas específicas.

## 3. Contrato de ejecución

Una ejecución pasa por cuatro momentos:

1. **Selección gratuita:** valida ranura, configuración y grado aprendido. No genera ID ni consume recursos.
2. **Preparación:** resuelve objetivo, alcance, patrón, línea de visión, coste de Maná, coste temporal, daño y efectos.
3. **Confirmación atómica:** genera `idEjecucion`, descuenta Maná real, registra hostilidad, aplica daño y efectos, y registra una acción temporal.
4. **Recompensa única:** informa a `ProgresoMagicoJugador` exactamente una vez con `idEjecucion`, maestría, Maná realmente consumido y `ejecucionEfectiva: true`.

Los rechazos y la cancelación devuelven `turnoConsumido: false`, `manaConsumido: 0` y no notifican experiencia.

## 4. Configuración por grado

`Habilidades.json` mantiene los campos de progresión y agrega campos jugables opcionales:

- `icono`
- `descripcion`
- `ejecucion.tipoObjetivo`
- `ejecucion.patronAtaque`
- `ejecucion.requiereLineaVision`
- `ejecucion.hostil`
- `ejecucion.grados`

Cada grado de Aguijón tóxico define:

- coste de Maná;
- coste temporal base;
- alcance;
- componentes de daño;
- efectos temporales;
- duración, intervalo y regla de acumulación.

Los valores son técnicos y provisionales. ETAPA 12 conserva la autoridad sobre balance definitivo.

## 5. Integraciones

### Progreso mágico

El grado se consulta mediante `Player.obtenerGradoHabilidad()` o la instancia de `ProgresoMagicoJugador`. La barra no almacena ni recalcula grados.

### Maná

Se captura el Maná anterior, se invoca la operación real de consumo y se calcula la diferencia. Si la diferencia no coincide con el coste completo, se restaura el recurso y la ejecución se rechaza.

### Tiempo

El resultado conserva el tipo semántico `habilidad`. Para no introducir un factor temporal nuevo, el adaptador usa `TIPOS_ACCION_TEMPORAL.HABILIDAD` cuando exista y, en el estado actual, cae de forma explícita en `TIPOS_ACCION_TEMPORAL.ACCION`. Por lo tanto se aplica el `factorAccion` existente con el coste base configurable del grado.

### Daño elemental

`MotorDanioHabilidad` delega en `resolverPaqueteDanio`, conserva el desglose elemental y sólo aplica al objetivo el daño final resuelto. Inteligencia utiliza las funciones de `CalculadorAtributosMagicos`.

### Efectos temporales

`MotorEfectosHabilidad` crea una instantánea escalada por Sabiduría y delega primero en `SistemaEfectosTemporales` a través del coordinador activo. Incluye una compatibilidad transitoria basada en tiempo simulado para no perder el efecto si la fachada del coordinador difiere, sin otorgar XP por pulso.

### Estado de combate

Una habilidad hostil válida registra al objetivo en el estado de combate. Selección, movimiento del selector, cancelación, falta de Maná y geometría inválida no registran hostilidad.

### Alcance y línea de visión

Se reutiliza `evaluarAtaqueCasilla` mediante un adaptador geométrico del jugador que expone el alcance y patrón de la habilidad sin modificar el arma equipada.

## 6. Identidad de ejecución

`EstadoSesionHabilidades` conserva un contador por instancia de jugador mediante `WeakMap`.

Formato:

```text
habilidad-000001
habilidad-000002
```

El contador y las asignaciones sobreviven a una reconstrucción de `Juego` durante la misma sesión porque la misma instancia de `Player` es la clave. No forman parte del snapshot durable.

## 7. Barra e iconos

La integración reutiliza un contenedor existente reconocido por ID, clase o atributo. Si la plantilla no lo expone, crea una barra técnica de respaldo de diez ranuras.

Controles:

- `1–0`: seleccionar ranura;
- flechas, WASD o teclado numérico: mover selector;
- `F`: confirmar;
- `Escape`: cancelar;
- clic en ranura: seleccionar;
- clic en casilla reconocible por `data-x/data-y`: fijar selector.

El icono de Aguijón tóxico es `assets/habilidades/aguijon-toxico.png`, PNG RGBA real de 16×16 píxeles. Se muestra sin interpolación mediante `image-rendering: pixelated`.

Los doce iconos definitivos, tooltips completos, árbol de aprendizaje y drag-and-drop permanecen para ETAPA 7.

## 8. Archivos nuevos

```text
assets/habilidades/aguijon-toxico.png
src/interfaz/habilidades/BarraHabilidades.js
src/juego/habilidades/ControladorEntradaHabilidades.js
src/juego/habilidades/DepuradorEtapa5.js
src/juego/habilidades/EstadoSesionHabilidades.js
src/juego/habilidades/InstaladorEtapa5.js
src/juego/habilidades/IntegracionHabilidadesEtapa5.js
src/juego/habilidades/MotorDanioHabilidad.js
src/juego/habilidades/MotorEfectosHabilidad.js
src/juego/habilidades/SistemaHabilidadesJugador.js
src/juego/habilidades/ValidadorConfiguracionEjecucionHabilidades.js
docs/magia/ENTREGA_ETAPA_5.md
docs/magia/VALIDACION_CONSOLA_ETAPA_5.md
docs/magia/RESULTADOS_VALIDACION_ESTATICA_ETAPA_5.md
docs/magia/Plan_Maestro_Magia_Habilidades_Maestrias_Dark_Moon_v1.6.docx
```

## 9. Archivos modificados completos

```text
src/config/magia/Habilidades.json
src/juego/maestrias/ContextoProgresoMagico.js
```

## 10. Archivos eliminados

Ninguno.

## 11. Resultados de validación

Se ejecutó un arnés determinista en Chromium, sin Node.js y sin dependencias instaladas. Resultado: 24 de 24 comprobaciones funcionales aprobadas.

También se importaron mediante V8 los once módulos JavaScript de la entrega con dependencias controladas: 11 de 11 aprobados.

La auditoría estructural final aprobó 13 de 13 comprobaciones y resolvió 19 importaciones relativas. El documento maestro v1.6 se renderizó en 23 páginas y fue revisado visualmente.

Se verificó el asset:

- 16×16 píxeles;
- modo RGBA;
- fondo transparente;
- alfa exclusivamente 0 o 255;
- seis colores opacos;
- margen transparente;
- silueta de 14 píxeles de alto.

La copia completa del repositorio no pudo clonarse dentro del entorno de entrega por falta de resolución DNS saliente. Por ese motivo, las pruebas reales dentro del juego quedan documentadas para ejecutarse después de copiar los archivos. Esta limitación no se oculta ni se sustituye por una afirmación de ejecución sobre el juego completo.

## 12. Riesgos y deuda controlada

- La integración descubre la instancia activa de `Juego` mediante un adaptador no invasivo programado desde el contexto mágico. Reduce archivos modificados, pero debe reemplazarse por inyección explícita cuando ETAPA 7 reorganice controladores e interfaz.
- `MotorDanioHabilidad` y `MotorEfectosHabilidad` incluyen adaptadores de firma para convivir con los contratos reales ya existentes. Las pruebas manuales del repositorio completo deben confirmar qué ruta queda activa.
- La restauración de Maná cubre errores inesperados, pero un error posterior a una mutación externa de daño requiere revisar el estado real. La prevalidación minimiza esta ventana.
- Los valores de Aguijón tóxico no son balance final.
- Las asignaciones de barra y el contador de ejecución no son durables.

## 13. Restricciones confirmadas

- No se agregaron archivos `.patch`.
- No se agregaron archivos `.mjs`.
- No se utilizó `node:test`.
- No se utilizó Node.js para validar.
- No se instalaron runtimes, librerías ni dependencias.
- Los archivos modificados se entregan completos.
- No se realizó commit.
- No se avanzó a ETAPA 6.
