# ENTREGA B3 — Suerte, joyería y Tier III

## 1. Estado de la entrega

- **Plan:** Botín canónico de Dark Moon.
- **Etapa:** B3 — Suerte, joyería y Tier III.
- **Estado:** **Cerrada**. Implementación técnica y pruebas manuales aprobadas por el usuario el 19/08/2026.
- **Repositorio:** `/mnt/data/darkmoon_b3_review/Dark-Moon`
- **Rama:** `main`
- **Commit base:** `20d2f59601e9ce4b30057f17474d82a9233484c1`
- **HEAD verificado:** `20d2f59601e9ce4b30057f17474d82a9233484c1`
- **origin/main:** coincide con HEAD.
- **Git inicial:** limpio usando `git -c core.autocrlf=true status --porcelain=v1 -uall`.
- **Git final:** 96 cambios de B3 pendientes de commit: 42 archivos modificados y 54 archivos nuevos; 0 eliminados.
- **Commit/push:** no realizados.

El ZIP recibido ya contenía B2 consolidada en el HEAD indicado. La referencia heredada que hablaba de 48 cambios de B2 sin commit no coincide con esta copia real y no se reaplicó B2.

---

## 2. Alcance aprobado

B3 implementa las decisiones A–L aprobadas por el usuario:

1. Potencia de Aura deja Carisma y toma **Constitución**, manteniendo coeficiente inicial 2.
2. `Suerte` reemplaza canónicamente a `Carisma`.
3. Ajuste comercial: referencia 10, 2 % por punto y límite ±20 %.
4. Hallazgo mágico: +5 % de peso relativo por punto de Suerte sobre 10, mínimo 0 y tope +100 %.
5. Hallazgo mágico no modifica el presupuesto procedural.
6. El Hallazgo actual se evalúa al materializar realmente la recompensa.
7. Cofres/recipientes difieren su contenido hasta el primer abrir o, si siguen cerrados, su destrucción; nunca rerollean.
8. Joyería elemental: 5/10/15 % de resistencia base en Tier I/II/III.
9. `De lucidez`: 3–6 / 7–10 / 11–15 % de Resistencia Mental.
10. `De fortuna`: 5–10 / 11–20 / 21–30 % de Hallazgo mágico.
11. `Arcano` queda activo con +2–4 / +5–8 / +9–12 Maná y admite armadura, quiver y accesorio.
12. Tier III comienza en nivel 8.
13. `Del soberano` se elimina.
14. Enemigos reciben Suerte neutral 10, sin utilidad actual adicional.
15. Persistencia pasa a v5 sin migradores.
16. B3 se trabaja como una sola etapa y un único commit futuro.

---

## 3. Resumen sencillo

B3 agrega el atributo **Suerte** y lo conecta a dos resultados reales: precios y calidad de rareza. Comercio ya no calcula Suerte; consume el Ajuste comercial que entrega el cálculo canónico del jugador. Botín tampoco inventa una segunda fórmula: consulta el Hallazgo mágico ya resuelto y lo usa únicamente durante la selección de rareza.

Los cofres y recipientes ya no deciden todo su contenido al crear la mazmorra. Conservan la solicitud canónica y la materializan una sola vez cuando el jugador los abre o, si siguen cerrados, cuando los destruye. Así el Hallazgo equipado en ese momento sí importa y el presupuesto de la mazmorra permanece independiente.

Además se incorporan 24 joyas, 35 bases Tier III y 51 iconos. El Panel de Personaje muestra Suerte, Ajuste comercial y Hallazgo mágico usando resultados/desgloses canónicos. La persistencia v5 guarda las fuentes pero no los resultados derivados.

---

## 4. Arquitectura anterior y final

### Antes

```text
Carisma
 ├─ Potencia de Aura
 └─ Comercio vuelve a interpretar Carisma

Generación de mazmorra
 └─ cofre/recipiente materializa objetos inmediatamente

SistemaBotin
 └─ rareza sin Hallazgo mágico
```

### Después

```text
Constitución
 └─ Potencia de Aura

Suerte
 └─ EstadisticasDerivadas
     ├─ ajusteComercial → resolutor común → Comercio
     └─ hallazgoMagico  → resolutor común → SistemaBotin → GeneradorRarezaObjeto

Generación de mazmorra
 └─ cofre/recipiente guarda solicitud pendiente
     ├─ primer abrir → SistemaBotin materializa una vez
     └─ destruir cerrado → materializa una vez → supervivencia B2

Presupuesto procedural
 └─ SistemaBotin.calcularValorEsperadoSolicitudBotin()
    (independiente de Hallazgo mágico)
```

