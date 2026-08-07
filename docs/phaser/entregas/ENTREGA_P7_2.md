# ENTREGA P7.2 — CONFIGURACIÓN VISUAL PERSISTENTE

Fecha: 2026-08-07  
Etapa: P7.2  
Estado final: validada manualmente y cerrada
SHA final: `93cbd48cb29c77c9af8f3de222e13437971abb32`
Base exacta: `9d7938fc0d92c5735a9df81dddd42834903bac68`  
Rama: `main`  
Commit realizado: no

## 1. Objetivo

Reemplazar el placeholder de Configuración por preferencias reales para la beta web, conservando una separación estricta entre valores canónicos, overrides elegidos por el usuario, guardado del personaje y presentación Phaser.

## 2. Cierre de P7.1

P7.1 fue validada manualmente y publicada en `9d7938fc0d92c5735a9df81dddd42834903bac68`. La mejora adicional del autosave del personaje fue explícitamente pospuesta y no forma parte de P7.2.

## 3. Fuente canónica de preferencias

Se agrega:

`src/config/presentacion/PreferenciasInterfaz.json`

El JSON define actualmente:

- velocidad inicial `normal` y opciones admitidas;
- efectos reducidos inicialmente desactivados;
- zoom inicial `1.2`;
- mínimo `0.8`;
- máximo `1.6`;
- paso `0.1`.

La persistencia no define ni duplica esos defaults.

## 4. Persistencia de overrides

`PersistenciaPreferenciasInterfaz.js` utiliza una clave independiente del guardado jugable y almacena únicamente valores elegidos por el usuario que difieren de la configuración canónica.

Consecuencias:

- primera ejecución sin cambios: no se escribe un snapshot de defaults;
- si cambia un default futuro, un usuario que nunca lo modificó adopta automáticamente el nuevo valor canónico;
- un usuario que eligió explícitamente otro valor conserva su override;
- volver a un valor canónico elimina ese override;
- restablecer elimina todos los overrides y vuelve a resolver desde el JSON vigente;
- crear/reemplazar personaje no elimina preferencias de interfaz.

Una persistencia inválida no bloquea Dark Moon. Los valores persistidos se validan campo por campo y todo valor incompatible vuelve al canónico.

## 5. Pantalla de Configuración

El menú expone:

### Velocidad de animaciones

- Normal;
- Rápida;
- Muy rápida.

Se conecta al contrato ya existente del reproductor Phaser. No modifica iniciativa, tiempo canónico ni acciones.

### Efectos visuales reducidos

Activa el contrato ya existente `efectosReducidos`. Solo modifica presentación.

### Zoom inicial del mapa

Rango 80 %–160 %, pasos de 10 %, default canónico 120 %. El valor se aplica al crear Phaser y vuelve a aplicarse cuando cambia el mapa. Los cambios temporales realizados con rueda o `+/-` no se persisten automáticamente.

### Pantalla completa

Utiliza la API web estándar sobre toda la aplicación. El botón se sincroniza con `fullscreenchange`. No se persiste ni se intenta activar automáticamente al recargar, porque los navegadores requieren una interacción explícita del usuario.

## 6. Arquitectura

Flujo:

```text
PreferenciasInterfaz.json
        ↓
defaults canónicos
        ↓
resolver preferencias ← overrides de localStorage
        ↓
Aplicacion
        ↓
PresentacionAplicacionDom
        ↓
FabricaInterfazPartidaDom
        ↓
RenderizadorPhaser
        ├─ velocidad / efectos → ReproductorEventosVisualesPhaser
        └─ zoom inicial → ControladorCamaraPhaser
```

Phaser no lee JSON ni `localStorage`.

## 7. Canvas 2D

Canvas 2D sigue disponible mediante `?render=canvas2d`. Las preferencias exclusivas de Phaser no introducen implementaciones artificiales en Canvas. Pantalla completa corresponde a la aplicación web y puede utilizarse independientemente del backend.

## 8. Archivos nuevos

