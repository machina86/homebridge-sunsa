
<p align="center">

<img src="https://github.com/homebridge/branding/raw/master/logos/homebridge-wordmark-logo-vertical.png" width="150">

</p>


# Homebridge Sunsa

[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins)

`homebridge-sunsa` is a [Homebridge](https://homebridge.io) plugin that makes Sunsa Wands available to [Apple's](https://www.apple.com) [HomeKit](https://www.apple.com/ios/home) smart home platform.

This plugin will allow you to open/close your blinds and view the battery status in homekit.

## Configuration

You will need two pieces of information for the config settings of this plugin. The apiKey and idUser.

You will need to enable the API key in your Sunsa app by going to Settings->API Settings and setting the Active toggle to on.

You will need to use your User ID from Settings->API Settings as the idUser to use in this plugin.

You can use the settings button in the plugins tab of homebridge to enter this information or use the following for a manual entry in the config.json.

```
"platforms": [
    {
        "apiKey": "Your API Key",
        "idUser": 0,
        "platform": "Sunsa"
    }
]
```

## Using the plugin

Currently this plugin only allows you to close your blinds in one direction. This direction can be set under "Default Smart Home Direction" in your Sunsa app under each device that you have.