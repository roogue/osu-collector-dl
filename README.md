# osu-collector-dl

A Script that automatize the downloads of beatmap in Osu!Collector.

## Requirements

- [Osu Api Key](https://old.ppy.sh/p/api) (Optional)

## Installation

- Download from the latest release, then extract the compressed file.

## Usage

Run the `OCDL.exe` from the downloaded folder.

After prompt window pops up, an Id is required. You just have to insert the numbers at the end of the Osu!Collector collection links.
For an example: Insert "44" if you want to download from this link: https://osucollector.com/collections/44

## Tweaks

You can also modify the config to have a different speed in fetching or downloading at `config.ini`

### Config Explaination

**[OsuApi]**\
(ONLY USEFUL IF BROWSER IS USED)

`key` - An osu api key.\
-> Use an official osu api to resolve beatmaps' Id.

**[GeneralSettings]**\
`parallel` - Whether or not fetches and downloads should be done in **parallel**. \
-> This is useful as it will speed up the process of downloading/fetching significantly.

**[ScrollSettings]**\
(ONLY USEFUL IF BROWSER IS USED)

`optimizedScroll` - Whether or not to use optimized scroll.\
-> This increase the stability and speed of scraping of websites.

`scroll_distance` - The distance to scroll.\
-> This is only useful when optimizedScroll is set to false.\
-> You can lower the value when your internet speed is slow.

`scroll_interval` - The interval of scrolling in ms.\
-> This is only useful when optimizedScroll is set to false.\
-> You can increase the value when your internet speed is slow.

**[RateLimitSettings]**\
(ONLY USEFUL IF BROWSER IS USED)

`rate_limit` - A rate throttle for amount of requests.\
-> This is to reduce errors cause by hitting the rate limit when sending requests.\
-> This is only useful when parallel is set to true.

`impulse_rate` - The amount of requests to be made per burst.\
-> This is only useful when hitting rate limit\
-> You can lower the value when error occurs.

`impulse_interval` - The interval of requests in seconds.\
-> This is only useful when hitting rate limit\
-> You can increase the value when error occurs.

**[DownloadSettings]**\
`directory` - The full directory to your download folder.\
-> May result in error when folder does not exist.\
-> If provided none, the script will download to current the working directory.

`dl_impulse_rate` - The amount of download requests to be made per burst.\
-> This is only useful when hitting rate limit\
-> You can lower the value when error occurs.

**[BrowserSettings]**\
`browser` - Whether or not use a browser\
-> Using a browser will decrease the speed of process and increase program weight.\
-> Useful when osu!Collector api is closed to public.

`headless` - Whether headless mode should be used.\
-> When set to false, browser will be invisible when processes is running.\
-> Set to false may slightly increase the speed of the process.

### Default Config

```ini
[OsuApi]

key =

[GeneralSettings]

parallel = true

[ScrollSettings]

optimizedScroll = true
scroll_distance = 1000
scroll_interval = 500

[RateLimitSettings]

rate_limit = 30
impulse_rate = 5
impulse_interval = 2

[DownloadSettings]

directory = ""
dl_impulse_rate = 5

[BrowserSettings]

browser = false
headless = true
```

## License

[MIT](https://choosealicense.com/licenses/mit/)
