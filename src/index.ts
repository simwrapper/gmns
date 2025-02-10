import Papa from '@simwrapper/papaparse'
// import path from 'path'
import upath from 'upath'
import fs from 'fs'

interface GMNSNetwork {
  path: string
  config: any
  el: { [table: string]: any[] }
}

interface Geojson {
  type: string
  features: any[]
}

const loadCSV = async (network: GMNSNetwork, element: string): Promise<any[]> => {
  const fullPath = upath.joinSafe(network.path, `${element}.csv`)
  const text = loadFileSync(fullPath)

  const parsed = Papa.parse(text, {
    delimitersToGuess: ['\t', ';', ',', ' '],
    comments: '#',
    skipEmptyLines: true,
    dynamicTyping: true,
    header: true,
  })
  return parsed.data
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
  network.el.nodes = await loadCSV(network, 'node')
  network.el.links = await loadCSV(network, 'link')

  return network
}

export const toGeojson = (network: GMNSNetwork) => {
  // build node coord lookup
  const nodeLookup = {} as any
  for (const node of network.el.nodes) nodeLookup[node.node_id] = node

  // create link geometry
  const features = [] as any[]
  for (const link of network.el.links) {
    const nFrom = nodeLookup[link.from_node_id]
    const nTo = nodeLookup[link.to_node_id]
    const feature = {
      type: 'Feature',
      id: link.link_id,
      geometry: {
        type: 'LineString',
        coordinates: [
          [nFrom.x_coord, nFrom.y_coord],
          [nTo.x_coord, nTo.y_coord],
        ],
      },
      properties: link,
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