No se creó un motor paralelo de Suerte, comercio, objetos o botín.

---

## 5. Contenido incorporado

### Joyería

`src/config/objetos/Accesorios.json` contiene 24 bases:

- 8 Tier I, nivel mínimo 1, resistencia base 5 %;
- 8 Tier II, nivel mínimo 5, resistencia base 10 %;
- 8 Tier III, nivel mínimo 8, resistencia base 15 %.

Afinidades:

- Rubí → Fuego;
- Zafiro → Frío;
- Topacio → Rayo;
- Esmeralda → Veneno.

Cada Tier contiene cuatro anillos y cuatro collares.

### Tier III

Se agregan 35 bases Tier III:

- 11 armas;
- 16 armaduras/escudo;
- 8 accesorios, ya incluidos en las 24 joyas.

No existe una rama productiva `if (tier === 3)`; se utiliza `tierBase` + `nivelMinimoGeneracion`.

### Afijos

- `Vigoroso`: suma accesorio.
- `Arcano`: activo; armadura/quiver/accesorio; 2–4 / 5–8 / 9–12 Maná.
- `De ascuas`, `De escarcha`, `De tormenta`, `Del antídoto`: admiten accesorio.
- `Del deshielo`, `De firmeza`, `De purificación`, `De ceniza`: quedan correctamente exclusivos de accesorio.
- `De lucidez`: nuevo, exclusivo de accesorio, Resistencia Mental.
- `De fortuna`: nuevo, exclusivo de accesorio, Hallazgo mágico.
- `Del soberano`: eliminado.

### Assets

51 PNG nuevos, 64×64, RGBA y con transparencia.

---

## 6. Persistencia

- clave: `dark-moon:estado-jugador:v5`;
- versión: `5`;
- no existe migrador v4 → v5;
- `atributos.suerte` se persiste;
- `ajusteComercial` no se persiste;
- `hallazgoMagico` no se persiste;
- equipo y afijos sí se persisten como fuentes y reconstruyen los derivados al cargar.

Una partida v4 se rechaza explícitamente, de acuerdo con la decisión aprobada de no conservar guardados anteriores.

---

## 7. Archivos modificados

- `docs/botin/PLAN_MAESTRO_BOTIN_DARK_MOON.md`
- `docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md`
- `index.html`
- `src/aplicacion/ControladorPartida.js`
- `src/config/ConfiguracionCombate.js`
- `src/config/ConfiguracionPersonaje.json`
- `src/config/comercio/Comercio.json`
- `src/config/entidades/Enemigos.json`
- `src/config/entidades/EnemigosEspeciales.json`
- `src/config/idiomas/en.json`
- `src/config/idiomas/es.json`
- `src/config/mapas/Cementerio.json`
- `src/config/mapas/FortalezaAbandonada.json`
- `src/config/objetos/Armaduras.json`
- `src/config/objetos/Armas.json`
- `src/config/objetos/afijos/Prefijos.json`
- `src/config/objetos/afijos/Sufijos.json`
- `src/entidad/destructible/Destructible.js`
- `src/entidad/destructible/combatiente/Combatiente.js`
- `src/entidad/destructible/combatiente/EstadisticasDerivadas.js`
- `src/entidad/destructible/combatiente/Player.js`
- `src/entidad/interactuable/Cofre.js`
- `src/interfaz/PanelPersonaje.js`
- `src/interfaz/objetos/PresentadorObjeto.js`
- `src/juego/Juego.js`
- `src/juego/botin/ContextoGeneracionBotin.js`
- `src/juego/botin/SistemaBotin.js`
- `src/juego/combate/ResolutorDestruccionesJugador.js`
- `src/juego/comercio/CalculadorPreciosComercio.js`
- `src/juego/comercio/CalculadorValorObjeto.js`
- `src/juego/comercio/ValidadorConfiguracionComercio.js`
- `src/juego/configuracion/CargadorConfiguracion.js`
- `src/juego/configuracion/ConfiguracionInicial.js`
- `src/juego/fabricas/FabricaDestructibles.js`
- `src/juego/fabricas/FabricaEntidadesMazmorra.js`
- `src/juego/generacion/PobladorInteractuablesMazmorra.js`
- `src/juego/interacciones/SistemaInteraccionJugador.js`
- `src/juego/modificadores/ContratosModificadoresCombatiente.js`
- `src/juego/objetos/GeneradorObjetoAleatorio.js`
- `src/juego/objetos/GeneradorRarezaObjeto.js`
- `src/juego/objetos/ValidadorConfiguracionGeneracionObjetos.js`
- `src/partida/PersistenciaJugador.js`

