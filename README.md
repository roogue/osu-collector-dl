# osu-collector-dl

A Script that automatizes the downloads of beatmap set in Osu!Collector.

## Installation

- Download from the latest release, then extract the compressed file.

## Usage

Run the `osu-collector-dl.exe` from the downloaded folder.

After a prompt window pops up, an ID is required. You have to insert the numbers that appear at the end of the Osu!Collector collection url.
For an example: Insert "44" if you want to download from this link: https://osucollector.com/collections/44

## Config

You can customize some settings which affect in download speed and location of the downloaded osu beatmap.

Below is the data stored in `config.json`, you can modify it to your flavor.

```json
{
  "parallel": true,
  "dl_impulse_rate": 10,
  "directory": "",
  "mode": 1
}
```

#### Explanation:

[ parallel: true | false ] - Whether or not downloads should be done in parallel. \
-> If parallel is true, multiple downloads will process at the same time. If false, the program will download only one beatmap set at a time.

[ dl_impulse_rate: number ] - How many downloads should be requested at a time. \
-> Warning: this setting is recommended to be set as low as around 10 to prevent unwanted abuse to osu!mirror API. You could get IP banned or rate limited if you're abusing their API (I guess :v but just don't).

[ directory: string ] - Path to your download folder. \
-> Remember the double quotes!! If none was provided, the current working directory would be used.

## License

[MIT](https://choosealicense.com/licenses/mit/)
