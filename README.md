# osu-collector-dl

Osu!Collector Downloader

## Installation

Clone this repository, then install the dependencies
```bash
git clone https://github.com/roogue/osu-collector-dl.git

npm i 
#or
yarn
```
Then, rename `config.env.example` to `config,env`, and paste your osuApi key after the `=` symbols
```
api_key = 1234567890abcdef
```

Change `id` value in `config.ts`
```js
{
...
id: 1234
...
}
```

## Usage

Run the test or main
```bash
yarn run test
#OR
yarn start
```


## License
[MIT](https://choosealicense.com/licenses/mit/)