- `src/config/presentacion/PreferenciasInterfaz.json`;
- `src/interfaz/configuracion/PreferenciasInterfaz.js`;
- `src/interfaz/configuracion/PersistenciaPreferenciasInterfaz.js`;
- `src/interfaz/dom/ControladorConfiguracionDom.js`;
- `docs/phaser/entregas/ENTREGA_P7_2.md`.

## 9. Archivos modificados

- `index.html`;
- `assets/estilos/base/style.css`;
- `src/aplicacion/Aplicacion.js`;
- `src/interfaz/dom/FabricaInterfazPartidaDom.js`;
- `src/interfaz/dom/PresentacionAplicacionDom.js`;
- `src/interfaz/graficos/phaser/ConfiguracionPhaser.js`;
- `src/interfaz/graficos/phaser/ControladorCamaraPhaser.js`;
- `src/interfaz/graficos/phaser/EscenaArranquePhaser.js`;
- `src/interfaz/graficos/phaser/RenderizadorPhaser.js`;
- `README.md`;
- `docs/phaser/PLAN_MAESTRO_PHASER_ELECTRON_DARK_MOON.md`;
- `docs/phaser/DISENO_MAESTRO_VISUAL_DARK_MOON.md`;
- `docs/phaser/entregas/ENTREGA_P7_1.md`.

## 10. Pruebas automáticas y estáticas

Se verifican:

- sintaxis de todos los JavaScript;
- lectura de todos los JSON;
- imports relativos;
- configuración canónica válida;
- resolución de defaults sin persistencia;
- override parcial;
- descarte de valores persistidos inválidos;
- persistencia únicamente de diferencias respecto de defaults;
- eliminación del almacenamiento al volver completamente a defaults;
- zoom inicial configurable y restablecido al cambiar de mapa;
- IDs HTML únicos;
- ausencia de `.mjs` y `.patch`;
- `git diff --check` sobre los cambios reales;
- aplicación del incremental sobre el SHA base y comparación contra el ZIP completo.

Los recursos principales también se comprueban mediante servidor HTTP local. Chromium está disponible en el entorno, pero la navegación hacia `localhost` está bloqueada administrativamente (`ERR_BLOCKED_BY_ADMINISTRATOR`), por lo que no fue posible completar una interacción visual automatizada real.

## 11. Pruebas manuales recomendadas

1. Entrar a Configuración en primera ejecución: Normal / OFF / 120 %.
2. Confirmar que no existe almacenamiento de preferencias antes de modificar algo.
3. Elegir Rápida, activar efectos reducidos y cambiar zoom.
4. Recargar y comprobar que los overrides permanecen.
5. Iniciar una partida y comprobar velocidad/efectos/zoom en Phaser.
6. Cambiar zoom con rueda, cambiar de mapa y comprobar que vuelve al zoom inicial configurado.
7. Restablecer valores y comprobar Normal / OFF / 120 %.
8. Recargar y confirmar que se siguen usando los defaults canónicos.
9. Activar y salir de pantalla completa; salir también con `Esc`.
10. Abrir `?render=canvas2d` y comprobar que el fallback continúa operativo.
11. Confirmar que las preferencias sobreviven a crear una nueva partida.
12. Confirmar que Continuar y Nueva partida mantienen el comportamiento de P7.1.

## 12. Exclusiones

- mejora del autosave durable del personaje;
- persistencia de mazmorra;
- volumen/audio;
- idioma Español/Inglés, reservado para P7.3;
- persistencia de cada cambio temporal de zoom;
- autoentrada a fullscreen;
- cambios de balance o jugabilidad.

## 13. Riesgos conocidos

La API de fullscreen depende del navegador y puede estar deshabilitada por políticas del entorno de ejecución. La aplicación detecta soporte y no lo trata como una regla jugable.

## 14. Próximo paso

P7.2 fue validada y commiteada en `93cbd48cb29c77c9af8f3de222e13437971abb32`. Próxima etapa: **P7.3 — internacionalización y centralización de textos**, agregando Español/Inglés y el switch ES/EN sin traducir código ni IDs internos.
