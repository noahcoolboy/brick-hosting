This is used for bundling node-hill maps / scripts into a single file called called "bbrk."

This library should be installed **globally** (i.e. `npm i -g nh-bundle`)

Usage is very simple, first create a file called `bundle_config.json`:

```json
{
  "bundle": {
    "compression": false,
    "binary": false,
    "map": "./maps/lavagame.brk",
    "scripts": {
      "directory": "./user_scripts",
      "files": ["**/*.js"]
    }
  },
  "debundle": {
    "map": "./bundled/maps/",
    "scripts": {
      "directory": "./bundled/user_scripts/"
    }
  }
}
```

Edit the above to contain the map you want to bundle along with the user_scripts included. The debundle portion will write the debundled map to the map property provided, along with the scripts to the script directory.

The best way to use this tool is to create a 'bundled' directory and point your bundle_config to use it when debundling (shown in above configuration), then you can create a
separate start.js in your bundled directory for quickly launching debundled maps.

When finished, it should look like this:

![](https://cdn.discordapp.com/attachments/809904816867901500/884902452137164871/unknown.png)

The "map" property is optional and if not specified your scripts will be bundled without a brk, but the created bbrk will have the default name of "bundle."

Commands:

`nh-bundle --config=bundle_config.json` # If 'config' is missing, the library will default to bundle_config.json. Running nh-bundle without the 'debundle' option will bundle the map in bundle_config.json.

`nh-bundle --debundle=./mybundle.bbrk` # Will attempt to debundle the bbrk file provided. Will use default settings if used without a bundle_config.json.

`nh-bundle --compress` # Will compress the bbrk with zlib.

`nh-bundle --binary` # Will convert file data into base64, this is used for safely bundling binary files.

`nh-bundle --nomap` # Will bundle scripts without a map file.

Debundling will **automatically** debundle compressed / binary files.

Command line properties will take priority over 'options' defined in bundle_config.json.