## 8. Archivos agregados

- `docs/botin/entregas/ENTREGA_B3.md`
- `src/config/objetos/Accesorios.json`
- `src/juego/configuracion/ValidadorConfiguracionSuerte.js`

### Assets agregados

- `assets/imagenes/objetos/anillo_esmeralda_engastado.png`
- `assets/imagenes/objetos/anillo_esmeralda_magistral.png`
- `assets/imagenes/objetos/anillo_esmeralda_simple.png`
- `assets/imagenes/objetos/anillo_rubi_engastado.png`
- `assets/imagenes/objetos/anillo_rubi_magistral.png`
- `assets/imagenes/objetos/anillo_rubi_simple.png`
- `assets/imagenes/objetos/anillo_topacio_engastado.png`
- `assets/imagenes/objetos/anillo_topacio_magistral.png`
- `assets/imagenes/objetos/anillo_topacio_simple.png`
- `assets/imagenes/objetos/anillo_zafiro_engastado.png`
- `assets/imagenes/objetos/anillo_zafiro_magistral.png`
- `assets/imagenes/objetos/anillo_zafiro_simple.png`
- `assets/imagenes/objetos/arco_compuesto.png`
- `assets/imagenes/objetos/baston_maestro.png`
- `assets/imagenes/objetos/botas_acero_templado.png`
- `assets/imagenes/objetos/botas_cuero_remachado.png`
- `assets/imagenes/objetos/botas_tela_gruesas.png`
- `assets/imagenes/objetos/capucha_cuero_remachado.png`
- `assets/imagenes/objetos/capucha_tela_gruesa.png`
- `assets/imagenes/objetos/casco_acero_templado.png`
- `assets/imagenes/objetos/collar_esmeralda_engastado.png`
- `assets/imagenes/objetos/collar_esmeralda_magistral.png`
- `assets/imagenes/objetos/collar_esmeralda_simple.png`
- `assets/imagenes/objetos/collar_rubi_engastado.png`
- `assets/imagenes/objetos/collar_rubi_magistral.png`
- `assets/imagenes/objetos/collar_rubi_simple.png`
- `assets/imagenes/objetos/collar_topacio_engastado.png`
- `assets/imagenes/objetos/collar_topacio_magistral.png`
- `assets/imagenes/objetos/collar_topacio_simple.png`
- `assets/imagenes/objetos/collar_zafiro_engastado.png`
- `assets/imagenes/objetos/collar_zafiro_magistral.png`
- `assets/imagenes/objetos/collar_zafiro_simple.png`
- `assets/imagenes/objetos/coraza_acero_templado.png`
- `assets/imagenes/objetos/daga_acero_templado.png`
- `assets/imagenes/objetos/escudo_acero.png`
- `assets/imagenes/objetos/espada_acero_templado.png`
- `assets/imagenes/objetos/grebas_acero_templado.png`
- `assets/imagenes/objetos/guantes_acero_templado.png`
- `assets/imagenes/objetos/guantes_cuero_remachado.png`
- `assets/imagenes/objetos/guantes_tela_gruesos.png`
- `assets/imagenes/objetos/hacha_guerra_templada.png`
- `assets/imagenes/objetos/jubon_cuero_remachado.png`
- `assets/imagenes/objetos/lanza_acero_templado.png`
- `assets/imagenes/objetos/mandoble_acero_templado.png`
- `assets/imagenes/objetos/pantalones_cuero_remachado.png`
- `assets/imagenes/objetos/pantalones_tela_gruesos.png`
- `assets/imagenes/objetos/tunica_tela_gruesa.png`
- `assets/imagenes/objetos/varita_electrica_magistral.png`
- `assets/imagenes/objetos/varita_frio_magistral.png`
- `assets/imagenes/objetos/varita_fuego_magistral.png`
- `assets/imagenes/objetos/varita_veneno_magistral.png`

## 9. Archivos eliminados

Ninguno.

---

## 10. Dependencias y versiones

No se agregó, instaló ni actualizó ninguna dependencia.

Se conservan:

- Phaser `4.2.1`;
- Electron `43.3.0`;
- `@electron/packager` `20.0.1`.

No hay instrucciones de instalación adicionales para B3.

---

## 11. Aplicación del incremental

1. Partir del repositorio en `main` sobre `20d2f59601e9ce4b30057f17474d82a9233484c1` o una copia equivalente de B2.
2. Extraer el ZIP incremental en la raíz del repositorio conservando rutas relativas.
3. Aceptar el reemplazo de los 42 archivos modificados listados en esta entrega.
4. Agregar los 54 archivos nuevos listados en esta entrega, incluida esta documentación.
5. No eliminar ningún archivo: B3 no posee eliminaciones físicas.
6. No instalar dependencias.
7. Verificar:

