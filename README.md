# osu-collector-dl

A program that automates the download of beatmap sets in Osu!Collector.

# ❗❗ WARNING ❗❗
## The latest version of osu-collector-dl (v2.7.4) has a rate limitation issue. Please DO NOT use the download beatmap set function, as this will lead to potential IP bans as [Mentioned Here](https://github.com/roogue/osu-collector-dl/issues/18#issuecomment-2199481512).
#
#

## Installation

1. Download the latest release from the [releases](https://github.com/roogue/osu-collector-dl/releases) page.
2. Extract the compressed file

## Usage

1. Run the `osu-collector-dl.exe` file from the downloaded folder.
2. Enter the ID of the collection you want to download. To find the ID, look at the end of the Osu!Collector collection URL. For example, if the URL is https://osucollector.com/collections/44/speed-practice, you would enter 44 as the ID.
3. Select a working mode.
4. Wait until the program finishes its task.

## Configuration

You can customize various settings that affect the download speed, location of the downloaded beatmaps, and working mode of the script by editing the `config.json` file. To do this, right-click on the file and select "Open with" from the context menu. Choose a text editor (such as Notepad) to open the file and make the desired changes.

Below is the data stored in config.json, along with explanations of each setting:

```json
{
  "parallel": true,
  "concurrency": 5,
  "logSize": 15,
  "directory": "",
  "mode": 1
}
```

- `parallel`: Set to `true` if you want to download multiple beatmap sets at the same time, or `false` if you want to download only one beatmap set at a time.

- `concurrency`: The number of downloads to request at a time. It is recommended to set this to a low number (such as 5) to prevent abuse of the osu!mirror API and potential IP bans or rate limits.

- `logSize`: The number that determines the maximum number of log messages during the download process.

- `directory`: The path to the folder where you want to save the downloaded beatmaps. If no value is provided, the current working directory will be used. Remember to include double quotes around the path!

- `mode`: The mode in which the program should operate. Set to `1` to only download the beatmap sets, or `2` to also generate a .osdb file during the download process. While set to `3`, the program will only generate the .osdb file. You can also specify the mode at the terminal.

## FAQ

### It says "Retrying" during the download process, am I doing anything wrong?

> No, you are not doing anything wrong. It is normal for API requests to sometimes fail due to factors such as rate limiting and internet connection issues. The script has a built-in retrying process that will handle these issues automatically. It is expected to see the "Retrying" message during the download process.

### I want the beatmaps to be automatically added to my collections. Is that possible?

> Unfortunately, this feature will not be implemented as directly modifying your personal osu! folder is risky and could potentially result in corrupted files. It is recommended to use [Collection Manager](https://github.com/Piotrekol/CollectionManager) (CM) by Piotrekol to modify your collection for more stable functionality.

### Why won't my program even start? The program shuts off right after I opened it.

> There could be several reasons why your program is not starting. One potential cause is that you have incorrectly edited the config.json file, such as forgetting to include double quotes around the directory path. If you are not sure what the problem is, try reinstalling the program to see if that resolves the issue.

### The program freezes in the middle of the process without displaying any error messages. What can I do?

> One possible solution is to try pressing Enter on your keyboard to see if that prompts the program to continue. This can sometimes happen if you accidentally clicked on the terminal window, which can cause the program to pause.

### I accidentally downloaded the wrong collection. How can I stop the downloads?

> To stop the downloads, you can simply close the terminal window. This will terminate the program. Alternatively, you can try pressing CTRL+C on your keyboard, which will send a signal to the program to stop running.

### I have tried following the FAQ above, but it didn't solve my problem. The problem I am experiencing is not listed in the FAQ.

> If you are experiencing a problem that is not covered in the FAQ and you need assistance, it is welcome to open an issue on the [Issue Page](https://github.com/roogue/osu-collector-dl/issues). After navigating to the issue page, click the green "New issue" button on the page and follow the instructions to describe your problem in as much detail as possible. This will allow the maintainers of the project to better understand and help troubleshoot the issue you are experiencing.

## License

This project is licensed under the MIT License. See the [LICENSE](https://choosealicense.com/licenses/mit/) file for details.
