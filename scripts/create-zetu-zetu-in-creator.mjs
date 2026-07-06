import { spawn } from "node:child_process";

const MCP_COMMAND = process.platform === "win32" ? "cmd.exe" : "npx";
const MCP_ARGS =
  process.platform === "win32"
    ? ["/d", "/s", "/c", "npx.cmd -y @lottiefiles/creator-mcp@latest"]
    : ["-y", "@lottiefiles/creator-mcp@latest"];

let nextId = 1;
const pending = new Map();
let buffer = "";
const shouldWait = process.argv.includes("--wait");
const waitMs = Number(process.env.CREATOR_WAIT_MS || 240000);
const pollMs = Number(process.env.CREATOR_POLL_MS || 5000);

const child = spawn(MCP_COMMAND, MCP_ARGS, {
  stdio: ["pipe", "pipe", "pipe"],
  windowsHide: true,
});

child.stderr.on("data", (chunk) => {
  const text = chunk.toString();
  if (text.trim()) {
    console.error(text.trimEnd());
  }
});

child.stdout.on("data", (chunk) => {
  buffer += chunk.toString("utf8");
  let newlineIndex = buffer.indexOf("\n");
  while (newlineIndex !== -1) {
    const line = buffer.slice(0, newlineIndex).replace(/\r$/, "");
    buffer = buffer.slice(newlineIndex + 1);
    if (line.trim()) {
      handleMessage(JSON.parse(line));
    }
    newlineIndex = buffer.indexOf("\n");
  }
});

child.on("exit", (code, signal) => {
  const message = `Creator MCP exited with code ${code ?? "null"} signal ${signal ?? "null"}`;
  for (const { reject } of pending.values()) {
    reject(new Error(message));
  }
  pending.clear();
});

function send(method, params) {
  const id = nextId++;
  child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
  });
}

function notify(method, params) {
  child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method, params }) + "\n");
}

function handleMessage(message) {
  if (!("id" in message)) {
    return;
  }
  const entry = pending.get(message.id);
  if (!entry) {
    return;
  }
  pending.delete(message.id);
  if (message.error) {
    entry.reject(new Error(message.error.message || JSON.stringify(message.error)));
  } else {
    entry.resolve(message.result);
  }
}

function textFromResult(result) {
  return (result?.content || [])
    .map((item) => (item.type === "text" ? item.text : ""))
    .join("\n")
    .trim();
}

async function callTool(name, args = {}) {
  return send("tools/call", { name, arguments: args });
}