```bash
git -c core.autocrlf=true status --porcelain=v1 -uall
git diff --check
```

No usar `git reset`, `git clean`, `git checkout` ni `git restore` masivos sobre una copia con trabajo recuperable.

---

## 12. Ejecución web

Desde la raíz:

```bash
python3 -m http.server 8000
```

o en Windows:

```bash
python -m http.server 8000
```

Abrir:

```text
http://localhost:8000/index.html
```

Para forzar contenido de nivel 8 durante pruebas puede usarse el parámetro de depuración ya existente sobre un mapa compatible, por ejemplo Sala de Guerra:

```text
http://localhost:8000/index.html?mapa=sala_guerra&nivel=8&semilla=b3-prueba
```

La validez exacta del ID visible del mapa debe respetar los IDs ya existentes en configuración; no se agregó un parámetro B3 especial.

---

## 13. Electron

B3 no modifica `package.json`, `package-lock.json` ni `electron/`.

La copia de trabajo no contiene `node_modules` ni un binario Electron disponible. Por restricción de la etapa no se instalaron dependencias y **Electron no fue ejecutado**.

En un entorno ya preparado, la comprobación manual continúa siendo:

```bash
npm start
```

No ejecutar instalación nueva exclusivamente para validar B3.

---

## 14. Pruebas técnicas ejecutadas

### 14.1. Runtime JavaScript de integraciones

**Preparación:** Chromium disponible en el entorno y módulos reales del repositorio transformados a un import map de prueba, sin reimplementar sus reglas.  
**Pasos:** cargar ControladorPartida, Juego, destrucciones, fábrica de entidades, interacción, Panel/Presentador, SistemaBotin, objetos, modificadores y persistencia.  
**Esperado:** todos los módulos cargan sin error.  
**Obtenido:** 142 módulos cargados; 0 errores de página.  
**Estado:** Correcto.

### 14.2. Configuraciones reales

**Preparación:** `CargadorConfiguracion` real con respuestas JSON del repositorio.  
**Pasos:** cargar personaje, objetos, generación, comercio y botín.  
**Esperado:** validadores aceptan B3.  
**Obtenido:** 118 objetos, 23 prefijos y 35 sufijos; sin error.  
**Estado:** Correcto.

### 14.3. Joyería y Tier III

**Pasos:** contar accesorios/Tiers, comprobar resistencias y generar realmente `anillo_rubi_simple` como objeto mágico mediante `GeneradorObjetoAleatorio`.  
**Esperado:** 24 joyas, 8 por Tier, 35 Tier III nivel mínimo 8 y joyería compatible con afijos.  
**Obtenido:** 24 / 8-8-8 / 35; la joya mágica se creó con un afijo real.  
**Estado:** Correcto.

### 14.4. Suerte

Casos comprobados:

| Suerte | Ajuste comercial | Hallazgo mágico |
|---:|---:|---:|
| 8 | -4 % | 0 % |
| 10 | 0 % | 0 % |
| 15 | +10 % | +25 % |
| 30 | +20 % | +100 % |

También se comprobó Potencia de Aura: +5 Constitución produce +10 Potencia de Aura. Una clave de modificador inexistente falla explícitamente.

**Estado:** Correcto.

### 14.5. De fortuna y resolutor común

**Pasos:** simular collar con `De fortuna` +30 usando `obtenerModificadoresEquipo`.  
**Obtenido:** objetivo `hallazgoMagico`, valor 30, por la ruta común del equipo.  
**Estado:** Correcto.

### 14.6. Hallazgo mágico y rareza

Se ejecutaron 60.000 tiradas deterministas por escenario con las rarezas activas actuales Común/Mágico.

| Hallazgo | Mágico observado | Referencia teórica aproximada |
|---:|---:|---:|
| 0 % | 29,48 % | 30,00 % |
| 25 % | 34,39 % | 34,88 % |
| 100 % | 45,76 % | 46,15 % |

La progresión fue monotónica y una `rarezaForzada: comun` siguió siendo Común incluso con +100 % Hallazgo.

**Estado:** Correcto.

### 14.7. Presupuesto independiente

**Pasos:** calcular el mismo valor esperado con Hallazgo 0 y 100.  
**Obtenido:** `308.33` en ambos casos.  
**Estado:** Correcto.

### 14.8. Materialización diferida

