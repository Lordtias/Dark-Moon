# ENTREGA — Orientación direccional de combatientes

## Estado

- Repositorio: `/mnt/data/darkmoon_work/Dark-Moon`
- Rama: `main`
- Commit base / HEAD verificado: `5ccd51fd5d5de4ff982fb04123b74d1ec3e3340e`
- Alcance: orientación visual de combatientes a partir del desplazamiento real, usando las configuraciones canónicas de profesiones y enemigos.
- Dependencias nuevas: ninguna.
- Persistencia histórica: fuera de alcance por decisión explícita; no se conserva compatibilidad con la antigua ruta `guerrero.png`.

## Corrección arquitectónica aplicada

La primera propuesta introducía un catálogo separado de perfiles direccionales. Esa solución fue descartada antes del commit porque duplicaba la configuración visual de los combatientes.

La solución final elimina completamente:

- `src/config/presentacion/PerfilesDireccionalesCombatientes.json`;
- `src/interfaz/graficos/ContextoPerfilesDireccionalesCombatientes.js`;
- `src/interfaz/graficos/ValidadorPerfilesDireccionalesCombatientes.js`.

Las rutas direccionales viven únicamente en las configuraciones canónicas ya existentes:

- `src/config/ConfiguracionPersonaje.json` para profesiones;
- `src/config/entidades/Enemigos.json` para enemigos generales;
- `src/config/entidades/EnemigosEspeciales.json` para enemigos especiales.

## Contrato de `recursoVisual`

Cada profesión o plantilla enemiga puede declarar:

```json
"recursoVisual": {
  "predeterminado": "ruta/base.png",
  "arriba": "ruta/arriba.png",
  "abajo": "ruta/abajo.png",
  "izquierda": "ruta/izquierda.png",
  "derecha": "ruta/derecha.png",
  "arriba_izquierda": "ruta/arriba_izquierda.png",
  "arriba_derecha": "ruta/arriba_derecha.png",
  "abajo_izquierda": "ruta/abajo_izquierda.png",
  "abajo_derecha": "ruta/abajo_derecha.png"
}
```

Las direcciones sin imagen disponible se omiten. `predeterminado` es obligatorio.

El dominio continúa utilizando una sola ruta simple en `Player.recursoVisual` y `Enemigo.recursoVisual`: la ruta `predeterminado`. Las rutas direccionales no se incorporan al estado jugable.

## Configuración actual

### Guerrero

- `predeterminado`: `guerrero_central.png`;
- `arriba`: `guerrero_central.png`;
- `abajo`: `guerrero_central.png`;
- `izquierda`: `guerrero_izquierda.png`;
- `derecha`: `guerrero_derecha.png`;
- diagonales: todavía no configuradas.

### Rogue y Mago

- `predeterminado`, `arriba` y `abajo`: utilizan su PNG actual;
- laterales y diagonales: todavía no configurados.

### Enemigos

Todas las plantillas actuales de `Enemigos.json` y `EnemigosEspeciales.json` declaran su PNG actual como `predeterminado`, `arriba` y `abajo`. Laterales y diagonales quedan preparados para agregarse en la propia plantilla cuando existan sus imágenes.

## Flujo final

Entrada cualquiera
→ lógica canónica de movimiento existente
→ movimiento resuelto
→ evento visual con `origen` y `destino`
→ `AdaptadorEscenaJuego` obtiene los recursos desde la configuración canónica usando `idProfesion` o `idPlantilla`
→ Phaser calcula la dirección por el desplazamiento real
→ si la dirección tiene PNG configurado, cambia la textura
→ si no tiene PNG configurado, conserva la textura mostrada anteriormente.

No existe lógica específica para teclado numérico, WASD, clic, IA ni nombres visibles.

## Separación de responsabilidades

