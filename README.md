# osu-collector-dl

Osu!Collector Downloader

## Requirements

- [Nodejs v16](https://nodejs.org/en/)
- [Osu Api Key](https://old.ppy.sh/p/api) (Optional)

## Installation

Download or clone this repository

```bash
git clone https://github.com/roogue/osu-collector-dl.git

## Or download as zip and extract
```

[ Optional ]
Then, rename `config.env.example` to `config,env`, and paste your osuApi key after the `=` symbols.
_Warning: Using Osu Mirror in resolving beatmaps are highly unstable, an osu api Key is recommended_

```
api_key = 1234567890abcdef
```

## Usage

Click the runner:

- [ run.bat ] for window
- [ run.sh ] for linux

After dependencies are installed, an Id is required. You just have to insert the numbers at the end of the Osu!Collector collection links.
For an example: Insert "44" if you want to download from this link: https://osucollector.com/collections/44

## Tweaks

You can also modify the config to have a different speed in fetching or downloading at `./dist/config.js`.
Further info are commented in the file.

## License

[MIT](https://choosealicense.com/licenses/mit/)