**Pasos:** crear cofre con solicitud pendiente, materializar una vez, registrar objetos, materializar por segunda vez.  
**Esperado:** primera llamada genera; segunda no rerollea.  
**Obtenido:** primera `materializadoAhora=true`, segunda `false`; IDs/rareza/nivel idénticos.  
**Estado:** Correcto.

### 14.9. Persistencia v5

**Pasos:** crear snapshot de prueba con Suerte 15 y resultados derivados presentes en memoria; leer serialización; probar v4.  
**Obtenido:** Suerte se guardó; Ajuste comercial/Hallazgo mágico no aparecieron; v4 fue rechazada.  
**Estado:** Correcto.

### 14.10. Assets

**Obtenido:** los 51 recursos referenciados existen, son 64×64, modo RGBA y poseen transparencia.  
**Estado:** Correcto.

### 14.11. Web y rutas

Servidor HTTP local: `index.html`, `game.js`, configuraciones principales B3 e idiomas respondieron 200. Los 51 assets B3 respondieron 200.

Chromium del entorno bloqueó por política administrativa la navegación directa a `localhost` y `file://`; por ese motivo no se afirma haber recorrido visualmente una partida completa en este entorno. La carga de módulos se probó separadamente mediante ES Modules y las rutas HTTP se comprobaron directamente.

**Estado técnico de recursos:** Correcto.  
**Partida visual completa en navegador:** Aprobada por el usuario el 19/08/2026.

### 14.12. Auditoría de arquitectura

Se comprobó:

- ninguna segunda definición de `calcularValorEsperadoSolicitudBotin`;
- Comercio no contiene la fórmula de Suerte;
- `resolverSolicitudBotin` sigue perteneciendo a `SistemaBotin`;
- no existe condición runtime específica para Tier III;
- `Carisma` sólo aparece en el validador como error explícito para configuraciones antiguas;
- `Del soberano` ya no aparece en producción;
- `git diff --check` correcto.

**Estado:** Correcto.

---

## 15. Incidencias corregidas durante la validación manual

La primera prueba de entrada a mazmorra detectó una regresión de B3 en `PobladorInteractuablesMazmorra`: el poblador interpretaba un `resultadoBotin` todavía nulo como cofre inválidamente vacío, aunque desde B3 ese estado significa que el contenido está **pendiente de materialización**.

La corrección conserva la validación real: un cofre con solicitud pendiente es válido; un cofre ya materializado con cero objetos continúa siendo inválido cuando su tabla debe garantizar contenido. No se adelantó nuevamente la tirada de botín.

La regresión completa detectó además que el mayor valor esperado del Equipamiento tras incorporar joyería/Tier III podía dejar sin presupuesto suficiente algunas composiciones obligatorias de habitaciones especiales. Sin cambiar la ecuación canónica ni los presupuestos normales, se ajustó `multiplicadorHabitacionEspecial` de 3 a 4 en:

- `Cementerio.json`;
- `FortalezaAbandonada.json`.

Sala de Guerra ya utilizaba 4.

Validaciones posteriores a las correcciones:

- 50/50 ciclos de creación → materialización → reapertura del cofre sin reroll;
- 30/30 generaciones completas de Alcantarilla niveles 1–3;
- 200/200 generaciones completas finales sobre las cinco mazmorras, probando niveles mínimo y máximo;
- JSON, sintaxis JavaScript, imports relativos y `git diff --check` correctos.

---

## 16. Pruebas manuales aprobadas por el usuario

El usuario confirmó el **19/08/2026** que las pruebas manuales de B3 fueron satisfactorias. Se registran como aprobadas las pruebas M1–M11 definidas en esta entrega.

### M1 — Panel de Personaje

**Preparación:** iniciar nueva partida.  
**Pasos:** abrir Personaje; revisar atributos y bloque de combate; cambiar ES/EN; probar ventana normal y resolución pequeña.  
**Esperado:** aparece Suerte y no Carisma; aparecen Ajuste comercial y Hallazgo mágico; los desgloses abren modal propio; no aparece scrollbar por defecto si el contenido cabe; textos correctos en ES/EN.  
**Obtenido:** Aprobado por el usuario el 19/08/2026.  
**Estado:** Correcto.

### M2 — Constitución y Potencia de Aura

**Preparación:** disponer de al menos un punto de atributo. Para una prueba deliberada puede aumentarse temporalmente `darkMoonAplicacion.controladorPartida.juego.player.puntosAtributoDisponibles` desde consola y asignar el punto desde la UI.  
**Pasos:** observar el desglose, asignar Constitución y volver a abrirlo.  
**Esperado:** cada punto de Constitución aporta +2 a Potencia de Aura; Sabiduría y Suerte no aportan Potencia de Aura.  
**Obtenido:** Aprobado por el usuario el 19/08/2026.  
**Estado:** Correcto.

