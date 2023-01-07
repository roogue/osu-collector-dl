# osu-collector-dl

A script that automates the downloading of beatmap sets in Osu!Collector.

## Installation

1. Download the latest release from the releases page.
2. Extract the compressed file

## Usage

1. Run the `osu-collector-dl.exe` file from the downloaded folder.
2. A prompt window will appear. You will need to enter the ID of the collection you want to download. To find the ID, look at the end of the Osu!Collector collection URL. For example, if the URL is https://osucollector.com/collections/44, you would enter 44 as the ID.

## Configuration

You can customize various settings that affect the download speed, location of the downloaded beatmaps, and working mode of the script by editing the `config.json` file. To do this, right-click on the file and select "Open with" from the context menu. Choose a text editor (such as Notepad) to open the file and make the desired changes.

Below is the data stored in config.json, along with explanations of each setting:

```json
{
  "parallel": true,
  "concurrency": 10,
  "directory": "",
  "mode": 1
}
```

- `parallel`: Set to `true` if you want to download multiple beatmap sets at the same time, or `false` if you want to download only one beatmap set at a time.

- `concurrency`: The number of downloads to request at a time. It is recommended to set this to a low number (such as 5) to prevent abuse of the osu!mirror API and potential IP bans or rate limits.

- `directory`: The path to the folder where you want to save the downloaded beatmaps. If no value is provided, the current working directory will be used. Remember to include double quotes around the path!

- `mode`: The mode in which the program should operate. Set to `1` to only download the beatmap sets, or `2` to also generate a .osdb file during the download process. You can also specify the mode at the terminal.

## License

This project is licensed under the MIT License. See the [LICENSE](https://choosealicense.com/licenses/mit/) file for details.