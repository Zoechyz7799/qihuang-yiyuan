import assert from "node:assert/strict";
import test from "node:test";
import { createCameraFSM } from "../js/core/cameraFSM.js";

test("camera stays off until start is called", async () => {
  let calls = 0;
  const tracks = [
    {
      stop() {
        this.stopped = true;
      },
      stopped: false,
    },
  ];
  const fakeStream = { getTracks: () => tracks };
  const camera = createCameraFSM({
    getUserMedia: async () => {
      calls += 1;
      return fakeStream;
    },
  });

  assert.equal(camera.getState().phase, "off");
  assert.equal(calls, 0);

  const on = await camera.start();
  assert.equal(on.phase, "on");
  assert.equal(calls, 1);

  await camera.stop();
  assert.equal(camera.getState().phase, "off");
  assert.equal(tracks[0].stopped, true);
});

test("hardStop ends tracks without awaiting", async () => {
  const tracks = [{ stop() { this.stopped = true; }, stopped: false }];
  const camera = createCameraFSM({
    getUserMedia: async () => ({ getTracks: () => tracks }),
  });
  await camera.start();
  camera.hardStop();
  assert.equal(camera.getState().phase, "off");
  assert.equal(tracks[0].stopped, true);
});
