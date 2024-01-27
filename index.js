const axios = require("axios");
const fs = require("fs");
const chalk = require("chalk");
const input = require("input");
const ytdl = require("ytdl-core");
const progress = require("cli-progress");
const { type } = require("os");

const youtubeASCII = chalk.red(` █████ █████                     ███████████            █████             
░░███ ░░███                     ░█░░░███░░░█           ░░███              
 ░░███ ███    ██████  █████ ████░   ░███  ░  █████ ████ ░███████   ██████ 
  ░░█████    ███░░███░░███ ░███     ░███    ░░███ ░███  ░███░░███ ███░░███
   ░░███    ░███ ░███ ░███ ░███     ░███     ░███ ░███  ░███ ░███░███████ 
    ░███    ░███ ░███ ░███ ░███     ░███     ░███ ░███  ░███ ░███░███░░░  
    █████   ░░██████  ░░████████    █████    ░░████████ ████████ ░░██████ 
   ░░░░░     ░░░░░░    ░░░░░░░░    ░░░░░      ░░░░░░░░ ░░░░░░░░   ░░░░░░  `);

console.clear();
console.log(youtubeASCII);

async function start() {
  let URL = await input.text("(-) Enter the video URL: ");

  let videoInfo = await ytdl.getInfo(URL).catch(() => null);

  if (!videoInfo?.videoDetails) {
    console.log(chalk.red.bold(`Error: The link that you have entered is not valid`));
    return start();
  }

  let formats = videoInfo.formats.filter((x) => "qualityLabel" in x && "container" in x);
  let formatsNames = formats.map((x) =>
    x.qualityLabel === null
      ? `Audio ${x.container == "mp4" ? "m4a" : x.container} ${x.audioBitrate}K`
      : `Video ${x.container} ${x.qualityLabel}${x.hasAudio ? "" : " (No Audio)"}`
  );

  const uniqueSet = new Set(formatsNames);
  formatsNames = [...uniqueSet];

  const typeInput = await input.select(`(-) Select the file type that you want: `, ["Video", "Audio"]);

  const formatInput = await input.select(
    `(-) Select the format that you want: `,
    formatsNames.filter((x) => x.startsWith(typeInput))
  );

  let qualityLabel = typeInput == "Audio" ? null : formatInput.split(" ").slice(2).join(" ").replaceAll(" (No Audio)", "");
  let hasAudio = typeInput == "Audio" ? true : !formatInput.includes("No Audio");
  let audioBitrate =
    typeInput == "Audio"
      ? formatInput
          .split(" ")
          .slice(2)
          .join(" ")
          .replace(/\k|K| /g, "")
      : null;
  let container = formatInput.split(" ")[1].replace(/\m4a/g, "mp4");

  const format = formats.filter((x) => {
    return (
      x.mimeType.includes(typeInput.toLowerCase()) &&
      x.qualityLabel === qualityLabel &&
      (audioBitrate !== null ? x.audioBitrate === parseInt(audioBitrate) : true) &&
      x.hasAudio === hasAudio &&
      x.container == container
    );
  })[0];

  let regex = /[\\/:*?"<>|]/g;
  let filename = videoInfo.videoDetails.title.replace(regex, "");

  const videoStream = fs.createWriteStream(
    `downloads/${filename}${qualityLabel !== null ? ` - ${qualityLabel}` : ""}.${
      format.container == "mp4" && format.mimeType.includes("audio") ? "m4a" : format.container
    }`,
    "utf-8"
  );

  console.log();
  console.log(chalk.red.bold(`${videoInfo.videoDetails.title}`));

  let video = ytdl(URL, {
    filter: (x) =>
      x.qualityLabel == format.qualityLabel &&
      x.container == format.container &&
      x.audioBitrate == format.audioBitrate &&
      x.hasAudio == format.hasAudio,
  });

  let totalSize = 0;
  let downloadedBytes = 0;
  let startTime;
  let progressStarted = false;
  let lastUpdateTime;
  let totalMegabytes = 0;

  const progressBar = new progress.SingleBar({
    format: `Downloading |{bar}| {percentage}% | Elapsed: {elapsed} | {currentMB}/{totalMB} MB | {speed}`,
    barCompleteChar: "\u2588",
    barIncompleteChar: "\u2591",
    hideCursor: true,
  });

  video
    .on("progress", async (chunkLength, downloaded, total) => {
      totalSize = total;

      if (progressStarted == false) {
        progressBar.start(totalSize, downloadedBytes, {
          currentMB: 0,
          totalMB: (totalSize / (1024 * 2024)).toFixed(2),
          elapsed: "0s",
          speed: "N/A",
        });

        lastUpdateTime = Date.now();
        startTime = Date.now();

        return (progressStarted = true);
      }

      const currentMB = (downloaded / (1024 * 1024)).toFixed(2);
      const totalMB = (total / (1024 * 1024)).toFixed(2);
      totalMegabytes = totalMB;
      const speed = (chunkLength / (1024 ^ 2) / (Date.now() - lastUpdateTime)).toFixed(2);

      downloadedBytes += chunkLength;
      lastUpdateTime = Date.now();

      progressBar.update(downloadedBytes, {
        currentMB,
        totalMB,
        elapsed: `${((Date.now() - startTime) / 1000).toFixed(2)}s`,
        speed: `${isNaN(speed) ? "0.00" : speed} Mb/s`,
      });
    })
    .pipe(videoStream);

  video.on("end", async () => {
    progressBar.update(totalSize, {
      totalMegabytes,
      totalMegabytes,
      elapsed: `${((Date.now() - startTime) / 1000).toFixed(2)}s`,
      speed: `0.00 Mb/s`,
    });

    progressBar.stop();
    console.log(`${chalk.green.bold(`(#) The video has been successfully downloaded.`)}`);

    console.log();
    start();
  });

  video.on("error", (error) => {
    progressBar.stop();
    console.log(chalk.red.bold(`Err: ${error}`));

    console.log();
    start();
  });
}

async function startDiscordRPC() {}

start();
startDiscordRPC();