- `ConfiguracionPersonaje.json`, `Enemigos.json` y `EnemigosEspeciales.json`: única fuente de verdad de las rutas del combatiente.
- `RecursosVisualesCombatientes.js`: valida y normaliza el contrato de `recursoVisual` sin almacenar configuración paralela.
- `Player` y `Enemigo`: continúan recibiendo únicamente `recursoVisual` como cadena predeterminada.
- `AdaptadorEscenaJuego`: único puente desde la configuración canónica hacia el contrato visual neutral.
- Phaser: resuelve la orientación desde `origen` y `destino` y mantiene únicamente memoria visual de la textura mostrada.
- Movimiento, IA, combate, tiempo y persistencia no calculan orientación gráfica.

## Indicador amarillo del jugador

Se eliminó del `CompositorEntidadesPhaser` el `strokeEllipse` amarillo que rodeaba la sombra del jugador. La sombra ambiental normal permanece sin cambios. El indicador rojo de agresividad de enemigos no fue modificado.

## Precarga

`AdaptadorEscenaJuego` incluye en `recursosVisualesPrecarga` todas las rutas declaradas en el `recursoVisual` canónico del combatiente. Phaser no lee archivos JSON ni conoce profesiones o plantillas.

## Archivos modificados

- `docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md`
- `src/aplicacion/ControladorPartida.js`
- `src/config/ConfiguracionPersonaje.json`
- `src/config/entidades/Enemigos.json`
- `src/config/entidades/EnemigosEspeciales.json`
- `src/interfaz/MenuCreacionPersonaje.js`
- `src/interfaz/Renderizador.js`
- `src/interfaz/dom/FabricaInterfazPartidaDom.js`
- `src/interfaz/graficos/AdaptadorEscenaJuego.js`
- `src/interfaz/graficos/phaser/CompositorEntidadesPhaser.js`
- `src/interfaz/graficos/phaser/CompositorMundoPhaser.js`
- `src/interfaz/graficos/phaser/reproductores/ReproductorMovimientoPhaser.js`
- `src/juego/configuracion/ConfiguracionInicial.js`
- `src/juego/fabricas/FabricaEnemigos.js`
- `src/partida/PersistenciaJugador.js`

## Archivos agregados

- `assets/imagenes/jugador/guerrero_central.png`
- `assets/imagenes/jugador/guerrero_izquierda.png`
- `assets/imagenes/jugador/guerrero_derecha.png`
- `src/juego/configuracion/RecursosVisualesCombatientes.js`
- `docs/phaser/entregas/ENTREGA_ORIENTACION_DIRECCIONAL_COMBATIENTES.md`

## Archivo eliminado

- `assets/imagenes/jugador/guerrero.png`

`assets/imagenes/jugador/old/guerrero2.png` permanece no versionado y fuera del alcance.

## Cómo agregar nuevas vistas

Para agregar una vista no se modifica la lógica. Se agrega el PNG y se amplía `recursoVisual` en la definición canónica correspondiente.

Ejemplo para una futura rata con perfiles laterales:

```json
"recursoVisual": {
  "predeterminado": "assets/imagenes/enemigos/rata.png",
  "arriba": "assets/imagenes/enemigos/rata.png",
  "abajo": "assets/imagenes/enemigos/rata.png",
  "izquierda": "assets/imagenes/enemigos/rata_izquierda.png",
  "derecha": "assets/imagenes/enemigos/rata_derecha.png"
}
```

Las diagonales se agregan del mismo modo cuando existan los PNG.

## Validaciones ejecutadas

### Sintaxis JavaScript global

- Preparación: recorrer `src/` y `electron/`.
- Pasos: `node --check` sobre cada `.js`.
- Resultado esperado: ningún error de sintaxis.
- Resultado obtenido: 264 archivos correctos.
- Estado: **Correcto**.

### JSON global

- Preparación: recorrer `src/config/`.
- Pasos: parsear todos los `.json`.
- Resultado esperado: todos válidos.
- Resultado obtenido: 35 archivos correctos.
- Estado: **Correcto**.

### Infraestructura existente de entidades

