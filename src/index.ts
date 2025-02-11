import fs from 'fs'
import Papa from '@simwrapper/papaparse'
import upath from 'upath'
import { wktToGeoJSON } from '@terraformer/wkt'
import { coordEach } from '@turf/meta'

import Coords from './coords'

interface GMNSNetwork {
  path: string
  config: any
  t: { [table: string]: any[] }
}

const loadCSV = async (network: GMNSNetwork, element: string): Promise<any[]> => {
  const fullPath = upath.joinSafe(network.path, `${element}.csv`)

  try {
    let text = loadFileSync(fullPath)

    // fix UTF-8 BOM
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)

    const parsed = Papa.parse(text, {
      delimitersToGuess: [',', '\t', ';', ' '],
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
    t: {},
  }

  // get config: if no config, default to long/lat
  const config = await loadCSV(network, 'config')
  if (config.length) network.config = config[0]
  else network.config = { crs: 4326 }

  // get standard things
  network.t.node = await loadCSV(network, 'node')
  network.t.link = await loadCSV(network, 'link')
  network.t.geometry = await loadCSV(network, 'geometry')

  return network
}

export const toGeojson = (network: GMNSNetwork) => {
  // build node coord lookup
  const nodeLookup = {} as any
  for (const node of network.t.node) {
    // this trim is required because BOM at filestart will break first column name
    nodeLookup[node.node_id] = node
  }
  // console.error(111, nodeLookup)

  // build geometry lookup
  const geomLookup = {} as any
  if (network.t.geometry.length) {
    console.error('doing the geoms')
    for (const geom of network.t.geometry) geomLookup[geom.geometry_id] = geom
  }

  const features = [] as any[]
  const crs = Number.isFinite(network.config.crs)
    ? `EPSG:${network.config.crs}`
    : network.config.crs

  for (const link of network.t.link) {
    try {
      const nFrom = nodeLookup[link.from_node_id]
      const nTo = nodeLookup[link.to_node_id]
      if (!nFrom || !nTo) throw Error('Missing node, from_node_id, or to_node_id')

      // create link geometry
      let geometry
      if (link.geometry_id && link.geometry_id in geomLookup) {
        geometry = wktToGeoJSON(geomLookup[link.geometry_id])
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
    } catch (e) {
      console.error(`Link ${link.link_id}: ` + e)
    }
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