### M3 — Comercio y Suerte

**Pasos:** comparar compra/venta con diferente Suerte.  
**Esperado:** por encima de 10 mejora compra/venta; por debajo empeora; el límite es ±20 %. Equipar `De fortuna` no cambia precios.  
**Obtenido:** Aprobado por el usuario el 19/08/2026.  
**Estado:** Correcto.

### M4 — Joyería

**Pasos:** obtener/equipar anillos y collar; probar ambos anillos; revisar detalle.  
**Esperado:** se equipan en las ranuras existentes; muestran resistencia base correcta; los afijos globales afectan al portador y se retiran al desequipar.  
**Obtenido:** Aprobado por el usuario el 19/08/2026.  
**Estado:** Correcto.

### M5 — De lucidez / De fortuna / Arcano

**Pasos:** equipar objetos que posean estos afijos y revisar Panel/tooltip.  
**Esperado:** Lucidez modifica Resistencia Mental; Fortuna Hallazgo mágico; Arcano Maná máximo. Fortuna no modifica Suerte ni Ajuste comercial.  
**Obtenido:** Aprobado por el usuario el 19/08/2026.  
**Estado:** Correcto.

### M6 — Cofre y Hallazgo al materializar

**Preparación:** entrar a una mazmorra con cofre/recipiente todavía sin abrir.  
**Pasos:** equipar o desequipar joyas de Fortuna **antes de abrir**; abrir una sola vez; cerrar/reabrir el modal.  
**Esperado:** Hallazgo vigente al primer abrir es el utilizado; reabrir no cambia el contenido.  
**Obtenido:** Aprobado por el usuario el 19/08/2026.  
**Estado:** Correcto.

### M7 — Destruir recipiente sin abrir

**Pasos:** destruir un recipiente que nunca fue abierto.  
**Esperado:** se materializa exactamente una vez y luego se aplica la supervivencia 80 % por pila; no aparece contenido duplicado.  
**Obtenido:** Aprobado por el usuario el 19/08/2026.  
**Estado:** Correcto.

### M8 — Destruir después de retirar parte

**Pasos:** abrir recipiente, retirar algunos objetos y destruirlo.  
**Esperado:** sólo se procesa lo que quedó dentro; nunca reaparecen objetos retirados.  
**Obtenido:** Aprobado por el usuario el 19/08/2026.  
**Estado:** Correcto.

### M9 — Tier III nivel 8

**Pasos:** generar varias expediciones de nivel 8 y revisar botín Equipamiento.  
**Esperado:** Tier III ya es elegible; no es garantizado; Tier I/II continúan participando.  
**Obtenido:** Aprobado por el usuario el 19/08/2026.  
**Estado:** Correcto.

### M10 — Regresión general

Revisar:

- creación de personaje;
- mapa/movimiento/espera;
- combate y habilidades;
- muerte/XP;
- enemigos Élite;
- cofres y recipientes;
- destrucción;
- materiales/desechables;
- inventario/equipamiento;
- comercio;
- guardado/carga v5;
- transición;
- zoom mínimo/máximo;
- redimensionamiento/pantalla completa;
- consola sin errores.

**Obtenido:** Aprobado por el usuario el 19/08/2026.  
**Estado:** Correcto.

### M11 — Electron

En un entorno que ya tenga las dependencias instaladas:

```bash
npm start
```

Repetir al menos M1, M4, M6, guardado/carga y una transición.

**Obtenido:** Aprobado por el usuario el 19/08/2026.  
**Estado:** Correcto.

---

## 17. Compatibilidad y riesgos

### Web

No se agregan dependencias de Node en runtime. Se conservan ES Modules, `fetch`, Phaser vendorizado y rutas relativas. Los recursos modificados/nuevos respondieron HTTP 200.

### Electron

No se modificó su wrapper. Las pruebas manuales de la etapa fueron aprobadas por el usuario. El asistente no ejecutó Electron de forma independiente en esta copia porque no contiene las dependencias instaladas y B3 no autorizaba instalarlas.

### Persistencia

Existe rotura deliberada de compatibilidad con v4 por decisión aprobada. No es un defecto: B3 asume cero guardados que conservar.

### Observaciones futuras no bloqueantes