- Pasos: ejecutar `validarInfraestructuraEntidades()`.
- Resultado obtenido: `{ "valido": true }`.
- Estado: **Correcto**.

### Contrato canónico de recursos

- Se validaron las tres profesiones y las once plantillas enemigas.
- Todas poseen `predeterminado`, `arriba` y `abajo` válidos.
- Las rutas configuradas existen en disco.
- Guerrero incluye además izquierda y derecha.
- Estado: **Correcto**.

### Fábrica de enemigos

- Se calculó cada plantilla en su nivel mínimo permitido.
- `Enemigo.recursoVisual` recibe la ruta `predeterminado`, no el objeto direccional.
- Estado: **Correcto**.

### Adaptador y precarga

- El Guerrero se transforma al contrato visual con central, izquierda y derecha desde `ConfiguracionPersonaje.json`.
- Las tres rutas se incorporan a la precarga contextual.
- Phaser no consulta directamente configuraciones JSON.
- Estado: **Correcto**.

### Resolución de las ocho direcciones

- Se probaron desplazamientos independientes para arriba, abajo, izquierda, derecha y las cuatro diagonales.
- Todas resolvieron la clave semántica correspondiente mediante `origen` y `destino`.
- Estado: **Correcto**.

### Fallback direccional

- Izquierda configurada → cambia a izquierda: **Correcto**.
- Derecha configurada → cambia a derecha: **Correcto**.
- Diagonal no configurada después de izquierda → conserva izquierda: **Correcto**.
- Arriba configurado como central → vuelve a central: **Correcto**.

### Aro amarillo

- Se comprobó que `0xf1d579` y el `strokeEllipse` específico del jugador ya no existen en el compositor.
- La sombra normal y el contorno hostil de enemigos continúan presentes.
- Estado: **Correcto**.

### Assets

- `guerrero_central.png`: PNG RGBA 128 × 192.
- `guerrero_izquierda.png`: PNG RGBA 128 × 192.
- `guerrero_derecha.png`: PNG RGBA 128 × 192.
- `assets/imagenes/jugador/guerrero.png`: eliminado.
- Estado: **Correcto**.

### Prueba manual completa dentro del juego

- Estado: **Pendiente**.
- Debe comprobarse visualmente después de aplicar el incremental: movimiento cardinal y diagonal, enemigos, FOV, zoom, redimensionamiento y cambios de mapa.

## Compatibilidad

### Web / GitHub Pages

No se agregaron dependencias ni APIs externas. Se mantienen módulos ES, JSON y PNG relativos. Prueba interactiva en navegador: pendiente.

### Electron

No se modificó código Electron, `package.json` ni dependencias. La misma capa web/Phaser es reutilizada por Electron. Prueba interactiva Electron: pendiente.

### Persistencia

Las nuevas partidas guardan la ruta predeterminada simple del jugador. No existe migración para `guerrero.png` porque se decidió partir sin guardados anteriores.

## Restricciones verificadas

- Sin commit.
- Sin push.
- Sin dependencias nuevas.
- Sin `.mjs` ni `.patch`.
- Sin motor paralelo de movimiento.
- Sin reglas de IA o combate en Phaser.
- Sin configuración direccional paralela.
- Sin lógica dependiente del teclado numérico.
- Sin excepciones por nombre visible.
- Documento visual actualizado en V-035.

## Conventional Commit propuesto

```text
feat(render): integrar orientación direccional en configuración canónica

- definir recursos direccionales en profesiones y plantillas enemigas sin catálogos paralelos;
- orientar combatientes desde el desplazamiento canónico y conservar la última vista cuando falte un perfil;
- renombrar la vista frontal del Guerrero e incorporar perfiles izquierdo y derecho;
- eliminar el contorno amarillo del jugador y precargar las vistas configuradas;
- validar sintaxis, configuración, fábricas, adaptador, orientación y recursos gráficos;
- actualizar el contrato visual V-035 y la documentación de entrega.
```
