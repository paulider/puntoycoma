# Punto y Coma Office — Development workflow

## Branches

- `gh-pages`: última versión estable publicada.
- `main`: historial actual del proyecto.
- `develop`: desarrollo de la nueva arquitectura modular.

## Regla de publicación

Ningún cambio de `develop` se publica directamente. Antes de moverlo a producción debe comprobarse:

1. Crear y editar clientes.
2. Crear y editar expedientes.
3. Añadir cualquier número de participantes a un expediente.
4. Crear documentos.
5. Crear una factura para un único participante.
6. Repartir una factura entre varios participantes.
7. Revisar la numeración fiscal.
8. Vista previa e impresión A4 en iPhone y escritorio.
9. Exportar e importar copia de seguridad.
10. Confirmar que no aparece código fuente como texto en la interfaz.

## Arquitectura objetivo

```text
index.html
assets/
  app.css
src/
  app.js
  storage.js
  models.js
  clients.js
  cases.js
  documents.js
  billing.js
  backups.js
  ui.js
```

## Modelo principal

```text
Cliente
  ↕
Participación
  ↕
Expediente
  ↕
Documento / Factura
```

Un expediente puede tener un número ilimitado de participantes. Cada factura conserva su propio reparto y vuelve a preguntar cómo facturar cada vez que se crea.