- el uso táctico de un set de Fortuna inmediatamente antes de materializar una recompensa permanece permitido por diseño B3 y puede reanalizarse si el gameplay futuro lo requiere;
- Potencia de Aura deriva de Constitución, pero las auras actuales todavía no escalan automáticamente su magnitud desde esa estadística;
- el asistente no ejecutó Electron de forma independiente por ausencia de dependencias instaladas, aunque la validación manual de la etapa fue aprobada por el usuario.

---

## 18. Comprobación de restricciones

- una sola lógica de botín: cumplido;
- una sola consulta de valor esperado: cumplido;
- modificadores globales mediante resolutor común: cumplido;
- claves nuevas registradas canónicamente: cumplido;
- interfaz consume resultados/desgloses: cumplido;
- no persistir resultados derivados: cumplido;
- no condiciones por nombre visible: cumplido;
- sin regla especial Tier III: cumplido;
- sin dependencias nuevas: cumplido;
- sin `.patch`/`.mjs`: cumplido;
- sin commit/push: cumplido;
- sin modificación de movimiento/IA/muerte/XP/habilidades: cumplido salvo integración normal del botín en destrucciones ya existente;
- no se reabrieron Planes Maestros cerrados de Habilidades/Mazmorras: cumplido.

---

## 19. Conventional Commit propuesto

Las pruebas manuales fueron aprobadas. El asistente no realiza el commit; el siguiente mensaje queda listo para usar.

```text
feat(botin): incorporar suerte joyeria y tier iii

- reemplaza Carisma por Suerte y resuelve Ajuste comercial y Hallazgo mágico mediante el contrato canónico de modificadores;
- difiere la materialización de cofres y recipientes al primer abrir o destruir, manteniendo una sola tirada y la supervivencia heredada de B2;
- incorpora 24 accesorios elementales, De lucidez, De fortuna, Arcano rebalanceado y 35 bases Tier III desde nivel 8;
- agrega 51 iconos de objetos y actualiza Panel de Personaje, presentación, idiomas y persistencia v5;
- corrige la validación de cofres con contenido diferido y ajusta el presupuesto especial de Cementerio/Fortaleza al nuevo valor esperado de Equipamiento;
- valida 200 generaciones completas de mazmorra, módulos/configuraciones, rareza, presupuesto, materialización, persistencia, assets y pruebas manuales aprobadas;
- actualiza el Plan Maestro de Botín, el Diseño Maestro Visual y la entrega B3.
```

---

## 20. ENLACE PARA LA SIGUIENTE ETAPA

---------------- INICIO DEL ENLACE ----------------

PLAN:
Botín canónico de Dark Moon

ETAPA CERRADA:
B3 — Suerte, joyería y Tier III

ESTADO:
Cerrada

COMMIT BASE:
20d2f59601e9ce4b30057f17474d82a9233484c1

HEAD FINAL VERIFICADO:
20d2f59601e9ce4b30057f17474d82a9233484c1

GIT STATUS FINAL:
96 cambios de B3 pendientes de commit: 42 archivos modificados y 54 archivos nuevos; 0 eliminados. Verificado con `git -c core.autocrlf=true status --porcelain=v1 -uall`. No se realizó commit ni push.

DOCUMENTO DE ENTREGA:
docs/botin/entregas/ENTREGA_B3.md

DOCUMENTOS MAESTROS ACTUALIZADOS:
- docs/botin/PLAN_MAESTRO_BOTIN_DARK_MOON.md
- docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md

OBJETIVO QUE SE COMPLETÓ:
Implementar Suerte, Ajuste comercial, Hallazgo mágico, materialización diferida de recipientes, joyería Tier I/II/III, afijos aprobados, Tier III desde nivel 8, nuevos assets, Panel de Personaje y persistencia v5 conservando SistemaBotin y el resolutor común como autoridades únicas.

ARQUITECTURA HEREDADA:
SistemaBotin continúa siendo la única autoridad productiva y presupuestaria del botín. Hallazgo mágico es un resultado derivado del jugador y sólo altera pesos de rareza al materializar. Cofres/recipientes guardan una solicitud pendiente y materializan exactamente una vez al primer abrir o destruir. Comercio consume Ajuste comercial ya resuelto. Accesorios y Tier III utilizan el generador/equipamiento existente sin motor paralelo. El poblador reconoce correctamente el estado pendiente de un cofre sin confundirlo con contenido materializado vacío.