const creatorScript = String.raw`
const C = {
  black: { r: 8, g: 10, b: 12 },
  white: { r: 255, g: 255, b: 255 },
  green: { r: 75, g: 245, b: 48 },
  greenDark: { r: 35, g: 104, b: 44 },
  music: { r: 87, g: 224, b: 54 },
  skyline: { r: 184, g: 198, b: 181 },
  skylineSoft: { r: 215, g: 226, b: 213 },
  shoe: { r: 38, g: 39, b: 39 },
  shadow: { r: 163, g: 178, b: 158 },
  bg: { r: 245, g: 252, b: 243 }
};

const scene = creator.createScene({
  name: "Zetu Zetu Animated Character",
  size: { width: 720, height: 640 },
  framerate: 30,
  duration: 4
});
creator.switchToScene(scene);

function solid(color) {
  return { type: "SOLID", color };
}

function pt(x, y, ix = 0, iy = 0, ox = 0, oy = 0) {
  return { vertex: { x, y }, inTan: { x: ix, y: iy }, outTan: { x: ox, y: oy } };
}

function layer(name, position = { x: 0, y: 0 }) {
  const item = scene.createShapeLayer({ name, position, startFrame: 0, endFrame: 120 });
  return item;
}

function ellipse(name, position, size, fillColor, strokeColor, strokeWidth) {
  const item = layer(name);
  item.createEllipse({ position, size });
  item.createFill(solid(fillColor));
  if (strokeColor && strokeWidth) {
    item.createStroke({ fill: solid(strokeColor), width: strokeWidth });
  }
  return item;
}

function pathLayer(name, points, closed, strokeColor, strokeWidth, fillColor) {
  const item = layer(name);
  item.createPath({ points, closed });
  if (fillColor) {
    item.createFill(solid(fillColor));
  }
  if (strokeColor && strokeWidth) {
    item.createStroke({ fill: solid(strokeColor), width: strokeWidth });
  }
  return item;
}

function bob(item, x, y, amount = 8, start = 0) {
  item.position.addKeyframes([
    { frame: start, value: { x, y } },
    { frame: start + 30, value: { x, y: y - amount } },
    { frame: start + 60, value: { x, y } },
    { frame: start + 90, value: { x, y: y + amount * 0.25 } },
    { frame: start + 120, value: { x, y } }
  ]);
}

function sway(item, degrees = 5, offset = 0) {
  item.rotation.addKeyframes([
    { frame: 0, value: -degrees + offset },
    { frame: 30, value: degrees + offset },
    { frame: 60, value: -degrees + offset },
    { frame: 90, value: degrees + offset },
    { frame: 120, value: -degrees + offset }
  ]);
}

function pulse(item, min = 92, max = 108) {
  item.scale.addKeyframes([
    { frame: 0, value: { x: min, y: min } },
    { frame: 30, value: { x: max, y: max } },
    { frame: 60, value: { x: min, y: min } },
    { frame: 90, value: { x: max, y: max } },
    { frame: 120, value: { x: min, y: min } }
  ]);
}

// Foreground to background, per Creator's render order.
const rightNote = pathLayer(
  "music note right - bouncing",
  [
    pt(530, 315), pt(530, 252), pt(544, 252), pt(570, 271),
    pt(570, 286), pt(548, 270), pt(548, 322)
  ],
  false,
  C.music,
  10
);
rightNote.position.staticValue = { x: 0, y: 0 };
bob(rightNote, 0, 0, 18, 0);
rightNote.opacity.addKeyframes([
  { frame: 0, value: 70 },
  { frame: 30, value: 100 },
  { frame: 60, value: 70 },
  { frame: 90, value: 100 },
  { frame: 120, value: 70 }
]);

const leftNote = pathLayer(
  "music note left - floating",
  [
    pt(145, 175), pt(145, 108), pt(159, 108), pt(188, 129),
    pt(188, 147), pt(163, 128), pt(163, 184)
  ],
  false,
  { r: 165, g: 170, b: 166 },
  10
);
bob(leftNote, 0, 0, 15, 0);
leftNote.opacity.addKeyframes([
  { frame: 0, value: 80 },
  { frame: 40, value: 100 },
  { frame: 80, value: 80 },
  { frame: 120, value: 80 }
]);

const smile = pathLayer(
  "face smile",
  [
    pt(297, 185, 0, 0, 28, 36),
    pt(387, 185, -28, 36, 0, 0)
  ],
  false,
  C.black,
  7
);

ellipse("eye left", { x: 307, y: 132 }, { width: 20, height: 20 }, C.black);
ellipse("eye right", { x: 377, y: 132 }, { width: 20, height: 20 }, C.black);

const head = ellipse(
  "head - white circle",
  { x: 342, y: 138 },
  { width: 156, height: 170 },
  C.white,
  C.black,
  7
);
bob(head, 0, 0, 6);
sway(head, 2);

const leftHand = ellipse("left hand", { x: 164, y: 203 }, { width: 45, height: 45 }, C.white, C.black, 6);
const rightHand = ellipse("right hand", { x: 526, y: 203 }, { width: 45, height: 45 }, C.white, C.black, 6);
bob(leftHand, 0, 0, 13);
bob(rightHand, 0, 0, 10);

const leftArm = pathLayer(
  "left arm - waving",
  [
    pt(296, 214, 0, 0, -34, 55),
    pt(213, 228, 44, 52, -31, 3),
    pt(172, 203, 0, 0, 0, 0)
  ],
  false,
  C.black,
  7
);
sway(leftArm, 8, -2);

const rightArm = pathLayer(
  "right arm - waving",
  [
    pt(392, 218, 0, 0, 34, 55),
    pt(474, 229, -43, 52, 31, 3),
    pt(518, 203, 0, 0, 0, 0)
  ],
  false,
  C.black,
  7
);
sway(rightArm, 8, 2);

const bodyText = scene.createTextLayer({
  name: "shirt text - Zetu Zetu",
  text: "Zetu Zetu",
  position: { x: 275, y: 317 },
  fontFamily: "Arial",
  fontStyle: "Bold",
  fontSize: 34,
  fill: solid(C.greenDark),
  startFrame: 0,
  endFrame: 120
});
bodyText.rotation.staticValue = 4;
bob(bodyText, 0, 0, 6);

const body = pathLayer(
  "green bean body",
  [
    pt(320, 213, 4, -6, 40, 18),
    pt(431, 311, 3, -69, -9, 84),
    pt(349, 409, 67, 4, -75, 8),
    pt(263, 340, 2, 77, -13, -57),
    pt(292, 242, -16, 35, 13, -22)
  ],
  true,
  C.black,
  7,
  C.green
);
bob(body, 0, 0, 7);
sway(body, 2);

const leftLeg = pathLayer(
  "left leg",
  [
    pt(300, 398, 0, 0, -10, 78),
    pt(314, 548, -26, -44, 14, 20)
  ],
  false,
  C.black,
  7
);
sway(leftLeg, 3);

const rightLeg = pathLayer(
  "right leg",
  [
    pt(377, 404, 0, 0, -6, 78),
    pt(403, 548, -26, -44, 14, 20)
  ],
  false,
  C.black,
  7
);
sway(rightLeg, 3, 1);

const leftShoe = ellipse("left shoe", { x: 323, y: 557 }, { width: 60, height: 32 }, C.shoe, C.black, 5);
leftShoe.rotation.staticValue = -12;
const rightShoe = ellipse("right shoe", { x: 403, y: 557 }, { width: 60, height: 32 }, C.shoe, C.black, 5);
rightShoe.rotation.staticValue = -9;
bob(leftShoe, 0, 0, 5);
bob(rightShoe, 0, 0, 4);

const foregroundLine = pathLayer(
  "ground line",
  [pt(0, 583), pt(720, 583)],
  false,
  { r: 172, g: 187, b: 167 },
  4
);

const shadow = ellipse("soft oval shadow - pulsing", { x: 360, y: 625 }, { width: 360, height: 48 }, C.shadow);
shadow.opacity.staticValue = 55;
pulse(shadow, 92, 105);

const towerLeft = pathLayer(
  "city tower left",
  [
    pt(18, 584), pt(18, 288), pt(43, 288), pt(43, 584)
  ],
  true,
  { r: 157, g: 171, b: 153 },
  4,
  C.skyline
);

const skyline = pathLayer(
  "soft city skyline",
  [
    pt(89, 584), pt(89, 360), pt(118, 360), pt(118, 388), pt(151, 388),
    pt(151, 584), pt(218, 584), pt(218, 470), pt(276, 470), pt(276, 584),
    pt(470, 584), pt(470, 407), pt(500, 407), pt(500, 383), pt(537, 383),
    pt(537, 584), pt(592, 584), pt(592, 340), pt(655, 584)
  ],
  true,
  { r: 157, g: 171, b: 153 },
  4,
  C.skyline
);
skyline.opacity.staticValue = 82;

const skylineSoft = pathLayer(
  "distant skyline fill",
  [
    pt(0, 584), pt(0, 456), pt(69, 456), pt(69, 584),
    pt(198, 584), pt(198, 452), pt(219, 452), pt(219, 584),
    pt(360, 584), pt(360, 522), pt(466, 522), pt(466, 584),
    pt(684, 584), pt(684, 381), pt(720, 381), pt(720, 584)
  ],
  true,
  null,
  null,
  C.skylineSoft
);
skylineSoft.opacity.staticValue = 70;

const background = layer("pale green background");
background.createRectangle({
  position: { x: 360, y: 320 },
  size: { width: 720, height: 640 },
  roundness: 0
});
background.createFill(solid(C.bg));

creator.timeline.goToFrame(0);
creator.timeline.play();

console.log(JSON.stringify({
  created: true,
  scene: scene.name,
  layers: scene.layers.map((item) => item.name)
}, null, 2));
`;

