# GMNS

GMNS is the "General Modeling Network Specification."

This is a JavaScript/TypeScript implementation of a GMNS reader. Current features:

Loading GMNS networks:

- from a .zipfile containing all GMNS tables
- from a folder containing the raw .csv tables

Converting GMNS to:

- GeoJSON format

GMNS itself is being developed here:

- <https://zephyr-data-specs.github.io/GMNS/>

and is supported by the [Zephyr Transport Foundation](https://zephyrtransport.org)


### Converting MATSim networks to GMNS

As a courtesy, this package also contains a Python script which converts a MATSIM network.xml file
into GMNS format. Run

- `python3 create-gmns-network.py` 

to convert your network to a zipped GMNS network file.

## Installation of NPM package

```bash
npm install @simwrapper/gmns
```

## Usage

```typescript
// ESM
import GMNS from '@simwrapper/gmns'

// CommonJS
const GMNS = require('@simwrapper/gmns')

const network = GMNS.load('mynetwork.gmns.zip')
const geojson = GMNS.toGeojson(network)
console.log(geojson) // Output: { "type": "FeatureCollection", "features": [...]}
```

## API Documentation

### load(path: string, Blob?: blob)

Load a GMNS file from a path or from an already-loaded Blob object.

Returns a **GMNSNetwork** object, which contains

- `path` the file path from which the network was loaded
- `config` parameters loaded from config.csv
- `t` object which contains all of the .csv **tables** that were found in the zip file or folder.

Parameters:

**path** Required. can be a valid .zip file, a valid folder path containing the various CSV files, or _sometimes_ a path directly to the GMNS `config.csv` file itself (but this only works with certain web servers)

**blob** Optional. Pass in a Blob object with the already-loaded .zip file and this will be used directly instead of loading from the net or disk.

### toGeojson(GMNS: GMNSNetwork)

Returns a GeoJSON-compatible object with the network content. Currently only the nodes and link tables are read, and optionally if a `geometry` table exists, then the link geometries will also be present.

## License

MIT
