import Papa from '@simwrapper/papaparse'
import upath from 'upath'
import fs from 'fs'
import { wktToGeoJSON } from '@terraformer/wkt'
import { coordEach } from '@turf/meta'

import Coords from './coords'

interface GMNSNetwork {
  path: string
  config: any
  el: { [table: string]: any[] }
}

// interface Geojson {
//   type: string
//   features: any[]
// }

const loadCSV = async (network: GMNSNetwork, element: string): Promise<any[]> => {
  const fullPath = upath.joinSafe(network.path, `${element}.csv`)

  try {
    const text = loadFileSync(fullPath)
    const parsed = Papa.parse(text, {
      delimitersToGuess: ['\t', ';', ',', ' '],
      comments: '#',
      skipEmptyLines: true,
      dynamicTyping: true,
      header: true,
    })
    return parsed.data
  } catch {}
  return []
}

function loadFileSync(filePath: string) {
  try {
    const fullPath = upath.resolve(filePath)
    return fs.readFileSync(fullPath, 'utf8')
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      throw new Error(`File not found: ${filePath}`)
    }
    throw new Error(`Error reading file: ${error.message}`)
  }
}

export const load = async (path: string): Promise<GMNSNetwork> => {
  // path can be a URI, a folder, a zipfile.

  // for now: it's a folder
  const network: GMNSNetwork = {
    path,
    config: {},
    el: {},
  }

  // get standard things
  network.config = (await loadCSV(network, 'config'))[0]
  network.el.node = await loadCSV(network, 'node')
  network.el.link = await loadCSV(network, 'link')
  network.el.geometry = await loadCSV(network, 'geometry')

  return network
}

const generateGeometry = (geom: any) => {
  return wktToGeoJSON(geom.geometry)
}

export const toGeojson = (network: GMNSNetwork) => {
  // build node coord lookup
  const nodeLookup = {} as any
  for (const node of network.el.node) nodeLookup[node.node_id] = node
  // build geometry lookup
  const geomLookup = {} as any
  if (network.el.geometry) {
    for (const geom of network.el.geometry) geomLookup[geom.geometry_id] = geom
  }
  const features = [] as any[]
  const crs = Number.isFinite(network.config.crs)
    ? `EPSG:${network.config.crs}`
    : network.config.crs

  for (const link of network.el.link) {
    const nFrom = nodeLookup[link.from_node_id]
    const nTo = nodeLookup[link.to_node_id]

    // create link geometry
    let geometry
    if (link.geometry_id in geomLookup) {
      geometry = generateGeometry(geomLookup[link.geometry_id])
    } else {
      geometry = {
        type: 'LineString',
        coordinates: [
          [nFrom.x_coord, nFrom.y_coord],
          [nTo.x_coord, nTo.y_coord],
        ],
      }
    }

    const feature = {
      type: 'Feature',
      id: link.link_id,
      geometry,
      properties: link,
    } as any

    delete feature.properties.geometry

    // convert coord to EPSG:4326 long/lat if necessary
    if (crs !== 'EPSG:4326') {
      coordEach(feature, currentCoord => {
        let newCoord = Coords.toLngLat(crs, currentCoord)
        // console.error(newCoord)
        currentCoord[0] = newCoord[0]
        currentCoord[1] = newCoord[1]
      })
    }

    features.push(feature)
  }

  return {
    type: 'FeatureCollection',
    features,
  }
}

export const greet = (name: string): string => {
  return `Hello, ${name}!`
}

export default { toGeojson }