ARCHIVOS CLAVE:
- src/juego/botin/SistemaBotin.js: generación única, valor esperado, Hallazgo actual y materialización diferida.
- src/entidad/destructible/combatiente/EstadisticasDerivadas.js: Suerte, Ajuste comercial, Hallazgo mágico y Potencia de Aura por Constitución.
- src/config/objetos/Accesorios.json: 24 bases canónicas de joyería.
- src/juego/objetos/GeneradorRarezaObjeto.js: aplica Hallazgo únicamente a pesos de rarezas superiores a Común.
- src/juego/generacion/PobladorInteractuablesMazmorra.js: admite cofres con contenido pendiente sin desactivar la validación de cofres realmente vacíos.
- src/partida/PersistenciaJugador.js: contrato v5 sin derivados persistidos.

DEPENDENCIAS Y VERSIONES:
Ninguna nueva. Phaser 4.2.1, Electron 43.3.0 y @electron/packager 20.0.1 se conservan.

PRUEBAS CLAVE SUPERADAS:
- pruebas manuales M1–M11 de B3 aprobadas por el usuario el 19/08/2026.
- 200/200 generaciones completas finales de las cinco mazmorras en niveles mínimo/máximo, además de 50/50 ciclos de materialización/reapertura sin reroll.
- 24 accesorios, 35 bases Tier III, Suerte/Hallazgo/Fortuna, presupuesto independiente y persistencia v5 comprobados.
- 51 assets 64×64 RGBA transparentes, configuraciones, módulos/imports y recursos HTTP comprobados.

PROBLEMAS O RIESGOS PENDIENTES:
- Ningún bloqueante conocido. El uso táctico de un set de Fortuna antes de materializar permanece permitido por diseño.
- Potencia de Aura deriva de Constitución, pero las auras actuales todavía no escalan automáticamente desde esa estadística.
- El asistente no ejecutó Electron independientemente por ausencia de dependencias instaladas; no se instalaron dependencias.

DECISIONES APROBADAS:
- Potencia de Aura usa Constitución con coeficiente inicial 2.
- Hallazgo mágico tiene tope +100 %, no modifica presupuesto y se evalúa al materializar.
- Joyería usa resistencias 5/10/15 %, Lucidez/Fortuna aprobados y Arcano rebalanceado.
- Tier III comienza en nivel 8.
- enemigos usan Suerte neutral 10 y persistencia pasa a v5 sin migradores.
- cofres/recipientes mantienen materialización diferida única; el poblador reconoce su estado pendiente.

DECISIONES QUE SIGUEN ABIERTAS:
- Ninguna dentro de B3. No existe una B4 definida actualmente en el Plan Maestro.

SIGUIENTE ETAPA RECOMENDADA:
Definir y aprobar explícitamente una nueva etapa del Plan Maestro si se desea continuar el sistema de botín.

OBJETIVO DE LA SIGUIENTE ETAPA:
No definido actualmente en el Documento Maestro.

PRIMEROS ARCHIVOS A REVISAR:
- docs/botin/PLAN_MAESTRO_BOTIN_DARK_MOON.md
- docs/botin/entregas/ENTREGA_B3.md
- src/juego/botin/SistemaBotin.js

NO MODIFICAR SIN NUEVA APROBACIÓN:
- contratos canónicos de movimiento, combate, muerte y experiencia;
- motor canónico de modificadores salvo una integración futura explícitamente aprobada;
- Planes Maestros cerrados de Habilidades y Mazmorras.

CRITERIO DE CIERRE DE LA SIGUIENTE ETAPA:
Debe definirse junto con el alcance de la nueva etapa. Cualquier ampliación debe conservar una sola autoridad de botín, un único resolutor de modificadores y datos configurables sin excepciones por nombre.

CONVENTIONAL COMMIT PROPUESTO PARA LA ETAPA CERRADA:
feat(botin): incorporar suerte joyeria y tier iii

- reemplaza Carisma por Suerte y resuelve Ajuste comercial y Hallazgo mágico mediante el contrato canónico de modificadores;
- difiere la materialización de cofres y recipientes al primer abrir o destruir, manteniendo una sola tirada y la supervivencia heredada de B2;
- incorpora 24 accesorios elementales, De lucidez, De fortuna, Arcano rebalanceado y 35 bases Tier III desde nivel 8;
- agrega 51 iconos de objetos y actualiza Panel de Personaje, presentación, idiomas y persistencia v5;
- corrige la validación de cofres con contenido diferido y ajusta el presupuesto especial de Cementerio/Fortaleza al nuevo valor esperado de Equipamiento;
- valida 200 generaciones completas de mazmorra, módulos/configuraciones, rareza, presupuesto, materialización, persistencia, assets y pruebas manuales aprobadas;
- actualiza el Plan Maestro de Botín, el Diseño Maestro Visual y la entrega B3.

----------------- FIN DEL ENLACE -----------------
