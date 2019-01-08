# KO-to-KOIO

Converts a version of an older Knowledge Object to a new KOIO-compliant Knowledge Object with top-level metadata and a new implementation.

### Usage:
In the project directory run

```npm install```

```node object-converter.js <path to old ko version> <new implementation name>```

Example:
```node object-converter.js /Kgrid/labwise/99999-fk4g168s5p/v0.0.2 v0.0.3```
creates a new version of the labwise 99999/fk4g168s5p object using the data in version 2

