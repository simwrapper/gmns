import fs from 'fs'
import Papa from '@simwrapper/papaparse'
import upath from 'upath'
import { wktToGeoJSON } from '@terraformer/wkt'
import { coordEach } from '@turf/meta'
import JSZIP from 'jszip'

import Coords from './coords'

interface GMNSNetwork {
  path: string
  config: any
  t: { [table: string]: any[] }
}

export const load = async (path: string): Promise<GMNSNetwork> => {
  // path can be a URI, a folder, a zipfile.

  // is it a zip file
  if (path.toLocaleLowerCase().endsWith('.zip')) {
    return await loadFromZipFile(path)
  }

  let folder = path
  // did use pass in actual csv file? back up to containing folder
  if (path.toLocaleLowerCase().endsWith('.csv')) folder = upath.dirname(path)

  return await loadFromFolder(folder)
}

const loadFromFolder = async (folder: string): Promise<GMNSNetwork> => {
  const network: GMNSNetwork = {
    path: folder,
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

const loadFromZipFile = async (path: string): Promise<GMNSNetwork> => {
  const network: GMNSNetwork = {
    path,
    config: {},
    t: {},
  }

  const buffer = fs.readFileSync(path)
  const u8 = new Uint8Array(buffer)
  const zip = await JSZIP.loadAsync(u8)
  console.error({ files: Object.keys(zip.files) })

  // get config.csv if it exists
  const config = await loadCSVFromZip(zip, 'config')
  if (config.length) network.config = config[0]
  else network.config = { crs: 4326 }

  // get standard things
  network.t.node = await loadCSVFromZip(zip, 'node')
  network.t.link = await loadCSVFromZip(zip, 'link')
  network.t.geometry = await loadCSVFromZip(zip, 'geometry')

  return network
}

const loadCSVFromZip = async (zip: JSZIP, element: string): Promise<any[]> => {
  try {
    const regex = new RegExp(`${element}\.csv$`)
    const content = await zip.file(regex)[0].async('string')
    const parsed = Papa.parse(content, {
      delimitersToGuess: [',', '\t', ';', ' '],
      comments: '#',
      skipEmptyLines: true,
      dynamicTyping: true,
      header: true,
    })
    return parsed.data
  } catch (e) {}
  return []
}

const loadCSV = async (network: GMNSNetwork, element: string): Promise<any[]> => {
  const fullPath = upath.joinSafe(network.path, `${element}.csv`)

  console.error(`-- Loading ${fullPath}`)
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

export const toGeojson = (network: GMNSNetwork) => {
  // build node coord lookup
  const nodeLookup = {} as any
  for (const node of network.t.node) {
    // this trim is required because BOM at filestart will break first column name
    nodeLookup[node.node_id] = node
  }

  // build geometry lookup
  const geomLookup = {} as any
  if (network.t.geometry.length) {
    console.error('-- Appending geometries')
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
      const wkt = geomLookup[link.geometry_id]
      if (wkt?.geometry) {
        geometry = wktToGeoJSON(wkt.geometry)
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