async function main() {
  try {
    await send("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "kiongozi-lottie-runner", version: "1.0.0" },
    });
    notify("notifications/initialized", {});

    console.log("Reading Creator rules and API docs...");
    await callTool("get_rules");
    for (let page = 1; page <= 4; page++) {
      const result = await callTool("get_api_doc", { page });
      const text = textFromResult(result);
      console.log(`Read API doc page ${page}`);
      if (text.includes("You have read the complete API documentation")) {
        break;
      }
    }

    console.log("Sending animated Zetu Zetu character script to Creator...");
    const startedAt = Date.now();
    while (true) {
      const result = await callTool("run_script", { script: creatorScript });
      const text = textFromResult(result);
      console.log(text || "(No output returned)");

      const waitingForCreator =
        result.isError && text.includes("No Creator tab is connected");
      const stillHasTime = Date.now() - startedAt < waitMs;

      if (!shouldWait || !waitingForCreator || !stillHasTime) {
        if (result.isError) {
          process.exitCode = 2;
        }
        break;
      }

      console.log(
        `Waiting for Creator MCP connection; retrying in ${pollMs / 1000}s...`,
      );
      await new Promise((resolve) => setTimeout(resolve, pollMs));
    }
  } finally {
    child.stdin.end();
    child.kill();
  }
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  child.kill();
  process.exitCode = 1;
});
