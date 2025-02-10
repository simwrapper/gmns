#!/usr/bin/env node

import { program } from 'commander'
// import pkg from './package.json'

import { load, toGeojson } from './dist/index.js'

program.name('gmns').description('GMNS network helper')

program
  .command('toGeojson')
  .description('Read GMNS network and output as Geojson format')
  .argument('<folder>', 'path to folder containing config.csv')
  // .option('-u, --uppercase', 'convert to uppercase')
  .action(async (folder, options) => {
    let message = `Reading GMNS from ${folder}`
    // if (options.uppercase) message = message.toUpperCase()
    console.error(message)

    const network = await load(folder)
    const geojson = toGeojson(network)
    const txt = JSON.stringify(geojson, null, 2)
    console.log(txt)
  })

program.parse(process.argv)
